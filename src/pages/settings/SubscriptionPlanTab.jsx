import React, { useState } from 'react';
import { 
  CreditCard, Sparkles, Smartphone, Users, ShieldCheck, 
  ArrowUpRight, Database, Zap, AlertTriangle, History, Crown, CheckCircle2
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useApp } from '../../context/AppContext';
import { getClinicUsage, getClinicUsageLedger } from '../../services/usageMeteringService';

export default function SubscriptionPlanTab() {
  const { tenant } = useTenant();
  const { state } = useApp();
  const [showLedger, setShowLedger] = useState(false);

  const tier = tenant?.subscriptionTier || 'pro';
  const clinicId = tenant?.id || 'default';
  const usage = getClinicUsage(clinicId, tenant?.quotas, tier);
  const ledger = getClinicUsageLedger(clinicId);

  const smsUsed = usage.smsUsed || 0;
  const smsTotal = usage.totalSmsAllowed || 1000;
  const remainingSms = usage.remainingSms ?? Math.max(0, smsTotal - smsUsed);
  const smsPercent = Math.min(100, Math.round((smsUsed / Math.max(1, smsTotal)) * 100));

  const aiUsed = usage.aiTokensUsed || 0;
  const aiTotal = usage.totalAiAllowed || 2000000;
  const aiPercent = Math.min(100, Math.round((aiUsed / Math.max(1, aiTotal)) * 100));

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
          {tenant?.isLifetimeLicense || tenant?.subscriptionStatus === 'lifetime' ? (
            <span style={{
              background: '#FEF3C7',
              color: '#B45309',
              border: '1px solid #FCD34D',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              fontWeight: 800,
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <Crown size={14} color="#D97706" />
              <span>ترخيص دائم مدى الحياة ∞</span>
            </span>
          ) : usage.isSmsDepleted ? (
            <span style={{
              background: '#FEE2E2',
              color: '#DC2626',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              fontWeight: 700,
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <AlertTriangle size={14} />
              رصيد الرسائل نفد بالكامل
            </span>
          ) : (
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
          )}
        </div>
      </div>

      {/* SaaS Central Control Plane Banner */}
      <div style={{
        background: 'var(--bg-secondary, #FAFAFA)',
        border: '1px solid var(--border-color, #E4E4E7)',
        borderRadius: '8px',
        padding: '1.1rem 1.35rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ background: '#10B981', color: '#FFF', padding: '0.55rem', borderRadius: '12px', display: 'flex' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <strong style={{ fontSize: '1rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>
              خطة وباقتك معتمدة وتدار مركزياً من منصة الساس (SaaS Control Plane)
            </strong>
            <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
              إعدادات الباقة، رصيد الرسائل، حصص الذكاء الاصطناعي، وموارد السحابة مخصصة ومؤمّنة لعيادتك مباشرة من إدارة المنصة.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.8rem',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#059669',
            fontWeight: 800,
            padding: '0.35rem 0.85rem',
            borderRadius: '999px',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            ربط سحابي موثق ومفعل ✓
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
            {tenant?.isLifetimeLicense || tenant?.subscriptionStatus === 'lifetime' ? (
              <strong style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} />
                <span>ترخيص دائم مدى الحياة (Lifetime Enterprise License) • تم شراء البورتال بالكامل ولا توجد أي اشتراكات دورية.</span>
              </strong>
            ) : (
              <span>
                نظام السداد: <strong>{tenant?.billingCycle === 'annual' ? 'سنوي' : tenant?.billingCycle === 'quarterly' ? 'ربع سنوي (كل ٣ شهور)' : tenant?.billingCycle === 'semi_annual' ? 'نصف سنوي' : 'شهري'}</strong>
                {tenant?.nextBillingDate && tenant?.nextBillingDate !== 'مدى الحياة' ? ` • الاستحقاق القادم: ${tenant.nextBillingDate}` : ''}
              </span>
            )}
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
              {remainingSms} رسالة متبقية
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

      {/* Usage Ledger Collapsible Card */}
      <div style={{
        marginTop: '1.25rem',
        background: 'var(--surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowLedger(!showLedger)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} color="var(--primary)" />
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>سجل حركات واستهلاك الرصيد (Credit Ledger Audit)</strong>
            <span style={{ fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 999 }}>
              {ledger.length} حركة مسجلة
            </span>
          </div>
          <button 
            type="button" 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--primary)', 
              fontWeight: 700, 
              fontSize: '0.85rem',
              cursor: 'pointer' 
            }}
          >
            {showLedger ? 'إخفاء السجل' : 'عرض تفاصيل العمليات'}
          </button>
        </div>

        {showLedger && (
          <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
            {ledger.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                لا توجد حركات استهلاك مسجلة حتى الآن.
              </p>
            ) : (
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.5rem' }}>التاريخ والوقت</th>
                    <th style={{ padding: '0.5rem' }}>نوع العملية</th>
                    <th style={{ padding: '0.5rem' }}>المستلم / التفاصيل</th>
                    <th style={{ padding: '0.5rem' }}>الوحدات</th>
                    <th style={{ padding: '0.5rem' }}>الرصيد المتبقي</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.slice(0, 10).map((entry) => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>
                        {new Date(entry.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        {entry.type === 'sms_deduction' ? (
                          <span style={{ color: '#2563EB', fontWeight: 600 }}>إرسال SMS</span>
                        ) : entry.type === 'credit_topup' ? (
                          <span style={{ color: '#059669', fontWeight: 700 }}>+ شحن رصيد</span>
                        ) : (
                          <span style={{ color: '#7C3AED', fontWeight: 600 }}>ذكاء اصطناعي</span>
                        )}
                      </td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-primary)' }}>
                        {entry.recipient || entry.reason || (entry.metadata?.messageSnippet ? `"${entry.metadata.messageSnippet}..."` : '-')}
                      </td>
                      <td style={{ padding: '0.5rem', fontWeight: 700 }}>
                        {entry.type === 'credit_topup' ? `+${entry.smsAdded || entry.aiTokensAdded}` : `-${entry.units}`}
                      </td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>
                        {entry.balanceAfter !== undefined ? `${entry.balanceAfter} وحدة` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
