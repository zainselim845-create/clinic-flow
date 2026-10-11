# دليل التشغيل الهندسي وإدارة البنية التحتية والشبكات لقاعدة مستخدمين واسعة
## Comprehensive Production Operations, Request Routing, Server Topology & Anti-N+1 Performance Manual

---

## 1. الرؤية الهندسية ومبادئ الاستقرار العالي (High-Availability Architecture)

يعتمد نظام ClinicFlow على معمارية هجينة سحابية (Edge-First Serverless Hybrid) مصممة لاستيعاب ملايين الزيارات ومئات الآلاف من الطلبات المتزامنة مع الحفاظ على زمن استجابة لا يتجاوز 100 مللي ثانية للعمليات الحيوية، واستقرار تشغيلي بنسبة 99.99%.

المبادئ المعمارية الحاكمة:
1. **انعدام نقاط الفشل الفردية (Zero Single Point of Failure - SPOF):** جميع الطبقات موزعة جغرافياً وقابلة للاسترداد الذاتي.
2. **عزل النطاقات والمستأجرين (Multi-Tenant Isolation):** عزل بيانات كل عيادة منطقياً وأمنياً لمنع تسريب البيانات أو تأثير عيادة متعثرة على باقي المنظومة (Blast Radius Containment).
3. **التشغيل دون اتصال بالإنترنت والارتداد المرن (Local-First Resilience):** استمرار عمل العيادة في تسجيل المرضى والمواعيد حتى في حال انقطاع اتصال الإنترنت بالكامل ثم المزامنة التلقائية عند عودة الاتصال.
4. **استئصال اختناقات قواعد البيانات (N+1 Query Elimination):** منع إطلاق استعلامات متسلسلة لكل عنصر داخل الحلقات التكرارية والاعتماد الحصري على التجميع الدفعي والضم المباشر (Batch IN / JSON Aggregation).

---

## 2. دورة حياة الطلب وتوزيع الركويستس (Request Routing & Edge Distribution)

```
[ العميل: متصفح / تطبيق جوال / مريض ]
                  |
                  v
[ طبقة الـ DNS & Anycast Edge: Cloudflare / Vercel Edge Network ]
                  |
        +---------+---------+
        |                   |
 (الأصول الثابتة)    (الطلبات الديناميكية)
        |                   |
        v                   v
[ CDN Edge Cache ]   [ Vercel Edge Middleware (middleware.js) ]
 (SWR / 100% Hit)     - فحص النطاق والمستأجر (Subdomain / Domain Routing)
                      - محدد المعدل المنزلق (Sliding Window Rate Limiter)
                      - حقن ترويسات الأمان (CSP, HSTS, X-Frame)
                            |
           +----------------+----------------+
           |                                 |
           v                                 v
   [ تصفح واجهات SPA ]            [ واجهات البرمجة السحابية ]
   (HTML / Static Assets)         (/api/* Serverless Functions)
           |                                 |
           |             +-------------------+-------------------+
           |             |                   |                   |
           |             v                   v                   v
           |       [/api/health]    [/api/sync-tenants]   [/api/cron/*]
           |                                 |                   |
           +-----------------+---------------+-------------------+
                             |
                             v
               [ طبقة التخزين المؤقت L2 ]
               (Upstash Redis REST Pipeline)
                             |
                             v
           [ مجمع الاتصالات السحابي PgBouncer ]
           (Transaction Mode Connection Pooling)
                             |
                             v
          [ قاعدة بيانات Supabase PostgreSQL ]
          - سياسات RLS المحمية
          - الفهارس المركبة (ESR Rule)
          - عزل المستأجرين (clinic_id)
```

---

## 3. تفاصيل طبقة الـ Edge وتوجيه النطاقات (Edge Middleware & Ingress Routing)

### 3.1 معالجة النطاقات المخصصة والنطاقات الفرعية (Subdomains & Custom Domains)
يتم فحص كل طلب يدخل إلى المنظومة في طبقة الـ Edge عبر `middleware.js` قبل أن يلمس أي خادم تطبيقات أو قاعدة بيانات:
- **نطاقات المنصة الرسمية:** إذا كان الطلب وارد إلى `clinicflow.app` أو `*.vercel.app`، يتم توجيهه إلى بوابة الدخول الرئيسية أو لوحة التحكم العامة.
- **النطاقات الفرعية المخصصة (`dr-ahmed.clinicflow.app`):**
  - تستخرج دالة `extractEdgeRouting()` اسم المستأجر (`slug`).
  - يعاد كتابة المسار فورياً (Server-Side Rewrite) إلى `/index.html?clinic=dr-ahmed` دون أي HTTP Redirect إضافي لتوفير وقت الاستجابة (Zero RTT Penalty).
- **النطاقات الخاصة المملوكة للأطباء (`clinic-elite.com`):**
  - مطابقة النطاق مع سجل النطاقات المعتمدة وتوجيهه مباشرة لبيانات العيادة الخاصة مع حقن ترويسة `x-clinic-slug` وترويسة `x-is-dedicated-domain`.

### 3.2 محدد معدل الاستدعاءات المنزلق (Sliding Window Rate Limiter)
لحماية المنظومة من هجمات حجب الخدمة (DDoS) وتخمين كلمات المرور (Brute Force):
1. **حدود واجهات تسجيل الدخول والمصادقة (`/login`, `/api/auth*`):**
   - سقف الاستدعاء: 10 طلبات في الدقيقة لكل عنوان IP (متوافق مع معيار OWASP A07).
   - عند التجاوز: إرجاع استجابة فورية بكود `HTTP 429 Too Many Requests` مع ترويسة `Retry-After`.
2. **حدود التصفح العام:**
   - سقف الاستدعاء: 180 طلباً في الدقيقة لكل عنوان IP لتوفير مساحة كافية لتصفح ملفات الواجهة والأصول التفاعلية دون تعطيل المستخدم الطبيعي.
3. **آلية التنظيف الدوري:**
   - جدول زمني كل 5 دقائق لمسح السجلات القديمة من الذاكرة ومنع تراكم البيانات (Memory Leak Prevention).

---

## 4. بنية السيرفرات والبوابات السحابية (Serverless & Server Topology)

### 4.1 طبقات البنية التحتية الأساسية

| الطبقة | التقنية المستخدمة | الدور الهندسي والمسؤولية |
| :--- | :--- | :--- |
| **Edge Ingress & CDN** | Vercel Edge Network / Cloudflare | توزيع المحتوى عالمياً، إنهاء تشفير TLS 1.3، حماية DDoS، وإدارة الكاش الحافي (Edge Caching). |
| **Edge Middleware** | Vercel Edge Functions (V8 Isolation) | تنفيذ فوري لقواعد التوجيه وحماية الـ Rate Limiting في أقل من 5ms. |
| **Application Layer** | React 18 SPA + Vite Build | واجهة مستخدم فائقة السرعة مع تقسيم الحزم برمجياً (Code Splitting) وتقنية Dynamic Lazy Loading. |
| **Serverless API Layer** | Node.js Serverless (AWS Lambda / Vercel Core) | تنفيذ الدوال الخلفية الحساسة مثل مزامنة المستأجرين، وبوابات الدفع، وإرسال الرسائل القصيرة. |
| **Background Cron Tier** | Vercel Cron Jobs (`api/cron/*`) | عمال تشغيل دوريون لتسوية الاشتراكات ومطابقة الفواتير وإرسال استدعاءات المتابعة الطبية. |
| **Distributed Cache Layer** | Upstash Serverless Redis | تخزين الجلسات الموزعة، ومعدلات الاستدعاء للمؤسسات، وأقفال التزامن الذرية (Distributed Locks). |
| **Connection Pooler** | PgBouncer (Transaction Mode) | دمج آلاف الاتصالات الواردة في مسبح اتصالات ثابت لمنع اختناق أنوية المعالج في قاعدة البيانات. |
| **Primary Database** | Supabase Enterprise PostgreSQL 16 | حفظ السجلات السريرية والمالية مع تفعيل التشفير أثناء الراحة (TDE) ونسخ احتياطي فوري متزامن (WAL). |

### 4.2 استراتيجية التخلص من الإقلاع البارد (Cold-Start Mitigation)
- الدوال السحابية تعتمد نمط **التهيئة الكسولة (Lazy Client Initialization)**: لا يتم تأسيس اتصالات بقواعد البيانات أو الخدمات الخارجية في نطاق الملف العام (Global Scope)، بل داخل الدالة المنفذة عند الحاجة فقط.
- فحص المتغيرات البيئية وتعيين قيم احتياطية قياسية لمنع انهيار `FUNCTION_INVOCATION_FAILED`.
- حجم دوال الـ API لا يتجاوز 15 كيلوبايت لكل دالة لضمان إقلاعها في أقل من 80 مللي ثانية.

---

## 5. استئصال مشكلة N+1 في قواعد البيانات (Eliminating N+1 Queries)

### 5.1 ما هي مشكلة N+1 وكيف تؤدي لانهيار الإنتاج؟
تحدث مشكلة N+1 عندما يقوم الكود بجلب قائمة تحتوي على N عنصر (مثلاً 100 مريض أو 100 موعد)، ثم يقوم بعمل حلقة تكرارية (`forEach` أو `map`) ويطلق استعلاماً إضافياً لقاعدة البيانات لكل عنصر على حدة (مثلاً لجلب فواتير المريض أو أدوية الروشتة).
النتيجة الكارثية: 1 استعلام رئيسي + 100 استعلام فرعي = 101 رحلة ذهاب وعودة إلى السيرفر (Roundtrips)، مما يرفع زمن الاستجابة من 40ms إلى أكثر من 4000ms ويستنزف مسبح الاتصالات بالكامل.

### 5.2 الحلول المطبقة في المنظومة لمنع N+1 نهائياً

#### الحل الأول: التجميع الدفعي بشرط واحد (Batch IN Querying)
بدلاً من الاستعلام عن بيانات الفواتير لكل مريض على حدة:
```javascript
// الطريقة الخاطئة (N+1 Anti-Pattern - ممنوعة تماماً):
// appointments.forEach(async (appt) => {
//   const patient = await db.from('patients').select('*').eq('id', appt.patientId);
// });

// الطريقة المعتمدة في ClinicFlow (Batch IN Query - استعلامان فقط):
export async function getAppointmentsWithPatients(clinicId) {
  // 1. استعلام واحد لجلب كافة المواعيد
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('clinic_id', clinicId);

  if (!appointments || appointments.length === 0) return [];

  // 2. استخراج المعرفات الفريدة
  const patientIds = [...new Set(appointments.map(a => a.patient_id).filter(Boolean))];

  // 3. استعلام دفعي واحد لجلب كافة المرضى المرتبطين
  const { data: patients } = await supabase
    .from('patients')
    .select('id, name, phone, gender, blood_group')
    .in('id', patientIds);

  // 4. دمج البيانات في الذاكرة بزمن تعقيد O(1) عبر Hash Map
  const patientMap = new Map((patients || []).map(p => [p.id, p]));
  return appointments.map(appt => ({
    ...appt,
    patient: patientMap.get(appt.patient_id) || null
  }));
}
```

#### الحل الثاني: الضم العلائقي أحادي الرحلة (Single Roundtrip Join)
الاستفادة من قدرات PostgreSQL و Supabase في جلب العلاقات المرتبطة كاستعلام مفرد مُجمّع:
```javascript
// استعلام مفرد مدمج يجلب الفاتورة وعناصرها ومريضها دون أي رحلة إضافية
export async function getInvoicesWithDetails(clinicId) {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      total,
      paid_amount,
      payment_status,
      created_at,
      patient:patients (
        id,
        name,
        phone
      ),
      items:invoice_items (
        id,
        service_name,
        unit_price,
        quantity
      )
    `)
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

#### الحل الثالث: تجميع الكيانات في JSON على مستوى قاعدة البيانات (PostgreSQL JSON Aggregation)
في العمليات التي تحتوي على تفاصيل كثيرة (مثل سجل المريض الكامل):
```sql
-- استعلام مجمّع يعيد المريض مع كافة مواعيده وفواتيره ككائن واحد
SELECT 
  p.id,
  p.name,
  p.phone,
  COALESCE(json_agg(DISTINCT a.*) FILTER (WHERE a.id IS NOT NULL), '[]') AS appointments,
  COALESCE(json_agg(DISTINCT i.*) FILTER (WHERE i.id IS NOT NULL), '[]') AS invoices
FROM patients p
LEFT JOIN appointments a ON a.patient_id = p.id
LEFT JOIN invoices i ON i.patient_id = p.id
WHERE p.clinic_id = $1
GROUP BY p.id;
```

---

## 6. استراتيجية الفهارس وقاعدة ESR في قواعد البيانات

تلتزم جميع جداول قاعدة البيانات بقاعدة الفهرسة الذهبية **ESR (Equality -> Sort -> Range)** لضمان قراءة الفهرس بالمسح السريع (Index Scan) بدلاً من المسح الكامل للجدول (Seq Scan):

1. **Equality (التطابق التام أولاً):** الحقول التي يتم تصفيتها بالتطابق الحرفي، وأهمها `clinic_id` لعزل المستأجر، و `status`.
2. **Sort (الترتيب ثانياً):** الحقول التي يطلب ترتيب النتائج بناءً عليها، مثل `created_at` أو `date`.
3. **Range (النطاق ثالثاً):** الحقول التي يُطلب فيها مقارنة بنطاق (أكبر من / أصغر من / بين تاريخين).

### أمثلة الفهارس المعتمدة في الجداول الأساسية:

```sql
-- جدول المواعيد: بحث عن مواعيد عيادة محددة مرتبة بالتاريخ
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date 
ON public.appointments (clinic_id, date, status);

-- جدول المرضى: بحث بالهاتف والاسم مع عزل العيادة
CREATE INDEX IF NOT EXISTS idx_patients_clinic_phone 
ON public.patients (clinic_id, phone);

-- جدول الفواتير: الاستعلام المالي وحركة الخزينة
CREATE INDEX IF NOT EXISTS idx_invoices_clinic_payment_status 
ON public.invoices (clinic_id, payment_status, created_at DESC);

-- جدول أمان المصادقة الثنائية (2FA Vault):
CREATE INDEX IF NOT EXISTS idx_two_factor_user_verified 
ON public.two_factor_credentials (user_id, is_verified);
```

---

## 7. مستويات التخزين المؤقت وحماية الذاكرة (Multi-Tier Caching)

```
[ الطلب القادم ]
       |
       v
+-------------------------------------------------------------+
| L1: Edge Cache (Cloudflare / Vercel SWR)                    |
| - للأصول الثابتة، والصفحات العامة، ورسائل التسويق.          |
| - زمن الاستجابة: < 15ms.                                    |
+-------------------------------------------------------------+
       |
       | (Cache Miss)
       v
+-------------------------------------------------------------+
| L2: Distributed Redis Cache (Upstash REST)                  |
| - لحصص الرسائل، وسجل العيادات النشطة، وحصص الـ Rate Limits. |
| - فترات TTL مزودة بـ Jitter عشوائي لمنع هجمات انتهاء الكاش. |
| - زمن الاستجابة: < 35ms.                                    |
+-------------------------------------------------------------+
       |
       | (Cache Miss)
       v
+-------------------------------------------------------------+
| L3: In-Memory / Local-First Scoped Store                    |
| - تخزين محلي على مستوى متصفح العيادة (IndexedDB / Scoped)   |
| - يسمح بالعمل الميداني الفوري دون انتظار الشبكة.             |
| - زمن الاستجابة: < 2ms.                                     |
+-------------------------------------------------------------+
       |
       | (Database Query Required)
       v
+-------------------------------------------------------------+
| L4: PostgreSQL Database (عبر PgBouncer)                    |
| - استعلامات محسنة بالفهارس والضم المباشر.                   |
+-------------------------------------------------------------+
```

---

## 8. تدابير الأمان والامتثال السريري (Clinical Security Guardrails)

1. **حماية أمان المحتوى (Content Security Policy - CSP):**
   - حظر أي استدعاءات خارجية غير مصرح بها.
   - النطاقات المصرح بها في `connect-src`:
     - نطاق السحابة الرئيسي لقاعدة البيانات Supabase (`https://*.supabase.co`).
     - بوابات الدفع الإلكتروني (`https://api.stripe.com`).
     - خدمة الموقع الجغرافي المعتمدة (`https://*.freeipapi.com`).
     - خدمات خرائط العيادات (`https://*.tile.openstreetmap.org`).
2. **عزل مستأجري الذاكرة (Storage Blast Radius Containment):**
   - مفاتيح التخزين مفصولة برمجياً بصيغة: `clinicflow_{entity}_{clinicSlug}`.
   - عند تبديل العيادة أو تسجيل الخروج، لا يتم مسح بيانات العيادات الأخرى المخزنة محلياً، بل يتم قفل الوصول إليها وتطبيق سياسات العزل الفردي.
3. **تشفير مفاتيح وخزنة المصادقة الثنائية (2FA Vault Protection):**
   - أكواد الاسترداد يتم حفظها حصرياً بعد تجزئتها عبر SHA-256 مع ملح مشفر.
   - انعدام وجود أي مفاتيح سرية في الواجهات الأمامية للعميل.

---

## 9. دليل المراقبة والتحقق ومؤشرات الصحة (Observability & Health Checks)

### 9.1 نقطة التحقق من صحة النظام (`/api/health`)
- يتم استدعاؤها دورياً بواسطة خدمات المراقبة التلقائية (UptimeRobot / Datadog / BetterStack).
- تتحقق من:
  - استجابة الخادم وتخصيص الذاكرة (`process.memoryUsage()`).
  - جهوزية العميل وقاعدة البيانات.
  - تعيد رمز `HTTP 200` مع حمولة تشغيلية واضحة:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-11T07:15:00.000Z",
    "uptimeSeconds": 14205,
    "environment": "production"
  }
  ```

### 9.2 نقطة مطابقة سجل العيادات السحابي (`/api/sync-tenants`)
- تستخدمها متصفحات الأطباء والموظفين عند تسجيل الدخول من أجهزة جديدة لمزامنة بيانات العيادات المصرح لها فورياً دون الحاجة لإعادة التسجيل اليدوي.

---

## 10. خطوات التشغيل والترقية والنشر الآمن (Deployment & Rollback Runbook)

### 10.1 التحقق قبل النشر (Pre-Flight Verification)
قبل دمج أي تعديل في فرع الإنتاج `main`:
```bash
# 1. تشغيل التدقيق الساكن للأكواد
npx oxlint

# 2. تشغيل جناح الاختبارات الآلية بالكامل (80 ملفاً / 817 اختباراً)
npm test -- --run

# 3. التأكد من نجاح تجميع حزم الإنتاج
npm run build
```

### 10.2 أمر النشر للإنتاج (Deploy to Production)
```bash
# نشر مباشر لبيئة الإنتاج مع تطبيق معايير .vercelignore
npx vercel --prod --yes
```

### 10.3 التحقق الميداني الفوري بعد النشر (Post-Deploy E2E Verification)
```bash
# تشغيل سكريبت الفحص الميداني الآلي على الرابط الحي
node scripts/audit_vercel_live.cjs
```
يجب التأكد من ظهور النتيجة التالية:
`AUDIT RESULTS: 10 / 10 PASSED` و `Zero Uncaught Console Errors on Vercel Live!`

### 10.4 خطة الارتداد عند الطوارئ (Emergency Rollback)
في حال حدوث أي عطل غير متوقع في التوزيع الجديد:
1. التوجه إلى لوحة تحكم Vercel -> Deployments.
2. تحديد التوزيع السابق المعتمد المستقر (مثلاً `dpl_94BX3fSDUwC7FcNZhdYe2ANa68qs`).
3. الضغط على **Instant Rollback** لاسترجاع بيئة الإنتاج السابقة في أقل من 3 ثوانٍ دون الحاجة لإعادة البناء البرمجي.
