# خطة المرحلة 3 — تعميم الربط السحابي ودورة الحياة الرباعية (SaaS Binding Rollout)

> **الأساس:** الترتيب الموحد `022543d` (71cbb1a + تحصينات Antigravity) — يجب مزامنة نسخة العمل معه قبل تنفيذ هذه الخطة.
> **حالة هذا المستودع المحلي:** النص عند `71cbb1a` نظيف 100% (852/852). مزامنة الترتيب الموحد شرط مسبق.

---

## الهدفان

1. **إغلاق فجوة Local Storage نهائياً:** ربط `clinicalNotes` و`treatmentPlans` و`attendance` بـ Supabase PostgreSQL بنفس نمط `prescriptionService` (المُعتمد).
2. **تعميم دورة الحياة الرباعية:** ترحيل `InvoicesTable`، `PatientCard`/شبكة المرضى، `BookingCalendar`، `ClinicsTable` إلى `ScreenState`.

---

## A. الربط السحابي (3 خدمات)

نمط التنفيذ الموحد (مستنسخ من `prescriptionService.js`):

```
fromDb<Service>(row) / toDb<Service>(data)   ← مطابقة فقدان-صفر بين شكلي app/DB
fetch<Service>FromCloud(clinicId)            ← .from(table).select().eq('clinic_id', clinicId)
sync<Service>FromCloud(clinicId)             ← دمج بالسجل المحلي (union by id)
save<Service>ToCloud(payload)                ← upsert مع onConflict: 'id'
save<Service>Hybrid(payload)                 ← محلي فوري + سحابي best-effort، لا يرفض أبداً
```

| الخدمة | جدول Postgres المقترح | حالة الجدول | أطيور RLS المطلوبة |
|---|---|---|---|
| `clinicalNotesService` (92 سطر) | `clinical_notes` | ⚠️ تحتاج إنشاء في ترحيل جديد | قراءة=الطاقم، كتابة=**الواصفون فقط**، حذف=القيادة |
| `treatmentPlansService` (187 سطر) | `treatment_plans` | ⚠️ تحتاج إنشاء | نفس أعلاه |
| `attendanceService` (117 سطر) | `attendance_log` | ⚠️ تحتاج إنشاء | قراءة/كتابة=**التشغيل**، حذف=القيادة |

**ترحيل مطلوب:** `20261016_clinical_notes_plans_attendance.sql` — إنشاء الجداول الثلاثة بـ `clinic_id` إلزامي + فهارس ESR `(clinic_id, ...)` + تمكين RLS + تطبيق السياسات الإضافية بنفس دوال `cf_*` الموجودة + أعمدة `deleted_at` للتوافق مع النمط الحالي.

**معايير قبول كل خدمة:** اختبارات round-trip (مثل اختبارات الروشتات) + اختبار رفض الربط بلا `clinicId` + اختبار hybrid-no-reject + تحقق `check-tenant-scoping` أخضر.

## B. تعميم ScreenState (4 مكونات)

| المكوّن | الحالة الحالية | خطة الترحيل |
|---|---|---|
| `InvoicesTable` | يعالج الحالات يدوياً (6 مواضع) | استبدال الكتل الأربع بـ `ScreenState` + سكيليتون صفوف الجدول |
| `PatientCard` / شبكة المرضى | لا توجد معالجة ظاهرة (0 مواضع) | إضافة `ScreenState` على مستوى الشبكة (ليس البطاقة) مع CTA "إضافة أول مريض" |
| `BookingCalendar` | 0 | حالة Loading لشبكة المواعيد + Empty بـ CTA "اختبار يوم آخر" + Error+Retry |
| `ClinicsTable` (سوبر أدمن) | 0 | Empty بـ CTA "إضافة أول عيادة" (للقيادة فقط) + Error+Retry |

**قواعد ملزمة:** `data-testid` الأربعة، `role=status/alert`، أولوية الحالات حتمية (Loading ← Error ← Empty ← Loaded)، سكيليتون يحافظ على تخطيط الجدول، وكل CTA مربوط بفعل حقيقي موجود.

## C. الاختبار الحي (بعد تطبيق الترحيلات على الإنتاج)

- `k6` على `book_appointment_atomic` بمحاكاة تعارض فتحتين لنفس الفتحة — الهدف: نجاح واحد/رفض واحد و<u>لا مزدوج</u> تحت 200+ طلب متزامن، p95 < 2s.
- فحص `pg_policies` بعد التطبيق (الاستعلام الجاهز نهاية ترحيل 20261015).

## D. بوابة القبول النهائية للمرحلة

```
✅ Vitest: 852 + (~24 اختبار جديد متوقع) = 876+ كلها خضراء
✅ بناء الإنتاج Vite + Oxlint صفر أخطاء + صفر تبعيات دائرية
✅ tenant-scoping & N+1 audits خضراء (تشمل الجداول الجديدة)
✅ UI Audit 26/26 (نفس المخزون + الشاشات الأربع المرحّلة)
✅ صفر خدمات بلا ربط سحابي (إلا التثبيتات المقصودة بمسارات الاختبارات)
```

## إجراء إعادة المزامنة (شرط مسبق)

بما أن `022543d` موحد عند الطرف الآخر وليس في هذه البيضة:
- **الخيار 1 (موصى به):** bundle عكسي من عند Antigravity بنفس إجراء `71cbb1a` (bundle + base64 + SHA-256) يشمل `refs/heads/main` عند `022543d`.
- **الخيار 2:** جلسة برمجة جديدة تُستنسخ `main` مباشرة بعد دفعه.
