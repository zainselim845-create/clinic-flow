# كلينك فلو (ClinicFlow) — منظومة إدارة العيادات الذكية المتقدمة

[![CI/CD Pipeline](https://github.com/zainselim845-create/clinic-flow/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/zainselim845-create/clinic-flow/actions/workflows/ci-cd.yml)
[![Tests: 475 Passed](https://img.shields.io/badge/Tests-475%20passed-brightgreen.svg)](https://github.com/zainselim845-create/clinic-flow/actions)
[![Deploy: Vercel](https://img.shields.io/badge/Deploy-Vercel%20Production-black.svg?logo=vercel)](https://clinic-flow-lh3g.vercel.app)
[![Code Quality: Oxlint](https://img.shields.io/badge/Linter-Oxlint%200%20errors-blue.svg)](https://github.com/zainselim845-create/clinic-flow)

منظومة طبية وسريرية متكاملة مصممة بأحدث تقنيات الويب لإدارة العيادات والمراكز الطبية الخاصة بكفاءة وسرعة فائقة، مع دعم الحجز الإلكتروني الذكي، طابور الانتظار اللحظي، مساعد الطبيب بالذكاء الاصطناعي، والمزامنة السحابية الفورية.

---

##  أبرز مميزات النظام

- ** لوحة تحكم الطبيب السريرية (Doctor Clinical Dashboard):**
  - إدارة طابور الانتظار وغرفة الكشف لحظياً.
  - إتمام الكشوفات وتسجيل التشخيصات والملاحظات السريرية بضغطة زر.
  - رسوم بيانية تفاعلية للإيرادات وتوزيع أنواع الكشوفات.

- ** بوابة الحجز الذاتي للمرضى (Public Booking Portal):**
  - جدول مواعيد تفاعلي يراعي إجازات الطبيب والمواعيد المغلقة.
  - حجز فوري للمرضى مع توليد كود حجز فريد (#CF-XXXX).
  - تدقيق ذكي لأرقام الهواتف المصرية ومعالجة الأرقام العربية والدولية.

- ** بوابة إدارة الحجز المؤمنة (Self-Service Manage Booking):**
  - تمكين المريض من مراجعة أو تعديل أو إلغاء موعده بأمان تام بدون أي تكاليف SMS، باستخدام كود الحجز أو التحقق بالاسم المسجل.

- ** مساعد الطبيب الذكي لمتابعة المرضى (AI Clinical Assistant):**
  - استعلام فوري وتحليل سجلات المرضى باللغة العربية (مرضى الضغط، السكر، الحساسية).
  - تنفيذ أوامر الطبيب الصوتية والنصية (حظر المواعيد، الإجازات، إلغاء الحظر) وتحديث قاعدة البيانات مباشرة.

- ** إدارة السكرتارية وفريق العمل (Staff Management):**
  - إضافة وتعديل حسابات الاستقبال، تحديد الورديات والصلاحيات، وإمكانية تجميد الحسابات مؤقتاً.

- ** بوابة دخول مؤمنة ومحمية من الهجمات (Hardened Security Gateway):**
  - حظر تلقائي للمحاولات الخاطئة المتكررة (Brute-Force Rate Limiting).
  - حماية المسارات وعزل الإعدادات الحساسة بحساب الطبيب فقط (`Role Guards`).

- ** مزامنة سحابية لحظية (Supabase Realtime Sync):**
  - ربط كامل مع قاعدة بيانات PostgreSQL مع تحديث شاشات كافة الأجهزة فورياً عبر WebSockets.
  - دعم العمل التلقائي بدون اتصال (Offline/Demo Fallback) في حال عدم توفر الإنترنت.

---

##  المتطلبات الأساسية (Prerequisites)

- **Node.js**: إصدار `18.0.0` أو أحدث.
- **npm** أو **pnpm** أو **yarn**.
- *(اختياري)* حساب مجاني على [Supabase](https://supabase.com) لقاعدة البيانات السحابية.
- *(اختياري)* مفتاح مجاني من [OpenRouter](https://openrouter.ai) لمساعد الطبيب الذكي.
- *(اختياري)* محرك [Docker](https://www.docker.com) للنشر المستقل على السيرفرات.

---

##  التشغيل المحلي السريع (Quick Local Setup)

### 1. تثبيت الحزم والمكتبات:
```bash
npm install
```

### 2. إعداد متغيرات البيئة:
قم بنسخ ملف `.env.example` إلى `.env`:
```bash
cp .env.example .env
```

### 3. تشغيل خادم التطوير:
```bash
npm run dev
```
سيعمل التطبيق مباشرة على: `http://localhost:5173`

---

##  إعداد قاعدة بيانات Supabase (خطوة بخطوة)

1. أنشئ مشروعاً جديداً مجانياً على [Supabase](https://supabase.com).
2. ادخل إلى قسم **SQL Editor** من القائمة الجانبية.
3. انسخ محتوى الملف `supabase/migrations/001_initial_schema.sql` والصقه في الـ SQL Editor ثم اضغط **Run**.
4. ادخل إلى **Project Settings -> API** وانسخ:
   - `Project URL`
   - `Project API anon key`
5. ضع القيم في ملف `.env` أو أدخلها مباشرة من شاشة `الإعدادات -> السحابة والنسخ الاحتياطي` داخل النظام.

---

##  تشغيل الاختبارات الآلية (Automated Testing)

يحتوي المشروع على منظومة اختبارات شاملة تغطي كافة المسارات والـ Reducers والـ Services والمساعد الذكي:

```bash
# تشغيل كامل الاختبارات
npm test

# فحص كود المشروع
npm run lint

# بناء نسخة الإنتاج
npm run build
```

---

##  دليل النشر في بيئة الإنتاج (Production Deployment)

### الخيار 1: النشر على Vercel (موصى به - بضغطة زر)
1. اربط مستودع GitHub بحسابك على [Vercel](https://vercel.com).
2. سيقوم Vercel باكتشاف المشروع تلقائياً وتطبيق إعدادات `vercel.json`.
3. أضف متغيرات البيئة (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OPENROUTER_API_KEY`).
4. اضغط **Deploy**.

### الخيار 2: النشر عبر Docker على أي سيرفر أو VPS
تم تجهيز `Dockerfile` متعدد المراحل عالي الكفاءة مع خادم `Nginx` مضغوط ومؤمن:

```bash
# بناء صورة الدوكر
docker build -t clinicflow:latest .

# تشغيل الحاوية على المنفذ 80
docker run -d -p 80:80 --name clinicflow_app clinicflow:latest
```

---

## 🛡️ خط أنابيب التطوير والنشر المستمر (CI/CD Pipeline)

تعتمد منصة ClinicFlow على خط أنابيب أوتوماتيكي متكامل مبني على **GitHub Actions** (`.github/workflows/ci-cd.yml`) يتم تشغيله تلقائياً عند كل `push` أو `pull_request` على فرع `main`:

```
                    ┌─────────────────────────┐
                    │   GitHub Push / PR      │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────▼───────────────┐
                 │  1. CI Quality Gate (🛡️)      │
                 │  - Oxlint Static Analysis     │
                 │  - 475 Vitest Specs (46 files)│
                 │  - Vite Production Build      │
                 │  - Zero Sourcemaps Audit      │
                 └───────────────┬───────────────┘
                                 │
                 ┌───────────────▼───────────────┐
                 │  2. E2E UI Review Loop (🌐)   │
                 │  - Playwright Chromium Engine │
                 │  - Local Preview Health Check │
                 │  - 100% DOM Dynamics Sweep    │
                 └───────────────┬───────────────┘
                                 │ (Only on main push)
                 ┌───────────────▼───────────────┐
                 │  3. CD Production Deploy (🚀) │
                 │  - Vercel Zero-Config Sync    │
                 │  - Instant Edge CDN Routing   │
                 └───────────────────────────────┘
```

### مراحل خط الأنابيب (Pipeline Stages):
1. **🛡️ بوابة الجودة والفحص (Quality Gate)**:
   - فحص الكود الثابت عبر `oxlint` للتأكد من عدم وجود أية أخطاء بنسبة 100% (`0 errors`).
   - تشغيل حزمة الاختبارات الشاملة (46 ملف اختبار، 475 اختباراً تغطي عزل البيانات، الأمان، والتحصيلات المالية).
   - بناء حزمة الإنتاج (`npm run build`) والتأكد التام من خلوها من ملفات خرائط المصدر (`.map`) لمنع أي تسريب للكود أو البيانات.
   - رفع مخرجات البناء كـ Artifact معتمد لباقي المراحل.
2. **🌐 فحص واجهة المستخدم اللحظي (UI Review Loop & E2E)**:
   - تشغيل خادم معاينة محلي (`Vite Preview`) والانتظار حتى يستجيب بنجاح عبر فحص الاتصال (`Health Check`).
   - تشغيل متصفح Playwright Chromium وفحص 100% من المسارات التفاعلية، أزرار الحجز، استدعاء المرضى، والتأكد من انعدام أية أخطاء في الـ Console.
3. **🚀 النشر التلقائي للإنتاج (Continuous Deployment)**:
   - نشر النسخة المعتمدة والمفحوصة مباشرة إلى بيئة الإنتاج على **Vercel** (`clinic-flow-lh3g.vercel.app`).

---

##  الحسابات والبيانات الافتراضية للتجربة السريعة

| الحساب | المعرف / البريد | كلمة المرور | الصلاحيات |
|---|---|---|---|
| **الطبيب (مدير العيادة)** | `doctor@clinicflow.com` | `admin` | إدارة كاملة، الإعدادات، المساعد الذكي، الطاقم |
| **السكرتارية (الاستقبال)** | `sara.reception@clinic.com` | `123` | المواعيد، المرضى، صالة الانتظار، الواتساب |

---

##  الترخيص (License)
مرخص بموجب رخصة MIT — متاح للاستخدام والتطوير الحر.
