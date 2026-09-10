import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { hasPermission, isDoctorRole } from '../utils/permissions';
import { Loader2, AlertOctagon, Clock, LogOut, PhoneCall, ShieldAlert } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles, requiredPermission }) => {
  const { user, loading, role, signOut } = useAuth();
  const { tenant } = useTenant();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Loader2 className="spinner" size={48} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const effectiveRole = user?.role || role || 'doctor';
  const isSuperAdmin = effectiveRole === 'super_admin' || user?.isSuperAdmin === true;

  // 1. Subscription & Account Status Guard (Bypass for Super Admin)
  if (!isSuperAdmin && tenant) {
    const subStatus = tenant.subscriptionStatus || 'active';

    // Account Suspended for Non-Payment
    if (subStatus === 'suspended') {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary, #f8fafc)',
          padding: '1.5rem',
          direction: 'rtl'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: 'var(--bg-secondary, #ffffff)',
            borderRadius: '16px',
            border: '1px solid #fecaca',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            padding: '2.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1.25rem',
              borderRadius: '50%',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626'
            }}>
              <AlertOctagon size={36} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.75rem' }}>
              تم تعليق حساب العيادة مؤقتاً
            </h2>
            <p style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              تم إيقاف صلاحية الوصول لمنظومة <strong>{tenant.name}</strong> مؤقتاً من قِبل إدارة المنصة 
              بسبب <strong>{tenant.suspensionReason || 'عدم سداد الاشتراك الدوري المستحق'}</strong>.
            </p>
            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.88rem', color: '#b91c1c' }}>
              لاستعادة الوصول الفوري لكافة السجلات والمواعيد، يرجى تسوية الفاتورة المستحقة أو التواصل مع الإدارة المالية.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a 
                href="https://wa.me/201006285031?text=مرحباً، أود تسوية اشتراك عيادتي على منصة كلينيك فلو" 
                target="_blank" 
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  background: 'var(--primary, #0071E3)',
                  color: '#fff',
                  borderRadius: '10px',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                <PhoneCall size={18} />
                <span>التواصل المباشر مع إدارة المنصة</span>
              </a>
              <button
                type="button"
                onClick={() => signOut()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  background: 'transparent',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '10px',
                  color: 'var(--text-secondary, #64748b)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                <LogOut size={16} />
                <span>تسجيل الخروج من الحساب</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Account Pending Admin Approval
    if (subStatus === 'pending_approval') {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary, #f8fafc)',
          padding: '1.5rem',
          direction: 'rtl'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: 'var(--bg-secondary, #ffffff)',
            borderRadius: '16px',
            border: '1px solid #fed7aa',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            padding: '2.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1.25rem',
              borderRadius: '50%',
              background: '#ffedd5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ea580c'
            }}>
              <Clock size={36} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#9a3412', marginBottom: '0.75rem' }}>
              طلب العيادة قيد المراجعة والتدقيق
            </h2>
            <p style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              تم استلام طلب تأسيس عيادة <strong>{tenant.name}</strong> بنجاح. يقوم فريق إدارة المنصة حالياً بمراجعة البيانات وتفعيل الحساب. سيصلك إشعار فور الاعتماد.
            </p>
            <button
              type="button"
              onClick={() => signOut()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: 'var(--bg-tertiary, #f1f5f9)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '10px',
                color: 'var(--text-primary, #0f172a)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <LogOut size={16} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      );
    }
  }

  // 2. Role-Based Authorization
  if (allowedRoles && allowedRoles.length > 0) {
    const isDoctorAllowed = allowedRoles.includes('doctor') && isDoctorRole(user);
    const isExplicitlyAllowed = allowedRoles.includes(effectiveRole);
    if (!isDoctorAllowed && !isExplicitlyAllowed) {
      const allowedRoleLabels = allowedRoles.map(r => {
        if (r === 'doctor') return 'الأطباء والمدير الطبي';
        if (r === 'super_admin') return 'إدارة المنصة العليا';
        if (r === 'staff') return 'طاقم الاستقبال';
        return r;
      }).join('، ');

      return (
        <div style={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
          direction: 'rtl'
        }}>
          <div className="access-denied-box" style={{
            maxWidth: '520px',
            width: '100%',
            background: 'var(--surface, #FFFFFF)',
            borderRadius: '24px',
            border: '1px solid var(--border-color, #DADCE0)',
            boxShadow: '0 2px 6px rgba(60,64,67,0.15)',
            padding: '2.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1.25rem',
              borderRadius: '50%',
              background: '#FCE8E6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D93025'
            }}>
              <ShieldAlert size={36} />
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary, #202124)', marginBottom: '0.75rem' }}>
              غير مصرح لك بالوصول إلى هذه الصفحة
            </h2>
            <p style={{ color: 'var(--text-secondary, #5F6368)', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              هذا القسم مخصص لفئة ({allowedRoleLabels}) فقط.
            </p>
            <div style={{ background: 'var(--surface-container, #F0F4F9)', border: '1px solid var(--border-subtle, #E8EAED)', padding: '0.85rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.86rem', color: 'var(--text-primary, #202124)', textAlign: 'right' }}>
              <div><strong>الحساب الحالي:</strong> {user?.name || 'مستخدم'}</div>
              <div><strong>الدور الوظيفي:</strong> {user?.jobTitle || user?.role || 'طاقم العيادة'}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link
                to="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.5rem',
                  background: '#0B57D0',
                  color: '#FFFFFF',
                  borderRadius: '24px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textDecoration: 'none'
                }}
              >
                العودة للوحة التحكم
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  background: 'transparent',
                  border: '1px solid var(--border-color, #DADCE0)',
                  borderRadius: '24px',
                  color: 'var(--text-secondary, #5F6368)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // 3. Permission-Based Authorization
  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return (
      <div style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        direction: 'rtl'
      }}>
        <div style={{
          maxWidth: '520px',
          width: '100%',
          background: 'var(--surface, #FFFFFF)',
          borderRadius: '24px',
          border: '1px solid var(--border-color, #DADCE0)',
          boxShadow: '0 2px 6px rgba(60,64,67,0.15)',
          padding: '2.5rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 1.25rem',
            borderRadius: '50%',
            background: '#FCE8E6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#D93025'
          }}>
            <ShieldAlert size={36} />
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary, #202124)', marginBottom: '0.75rem' }}>
            الصلاحية غير ممنوحة لحسابك
          </h2>
          <p style={{ color: 'var(--text-secondary, #5F6368)', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
            يتطلب هذا القسم صلاحية <strong>({requiredPermission})</strong> غير مدرجة في أذونات حسابك الحالية.
          </p>
          <div style={{ background: 'var(--surface-container, #F0F4F9)', border: '1px solid var(--border-subtle, #E8EAED)', padding: '0.85rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.86rem', color: 'var(--text-primary, #202124)', textAlign: 'right' }}>
            <div><strong>المستخدم:</strong> {user?.name}</div>
            <div><strong>الدور الوظيفي:</strong> {user?.jobTitle || user?.role}</div>
          </div>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.5rem',
              background: '#0B57D0',
              color: '#FFFFFF',
              borderRadius: '24px',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none'
            }}
          >
            العودة للوحة التحكم
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
