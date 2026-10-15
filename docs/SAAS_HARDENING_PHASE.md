# مرحلة التحصين SaaS — الفصل الصارم والربط الحقيقي (15 أكتوبر 2026)

> **الهدف:** الارتقاء من "تطبيق يعمل" إلى "منظومة SaaS بهندسة مدروسة" — ربط قاعدي قاطع، أمن RLS بلا تعليق، فصل أصحاب المصلحة، ودورة حياة شاشات موحدة.

---

## 1. إصلاح التعليق اللانهائي في RLS (Infinite Recursion — 42P17) ✅

**التشخيص المؤكد:** سياسة `member_org_read_policy` في ترحيل `006` كانت تستعلم `member` من داخل سياسة **على** `member` نفسه (`EXISTS (SELECT 1 FROM "member" m2 ...)`) — PostgreSQL يُجهض كل تقييم بخطأ `42P17 infinite recursion detected in policy for relation member`، وكذلك سياسة `organization` كانت تعيد دخول سياسات `member`.

**الحل** (`supabase/migrations/20261015_rls_security_definer_stakeholders.sql`):

طبقة دوال `SECURITY DEFINER` (مملوكة لمالك الجداول ⇒ تتجاوز RLS، مع `STABLE` + `SET search_path = public`):

| الدالة | الغرض |
|---|---|
| `cf_current_user_id()` | هوية المتصل من JWT |
| `cf_user_org_ids()` | معرفات عضويات المستخدم (تُنهي التعليق) |
| `cf_is_org_member / cf_is_org_admin` | فحص عضوية/إدارة منظمة |
| `cf_is_platform_admin()` | `user.role = 'super_admin'` |
| `cf_user_clinic_role(clinic_id)` | الدور الفعّال: عضوية better-auth ↔ عيادة، أو `staff_members` بالبريد |
| `cf_is_clinic_leader / prescriber / financial / operational` | أطيور الصلاحيات الأربعة |

ثم **إعادة بناء سياسات organization/member/invitation بلا أي استدعاء ذاتي**، وبوابات كتابة على العضويات لأصحابها فقط.

## 2. مصفوفة فصل أصحاب المصلحة (8 جداول) ✅

| الجدول | قراءة | كتابة | حذف |
|---|---|---|---|
| prescriptions | أي طاقم العيادة | **الواصفون فقط** (owner/admin/doctor/associate_doctor) | القيادة |
| patients | أي طاقم | التشغيل (طاقم عدا المحاسب) | القيادة |
| appointments | أي طاقم | التشغيل + (الحجز العام المجهول كما هو) | القيادة |
| invoices / payments / journal_entries / journal_lines | أي طاقم | **الماليون فقط** (leader + accountant) | القيادة |
| inventory_items | أي طاقم | التشغيل | القيادة |

- السياسات **إضافية** (`IF NOT EXISTS`) — لا تكسر الحجز العام ولا السياسات السابقة.
- نفس الفصل مُطابَق في طبقة الواجهة (`utils/permissions.js`) ومُختبر بمصفوفة توافق.

## 3. الربط السحابي الحقيقي — مصفوفة التغطية الصادقة

| الخدمة | جدول Supabase | الحالة |
|---|---|---|
| appointmentsService | appointments | ✅ (5 استدعاءات + RPC الحجز الذري `book_appointment_atomic` بقفل advisory وفهرس فريد) |
| patientsService | patients | ✅ |
| invoicesService | invoices | ✅ |
| inventoryService | inventory_items | ✅ |
| generalLedgerService | journal_entries + journal_lines | ✅ |
| **prescriptionService** | **prescriptions** | ✅ **أُضيف في هذه المرحلة** (fetch/sync/upsert/hybrid بمطابقة `clinic_id` صارمة + fallback محلي) |
| clinicalNotesService | — | ⚠️ محلي فقط — **متتبٍّ في المرحلة القادمة** |
| treatmentPlansService | — | ⚠️ محلي فقط |
| attendanceService | — | ⚠️ محلي فقط |

## 4. دورة الحياة الموحدة (Loading / Loaded / Empty+CTA / Error+Retry) ✅

- مكوّن قانوني جديد: **`src/components/ui/ScreenState`** بترتيب أولويات حتمي (Loading ← Error ← Empty ← المحتوى) مع `data-testid` و`role=status/alert` وCTA أساسي وثانوي.
- **التنفيذ المرجعي:** `InventoryTable` أعيدت هيكلته عليه (كان يكرر النمط يدوياً) — مع الحفاظ على سكيليتون الجدول.
- 20 اختبار جديد يثبّت النمط والترتيب والدلالات.

## 5. ملاحظة صدق حول التزامن (1,000/1,000)

- ✅ الاختبارات `concurrency1000RequestsBurst` و`scale1000DoctorsAuth` **ناجحة فعلاً** (توازن مدين/دائن مثالي عبر 1,000 معاملة + تسجيل 1,000 طبيب) — لكنها **محاكاة داخل الذاكرة**، وليست حمل شبكي على قاعدة حية.
- 🛡️ الضمان القاعدي الحقيقي للتوازن هو `book_appointment_atomic` (قفل `pg_advisory_xact_lock` + فهرس فريد جزئي) — أي سباق حتى مع عملاء متعددين ينتهي بواحد ناجح وواحد مرفوض.
- 📋 لإثبات <2 ثانية على الإنتاج الحقيقي: تشغيل `npm run load:k6` / `load:autocannon` ضد مشروع Supabase حي (غير ممكن من بيئة التطوير المعزولة هذه).

---

## التحقق الكامل لهذه المرحلة

```
✅ 852/852 اختبار Vitest (832 سابقة + 20 جديدة)
✅ بناء الإنتاج Vite
✅ Oxlint: 0 أخطاء
✅ صفر تبعيات دائرية
✅ فاحصا tenant-scoping وN+1 ناجحان (يشملان الكود السحابي الجديد)
```

## الخطوات التالية المقترحة
1. تطبيق الترحيل `20261015` على مشروع Supabase الإنتاجي ثم تشغيل استعلام التحقق في نهايته.
2. ربط `clinicalNotes` / `treatmentPlans` / `attendance` سحابياً بنفس نمط `prescriptionService`.
3. تعميم `ScreenState` على بقية الشاشات (Patients, Invoices, Appointments, Labs) — المكوّن جاهز والنمط موثق بـ InventoryTable.
4. حمل تحميل حي (k6) على `book_appointment_atomic` لتوثيق هدف <2s رسمياً.
