import React from 'react';
import { 
  CreditCard, Sparkles, Smartphone, Users, ShieldCheck, 
  ArrowUpRight, Database, Zap
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useApp } from '../../context/AppContext';

export default function SubscriptionPlanTab() {
  const { tenant } = useTenant();
  const { state } = useApp();

  const tier = tenant?.subscriptionTier || 'pro';
  const quotas = tenant?.quotas || {
    monthlySmsQuota: 500,
    smsUsed: 78,
    aiTokensQuota: 1000000,
    aiTokensUsed: 42000,
    maxDoctors: 3
  };

  const smsUsed = quotas.smsUsed || 0;
  const smsTotal = quotas.monthlySmsQuota || 500;
  const smsPercent = Math.min(100, Math.round((smsUsed / smsTotal) * 100));

  const aiUsed = quotas.aiTokensUsed || 0;
  const aiTotal = quotas.aiTokensQuota || 1000000;
  const aiPercent = Math.min(100, Math.round((aiUsed / aiTotal) * 100));

  const staffCount = (state.staffMembers || []).length;
  const activePatientsCount = (state.patients || []).length;

  return (
    <div className="settings-section">
      <div className="section-header">
        <div>
          <h3>
            <CreditCard size={20} color="var(--primary)" />
            <span>خطة الاشتراك واستهلاك العيادة</span>
          </h3>
          <p>متابعة رصيد رسائل SMS، حصص الذكاء الاصطناعي، ومميزات باقتك النشطة</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{
            background: 'var(--success-light)',
            color: 'var(--success)',
            padding: '0.35rem 0.85rem',
            borderRadius: '999px',
            fontWeight: 700,
            fontSize: '0.82rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }}></span>
            اشتراك سارٍ ومفعّل
          </span>
        </div>
      </div>

      {/* Plan Overview Card */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.25rem',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <strong style={{ fontSize: '1.35rem', color: 'var(--text-primary)' }}>
              {tier === 'enterprise' ? 'باقة المستشفيات والمراكز الكبرى (Enterprise)' : 'باقة العيادة الذكية المتكاملة (Pro)'}
            </strong>
            <span style={{
              background: tier === 'enterprise' ? '#EDE9FE' : '#E0F2FE',
              color: tier === 'enterprise' ? '#6D28D9' : '#0284C7',
              fontSize: '0.78rem',
              fontWeight: 800,
              padding: '0.2rem 0.6rem',
              borderRadius: '6px'
            }}>
              {tier.toUpperCase()}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            تجديد شهري تلقائي • الفاتورة القادمة في <strong>١ أكتوبر ٢٠٢٦</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a
            href="https://wa.me/201006285031?text=مرحباً، أود ترقية باقة عيادتي في ClinicFlow"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--primary)',
              color: '#FFFFFF',
              padding: '0.6rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none'
            }}
          >
            <span>ترقية الخطة أو شراء رصيد</span>
            <ArrowUpRight size={16} />
          </a>
        </div>
      </div>

      {/* Quotas & Usage Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
        marginTop: '0.5rem'
      }}>
        {/* SMS Quota Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.8rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ background: '#EFF6FF', color: '#2563EB', padding: '0.5rem', borderRadius: '10px' }}>
                <Smartphone size={20} />
              </div>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>رسائل الـ SMS والتذكيرات</strong>
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              {smsTotal - smsUsed} رسالة متبقية
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              <span>تم إرسال {smsUsed} من {smsTotal} رسالة</span>
              <span>{smsPercent}%</span>
            </div>
            <div style={{ width: '100%', height: 8, background: 'var(--bg-tertiary)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${smsPercent}%`, height: '100%', background: smsPercent > 85 ? '#EF4444' : '#2563EB', borderRadius: 999 }}></div>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
            💡 تُستخدم تلقائياً في تذكير المرضى بمواعيدهم قبلها بـ 24 ساعة، وإرسال تأكيدات الحجز الرقمية.
          </div>
        </div>

        {/* AI Assistant Quota Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.8rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ background: '#F5F3FF', color: '#7C3AED', padding: '0.5rem', borderRadius: '10px' }}>
                <Sparkles size={20} />
              </div>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>المساعد السريري الذكي (AI)</strong>
            </div>
            <span style={{
              background: '#ECFDF5',
              color: '#059669',
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '999px'
            }}>
              نشط ومفعّل
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              <span>استهلاك الـ Tokens الشهري</span>
              <span>{aiPercent}% ({Math.round(aiUsed / 1000)}k / {Math.round(aiTotal / 1000)}k)</span>
            </div>
            <div style={{ width: '100%', height: 8, background: 'var(--bg-tertiary)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${aiPercent}%`, height: '100%', background: '#7C3AED', borderRadius: 999 }}></div>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
            💡 يفحص التداخلات الدوائية لحظياً، ويدعم كتابة التقارير السريرية واقتراح خطط العلاج.
          </div>
        </div>

        {/* Staff & Clinic Capacity Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.8rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: '#F0FDF4', color: '#16A34A', padding: '0.5rem', borderRadius: '10px' }}>
              <Users size={20} />
            </div>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>فريق العمل والاستيعاب</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>طاقم الاستقبال والمساعدين</span>
            <strong style={{ color: 'var(--text-primary)' }}>{staffCount} موظفين مسجلين</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>إجمالي سجلات المرضى النشطة</span>
            <strong style={{ color: 'var(--text-primary)' }}>{activePatientsCount} مريض</strong>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
            سعة غير محدودة لسجلات المرضى والأشعات والملفات الطبية السريرية.
          </div>
        </div>

        {/* Cloud Infrastructure & Security Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.8rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: '#FEF3C7', color: '#D97706', padding: '0.5rem', borderRadius: '10px' }}>
              <ShieldCheck size={20} />
            </div>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>الأمان والنسخ الاحتياطي</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Database size={15} color="#10B981" />
            <span>نسخ احتياطي فوري متزامن (Continuous Cloud Backup)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Zap size={15} color="#10B981" />
            <span>تشفير طبي ثنائي الأطراف (HIPAA / AES-256 Compliant)</span>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
            بيانات عيادتك معزولة ومحمية سحابياً ومتاحة للعمل حتى في حال انقطاع الإنترنت (Offline-First).
          </div>
        </div>
      </div>
    </div>
  );
}
