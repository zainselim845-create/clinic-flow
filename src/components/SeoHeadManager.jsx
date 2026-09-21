import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';

/**
 * Route-specific metadata mapping
 */
const ROUTE_META = {
  '/': {
    title: 'كلينك فلو (ClinicFlow) | منظومة إدارة العيادات والمراكز الطبية الذكية',
    description: 'المنظومة السحابية المتكاملة لإدارة العيادات الطبية ومجمعات الأسنان والجلدية. حجز فوري بالهاتف، ملفات مرضى إلكترونية، وفوترة ذكية.',
    schemaType: 'SoftwareApplication'
  },
  '/dashboard': {
    title: 'لوحة التحكم السريرية وإدارة اليوم',
    description: 'متابعة جدول مواعيد اليوم، صالة الانتظار الحية، واستدعاء المرضى وغرفة الكشف.',
    schemaType: 'MedicalWebPage'
  },
  '/appointments': {
    title: 'إدارة المواعيد والتقويم السريري',
    description: 'تنظيم جدول مواعيد العيادة، كراسي الفحص، حظر الإجازات، وحجوزات المرضى المؤكدة.',
    schemaType: 'MedicalWebPage'
  },
  '/patients': {
    title: 'السجلات والملفات الطبية للمرضى',
    description: 'سجل طبي رقمي شامل: التاريخ المرضي، الروشتات السابقة، خطط العلاج، والفواتير المسددة.',
    schemaType: 'MedicalWebPage'
  },
  '/invoices': {
    title: 'الفوترة والتحصيلات المالية والخزينة',
    description: 'إصدار الفواتير الضريبية، تسجيل المدفوعات كاش وفيزا وإنستاباي، وإدارة المصروفات التشغيلية.',
    schemaType: 'FinancialProduct'
  },
  '/inventory': {
    title: 'مخزون المستلزمات والمستهلكات الطبية',
    description: 'متابعة أرصدة المواد الطبية، تنبيهات قرب النفاد، وتوريد الخامات ومستهلكات العيادة.',
    schemaType: 'MedicalWebPage'
  },
  '/attendance': {
    title: 'سجل حضور وانصراف الطاقم الطبي',
    description: 'متابعة حضور وانصراف الأطباء والمساعدين وطاقم الاستقبال وساعات العمل اليومية.',
    schemaType: 'MedicalWebPage'
  },
  '/doctor-agent': {
    title: 'مساعد الطبيب الذكي والتشخيص السريري',
    description: 'مساعد سريري ذكي لمراجعة التداخلات الدوائية، اقتراح بروتوكولات العلاج، وصياغة التقارير.',
    schemaType: 'MedicalWebPage'
  },
  '/notifications': {
    title: 'مركز التنبيهات والإشعارات الفورية',
    description: 'تنبيهات الحجوزات الجديدة، المواعيد الملغاة، تذكيرات المتابعة، وتنبيهات الخزينة.',
    schemaType: 'WebPage'
  },
  '/sms-integration': {
    title: 'بوابة وبنية الرسائل النصية والتكامل',
    description: 'إدارة وتكامل بوابات الرسائل النصية SMS المعتمدة، متابعة الحصص والاستهلاك، وتنبيهات المرضى التلقائية.',
    schemaType: 'MedicalWebPage'
  },
  '/labs': {
    title: 'معمل التركيبات والتحاليل الرقمية',
    description: 'متابعة طلبيات المعامل الخارجية، طربوش زيركون، إيماكس، والفينير بدقة سريرية وحسابات المعامل.',
    schemaType: 'MedicalWebPage'
  },
  '/settings': {
    title: 'إعدادات وإدارة العيادة والدومين السحابي',
    description: 'تخصيص بيانات العيادة، أوقات العمل، قائمة الأسعار، بوابات الرسائل SMS، والنطاق المخصص.',
    schemaType: 'WebPage'
  },
  '/super-admin': {
    title: 'إدارة منصة ClinicFlow B2B SaaS | Platform Control Plane',
    description: 'لوحة التحكم المركزية لمدير منصة الساس: إدارة تراخيص العيادات، استهلاك الـ SMS، ومراقبة البنية السحابية.',
    schemaType: 'AdminWebPage'
  },
  '/superadmin/login': {
    title: 'تسجيل دخول إدارة المنصة المركزية | ClinicFlow SaaS Admin',
    description: 'بوابة الدخول الآمنة لمديري منصة ClinicFlow وإدارة تراخيص المنظومة والعيادات.',
    schemaType: 'AdminWebPage'
  },
  '/super-admin/login': {
    title: 'تسجيل دخول إدارة المنصة المركزية | ClinicFlow SaaS Admin',
    description: 'بوابة الدخول الآمنة لمديري منصة ClinicFlow وإدارة تراخيص المنظومة والعيادات.',
    schemaType: 'AdminWebPage'
  },
  '/booking': {
    title: 'بوابة استكشاف وحجز العيادات الطبية | ClinicFlow Discovery Hub',
    description: 'ابحث عن أفضل الأطباء والعيادات التخصصية واحجز موعدك فوراً برقم هاتفك دون الحاجة لإنشاء حساب.',
    schemaType: 'MedicalClinic'
  },
  '/manage-booking': {
    title: 'بوابة الاستعلام وتعديل المواعيد | تذاكر المرضى',
    description: 'استعلم عن تذكرة حجزك عبر كود الحجز أو رقم الهاتف، وقم بتعديل أو إلغاء موعدك بسهولة.',
    schemaType: 'MedicalWebPage'
  },
  '/login': {
    title: 'تسجيل الدخول الآمن | منظومة ClinicFlow',
    description: 'تسجيل دخول الأطباء وطاقم الاستقبال وإدارة العيادات إلى منظومة ClinicFlow السحابية.',
    schemaType: 'WebPage'
  },
  '/onboarding': {
    title: 'تهيئة وتدشين العيادة الجديدة | خطوة بخطوة',
    description: 'أكمل إعداد عيادتك الطبية وضبط مواعيد العمل وأسعار الكشف في دقائق معدودة.',
    schemaType: 'WebPage'
  }
};

/**
 * SeoHeadManager - Central Dynamic SEO & Head Management Component
 */
export default function SeoHeadManager() {
  const location = useLocation();
  const { tenant, isDedicatedDomain } = useTenant();

  useEffect(() => {
    const pathname = location.pathname;
    const cleanPath = pathname.split('?')[0].replace(/\/$/, '') || '/';
    const isDedicatedBooking = pathname.includes('/booking') && pathname !== '/booking';
    const isDedicatedManage = pathname.includes('/manage-booking') && pathname !== '/manage-booking';

    // 1. Resolve Page Title & Clinic Branding
    const clinicName = tenant?.name || 'كلينك فلو';
    const doctorName = tenant?.doctorName || '';
    const baseMeta = ROUTE_META[cleanPath] || null;

    let finalTitle = '';
    let finalDesc = '';

    if (isDedicatedBooking) {
      finalTitle = `حجز موعد أونلاين | ${clinicName}${doctorName ? ` - ${doctorName}` : ''}`;
      finalDesc = `احجز موعد كشف واستشارة طبية في ${clinicName} مع ${doctorName}. حجز فوري مؤكد برقم الموبايل وتذكرة حضور ذكية.`;
    } else if (isDedicatedManage) {
      finalTitle = `إدارة وتأكيد الحجز | ${clinicName}`;
      finalDesc = `الاستعلام عن تذكرة الكشف وإدارة موعدك في ${clinicName}.`;
    } else if (baseMeta) {
      if (cleanPath === '/' || cleanPath === '/login' || cleanPath === '/super-admin' || cleanPath === '/booking') {
        finalTitle = baseMeta.title;
      } else {
        finalTitle = `${baseMeta.title} | ${clinicName}`;
      }
      finalDesc = baseMeta.description;
    } else {
      // 404 or unknown
      finalTitle = '404 - الصفحة غير موجودة | كلينك فلو (ClinicFlow)';
      finalDesc = 'عذراً، الصفحة التي تبحث عنها غير متوفرة أو تم تغيير رابطها. يمكنك العودة للصفحة الرئيسية.';
    }

    // Guard: ensure no 'Vite' or 'React' strings ever appear in browser title
    document.title = finalTitle.replace(/vite|react/gi, '').trim();

    // 2. Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', finalDesc);

    // 3. Update Canonical Link
    const hostDomain = (isDedicatedDomain && tenant?.customDomain) 
      ? `https://${tenant.customDomain}` 
      : 'https://clinicflow.app';
    const canonicalUrl = `${hostDomain}${pathname}`;

    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', canonicalUrl);

    // 4. Update OpenGraph Tags
    const updateOg = (property, content) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    updateOg('og:title', finalTitle);
    updateOg('og:description', finalDesc);
    updateOg('og:url', canonicalUrl);
    updateOg('og:image', `${hostDomain}/og-image.png`);
    updateOg('og:image:alt', finalTitle);

    const updateTwitterMeta = (name, content) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };
    updateTwitterMeta('twitter:title', finalTitle);
    updateTwitterMeta('twitter:description', finalDesc);
    updateTwitterMeta('twitter:image', `${hostDomain}/og-image.png`);
    updateTwitterMeta('twitter:image:alt', finalTitle);

    // 5. Update Robots meta for 404
    let robotsTag = document.querySelector('meta[name="robots"]');
    if (!baseMeta && !isDedicatedBooking && !isDedicatedManage) {
      if (!robotsTag) {
        robotsTag = document.createElement('meta');
        robotsTag.setAttribute('name', 'robots');
        document.head.appendChild(robotsTag);
      }
      robotsTag.setAttribute('content', 'noindex, follow');
    } else if (robotsTag) {
      robotsTag.setAttribute('content', 'index, follow');
    }

    // 6. Dynamic JSON-LD for Local Clinic Business Schema
    const existingClinicScript = document.getElementById('clinic-jsonld-schema');
    if (existingClinicScript) {
      existingClinicScript.remove();
    }

    if (tenant && (isDedicatedBooking || isDedicatedDomain || cleanPath === '/dashboard')) {
      const clinicSchema = {
        '@context': 'https://schema.org',
        '@type': tenant.specialty?.includes('أسنان') ? 'Dentist' : 'MedicalClinic',
        name: clinicName,
        url: canonicalUrl,
        telephone: tenant.phone || '+201006285031',
        description: `عيادة ${clinicName} التخصصية بقيادة ${doctorName || 'المدير الطبي'}. تخصص: ${tenant.specialty || 'طب عام'}.`,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'القاهرة',
          addressCountry: 'EG'
        },
        priceRange: tenant.regularFee || '$$',
        medicalSpecialty: tenant.specialty || 'GeneralPractice'
      };

      const script = document.createElement('script');
      script.id = 'clinic-jsonld-schema';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(clinicSchema);
      document.head.appendChild(script);
    }

  }, [location.pathname, tenant, isDedicatedDomain]);

  return null;
}
