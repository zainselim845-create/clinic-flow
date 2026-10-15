# تقرير المراجعة وإعادة الهيكلة (Refactoring Review)

> **التاريخ:** 15 أكتوبر 2026 · **النطاق:** مستودع ClinicFlow كاملاً · **قاعدة التحقق:** 832 اختبار Vitest + بناء Vite + Oxlint + فاحص التبعيات الدائرية

---

## أولاً: نتائج المراجعة (ما كان قائماً قبل التدخل)

| # | الملاحظة | الخطورة | التفصيل |
|---|----------|---------|---------|
| 1 | **بنية معمارية شكلية (Facade)** | 🔴 عالية | مجلدا `src/features/` و`src/domains/` كانا مجرد ملفات إعادة تصدير (Barrels) — **صفر** سطر في كود الإنتاج يستوردهما. الكود الحقيقي مسطّح في `src/services/` (51 ملف) مع أكثر من 166 استيراداً نسبياً عميقاً من نمط `../../services/x` |
| 2 | **تكرار قاطعة الدائرة (Circuit Breaker)** | 🟠 متوسطة | ملفان بنفس الاسم `circuitBreaker.js` في `src/lib/` و`src/utils/` بسلوكين مختلفين دون توثيق — خلط مؤكد لأي مطور جديد |
| 3 | **ملف عملاق (God File)** | 🟠 متوسطة | `authService.js` بطول **1,509 سطر** يخلط 5 مسؤوليات: سجل العيادات، المزامنة السحابية، إدارة حسابات المستخدمين، سياسة أسماء المستخدمين، وسير عمل التسجيل والمصادقة |
| 4 | **فوضى جذر المستودع** | 🟡 منخفضة | سكربتات تصحيح لمرة واحدة (`bug_hunt.mjs`, `bug_hunt_2.mjs`, `capture_audit.mjs`) وتقرير lint مرفوع بحجم 195KB (`oxlint_report.txt`) و13 مستنداً markdown/docx/pdf مبعثرة في الجذر |
| 5 | **فاحصات تدقيق عمياء** | 🟠 متوسطة | سكربتا `check-tenant-scoping` و`check-n-plus-one` يفحصان `src/services/` فقط — أي إعادة هيكلة مستقبلية كانت ستُنتج تقارير "نجاح" فارغة زائفة |
| 6 | ملاحظات أخرى | 🟡 | سكربت `load:k6` بمسار Windows ثابت (`.\\tools\\k6\\...`)، ملف `.env.production` مرفوع بالمستودع (مفاتيح publishable فقط — ليست أسراراً — لكن العرف السليم حذفه)، 165 تحذير Oxlint (0 أخطاء) |

**نقاط القوة التي رصدتها المراجعة:** صفر تبعيات دائرية، شبكة اختبارات سلوكية قوية (832 اختبار)، فصل جيد بين السياق (Multi-tenancy) عبر `clinic_id`، وتوثيق غزير.

---

## ثانياً: ما تم تنفيذه (5 مراحل، كل مرحلة commit مستقل)

### المرحلة 1 — تنظيف الجذر (`chore: clean repo root`)
- حذف ملفات التصحيح لمرة واحدة وتقرير lint المرفوع.
- نقل كل المستندات (13 ملف md/docx/pdf) إلى `docs/` — لم يعد الجذر يحوي سوى `README.md` وملفات الإعداد.

### المرحلة 2 — تحويل البنية الشكلية إلى حقيقية (`refactor: physically relocate services`)
هذه هي إعادة الهيكلة الجوهرية: **49 وحدة خدمة** انتقلت فعلياً إلى شرائح الميزات الخاصة بها:

```
src/features/
├── appointments/services/   → appointmentsService, blockedSlotsService, visitTypesService
├── auth/services/           → authService (+ authRegistry, authUsernames, authProvisioning, auth/)
├── billing/services/        → invoicesService, expensesService, stripeBillingService, generalLedgerService, walletService, packagesService
├── clinical/services/       → clinicalNotesService, prescriptionService, labsService, aiAssistantService, doctorsService
├── inventory/services/      → inventoryService
├── marketing/services/      → smsService, leadRecoveryService, noShowRecoveryService*, reactivationService, referralService, segmentationService, crossSellingService, occasionCampaignService
├── patients/services/       → patientsService, excelImportService, recallsService, treatmentPlansService
└── platform/services/       → البنية التحتية المشتركة (apiCache, asyncQueue, idempotency, realtimeSync, auditLogger, usageMetering, clinics, staff, notifications, ...17 وحدة)
```

- **توافق كامل:** المسارات القديمة `src/services/<name>` بقيت كـ**شيم (Shim)** من سطر واحد مع وسم `@deprecated` — واجهة الـ API العامة لم تتغير.
- ملفان بقيا في مكانهما عمداً (`distributedRateLimiter`, `twoFactorAuthService`) لأن اختبارات تثبّت محتواهما عبر `fs.readFileSync` بمسارهما الحالي.
- ~90 موقع استيراد في كود الإنتاج تحوّل إلى المسارات القانونية الجديدة.
- اختبار واحد (`realtimeInterconnectionStack`) حُدّث ليستدعي نفس هوية الوحدة التي يختبئ عليها عبر `vi.spyOn`.

### المرحلة 3 — تفكيك الملف العملاق (`refactor(auth): split authService`)

| قبل | بعد |
|-----|-----|
| `authService.js` — 1,509 سطراً مختلطاً | `authRegistry.js` (871) — السجل المحلي tenants/users + المزامنة السحابية (مسؤولية واحدة متماسكة تتقاسم حالة cache) |
| | `authUsernames.js` (120) — سياسة الأسماء المحجوزة |
| | `authProvisioning.js` (540) — تسجيل الطبيب/العيادة، توفير حسابات الموظفين، المصادقة O(1)، الإعداد الأولي |
| | `authService.js` (16) — واجهة (Facade) تحفظ واجهة الـ API بالكامل — **صفر تغيير في أي موقع استيراد** |

### المرحلة 4 — توحيد قاطعات الدائرة (`refactor(resilience)`)
- `src/lib/circuitBreaker.js` أصبح الوحدة القانونية الوحيدة باسمين واضحين:
  - `CloudCircuitBreaker` — حارس انقطاع قاعدة البيانات (يشعر بحالة الشبكة، يتعامل مع PGRST205).
  - `ServiceCircuitBreaker` — ح-guard لكل خدمة خارجية على حدة (SMS/AI/Webhooks) بمهلات زمنية.
- `src/utils/circuitBreaker.js` أصبح شيم `@deprecated`، و8 مواقع استيراد حُدّثت للوحدة الموحدة.

### المرحلة 5 — تثبيت الاستيرادات على الـ Alias (`refactor: anchor imports`)
- **526 محدد استيراد** في 158 ملفاً إنتاجياً تحول من `../../` الهش إلى `@/...` الجذري (المهيأ مسبقاً في Vite وVitest وtsconfig).
- النتيجة: أي نقل ملف مستقبلاً = تعديل شيم من سطر واحد بدلاً من مطاردة عشرات المسارات النسبية.

### المرحلة 6 — إصلاح الفاحصات (`chore(audit)`)
- `check-tenant-scoping.cjs` و`check-n-plus-one.cjs` يفحصان الآن `src/services` **و**`src/features` شجرياً (**136 ملفاً** بدلاً من 51) — النتيجة: 0 استعلامات غير محصورة، 0 حلقات N+1.

---

## ثالثاً: حالة ما بعد إعادة الهيكلة

```
src/
├── features/<slice>/          ← الملكية الفعلية للكود (خدمات + مكونات لكل شريحة)
│   └── services/index.js      ← الواجهة العامة لكل شريحة
├── services/<name>.js         ← طبقة توافق (شيمات @deprecated) + وحدتان مثبتتان بالاختبارات
├── domains/                   ← سجل السياقات المحدودة (Bounded Contexts)
├── components/                ← مكونات الواجهة المشتركة
├── context/                   ← AuthContext / TenantContext / AppContext (مع slices)
├── lib/                       ← البنية التحتية المشتركة (supabase, circuitBreaker, syncOutbox, ...)
└── utils/                     ← أدوات خالصة
```

**الأدلة الأخيرة (بعد كل المراحل):**
- ✅ 832/832 اختبار Vitest ناجح
- ✅ بناء الإنتاج Vite يعمل
- ✅ Oxlint: 0 أخطاء
- ✅ صفر تبعيات دائرية
- ✅ فاحصات التدقيق الثلاثة ناجحة

---

## رابعاً: خطوات موصى بها لاحقاً (لم تُنفذ عمداً — خارج نطاق آمن بهذه الجلسة)

1. **نقل المكونات المميزة** إلى شرائحها (`InvoiceModal` → billing، `PatientCard` → patients...) بنفس نمط الشيم — تأخّرته لأن ~15 ملفاً مُثبَّتاً بمساراته في الاختبارات عبر `fs.readFileSync` (Header, Sidebar, Modal.css, الصفحات، السياقات) وتحريكها يتطلب تحديث ثوابت المسارات في الاختبارات أولاً.
2. **تفكيك `AuthContext.jsx` (919 سطراً) و`TenantContext.jsx` (855 سطراً)** إلى hooks منفصلة — قدّم نموذج `AppContext` (مُقسّم فعلاً في `context/slices`).
3. **هجرة اختبارات `__tests__`** إلى المسارات القانونية ثم حذف شيمات `src/services/` نهائياً (حذف شيم واحد = سطر واحد).
4. **معالجة تحذيرات Oxlint الـ165** (أغلبها unused imports/vars) وتفعيل `-D warning` في CI تدريجياً.
5. حذف `.env.production` من المستودع والاعتماد على متغيرات Vercel، وتعميم سكربت `load:k6` على غير Windows.

---

## كيفية التحقق محلياً

```bash
npm test                                # 832 اختبار
npm run build                           # بناء الإنتاج
npm run lint                            # Oxlint
npm run audit:full                      # التبعيات الدائرية + حصرية الـ tenant + N+1
```

---

## ملحق: تشخيص وإصلاح فحص E2E الفاشل (15 أكتوبر 2026)

فحص "100% UI Review Loop & E2E Verification" كان فاشلاً على `main` منذ 12 أكتوبر (قبل إعادة الهيكلة) ويمنع نشر الإنتاج الآلي. تم إعادة إنتاج الفحص محلياً بمتصفح Chromium حقيقي ضد البناء الإنتاجي وتشخيص **5 أسباب متجذرة**:

| # | السبب الجذري | النوع | الإصلاح |
|---|--------------|-------|---------|
| 1 | `ClinicsTable.jsx` يستدعي `getClinicUsage` **بدون import** — كانت تعمل مصادفةً لأن تضمين الوحدة في نفس الـ chunk وضع الدالة بنفس الاسم في نفس النطاق | 🐞 عطل كامن في المصدر | إضافة الاستيراد الناقص |
| 2 | مُحددات الفاحص قديمة عن الواجهة الحالية: "تسليم وردية الاستقبال"→"تسليم الوردية"، "إعادة التنشيط"→"إعادة التواصل"، "مركز الأعطال وبلاغات النظام"→"الأعطال"، `.filters-bar`→`.invoices-filter-panel` | 🧹 انجراف الفاحص | تحديث المحددات للنصوص الحالية (نفس نية الفحص) |
| 3 | بذرة الفاحص تضع العيادة في `clinicflow_active_tenant` فقط، بينما فضّ الوحدات (مثل `enableInventory`) يقرأ العيادة **من السجل** `clinicflow_registered_tenants` | 🧹 بذرة ناقصة | تسجيل عيادة الفحص في السجل |
| 4 | تبويبات CRM لا تظهر إلا في وضع `viewMode === 'crm'` داخل صفحة المساعد | 🧹 تغيّر سلوك الصفحة | يغطيها التحديث #2 (المحدد من "إعادة التواصل" يظهر افتراضياً) |
| 5 | إضافة تحصين `strictExecutionOrder: true` في إعدادات Vite كإجراء وقائي ضد عائلة أخطاء ربط chunks الموثقة في Rolldown (#8812، #11003) | 🛡️ وقائي | تفعيله في `vite.config.js` |

**النتيجة:** نفس الفحص يحقق **26/26 (100%) بصفر مخالفات** محلياً ضد البناء الإنتاجي، مع بقاء 832/832 اختباراً وبناء الإنتاج والlint والتدقيق الساكن ناجحة.
