import React from 'react';
import { Clock, MessageCircle } from 'lucide-react';

/**
 * DashboardPendingBanner
 * Informational banner displayed when the tenant/clinic subscription status is 'pending_approval'
 */
export default function DashboardPendingBanner({ tenant, currentClinic, user }) {
  const isPending = (tenant?.subscriptionStatus === 'pending_approval') || 
                    (currentClinic?.subscriptionStatus === 'pending_approval');

  if (!isPending) return null;

  const doctorDisplayName = user?.name 
    ? (user.name.startsWith('د.') ? user.name : `د. ${user.name}`) 
    : 'دكتور';

  const tierLabel = tenant?.subscriptionTier === 'enterprise' 
    ? 'Enterprise (المراكز الكبرى)' 
    : tenant?.subscriptionTier === 'starter' 
    ? 'Starter (الأساسية)' 
    : 'Pro (العيادة الذكية)';

  const contactPhone = user?.phone || tenant?.phone || 'رقم هاتفك';
  const whatsappUrl = `https://wa.me/201006285031?text=${encodeURIComponent(
    `مرحباً فريق اسمارت كلينك، أنا الطبيب ${user?.name || ''} عيادة ${tenant?.name || ''} وأرغب في تأكيد وتفعيل حسابي سريعاً.`
  )}`;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
      border: '1.5px solid #FCD34D',
      borderRadius: '14px',
      padding: '1.1rem 1.4rem',
      marginBottom: '1.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      direction: 'rtl',
      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: '#F59E0B',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px'
        }}>
          <Clock size={22} strokeWidth={2.4} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#92400E' }}>
              حساب العيادة قيد المراجعة والتفعيل السريع
            </span>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              background: '#FDE68A',
              color: '#78350F',
              padding: '2px 8px',
              borderRadius: '6px'
            }}>
              باقة {tierLabel}
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.86rem', color: '#B45309', lineHeight: 1.5 }}>
            مرحباً بك {doctorDisplayName}! تم تدشين عيادتك بنجاح ويمكنك استكشاف النظام وإدخال بيانات المرضى والخدمات. سيقوم فريق اسمارت كلينك بالتواصل معك هاتفياً على ({contactPhone}) لتأكيد الاشتراك وتفعيل كافة الصلاحيات المتقدمة.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
        <a 
          href={whatsappUrl}
          target="_blank" 
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            background: '#10B981',
            color: '#FFFFFF',
            fontSize: '0.84rem',
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)'
          }}
        >
          <MessageCircle size={15} />
          <span>تواصل لتسريع التفعيل</span>
        </a>
      </div>
    </div>
  );
}
