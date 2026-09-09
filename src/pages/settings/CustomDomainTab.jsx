import React, { useState, useEffect } from 'react';
import {
  Globe,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import {
  DOMAIN_STATUS,
  sanitizeDomain,
  isValidDomain,
  getRequiredDnsRecords,
  verifyDomainDnsAndSsl,
  saveClinicDomainSettings,
  getClinicDomainSettings
} from '../../services/customDomainService';
import { useApp } from '../../context/AppContext';
import { useTenant } from '../../context/TenantContext';
import './CustomDomainTab.css';

export default function CustomDomainTab() {
  const { state, dispatch } = useApp();
  const { tenant } = useTenant();

  const clinicId = state.clinicInfo?.id || tenant?.id || '550e8400-e29b-41d4-a716-446655440000';
  const initialDomain = state.clinicInfo?.customDomain || state.clinicInfo?.custom_domain || tenant?.customDomain || '';

  const [domainInput, setDomainInput] = useState(initialDomain);
  const [domainConfig, setDomainConfig] = useState(() => {
    return getClinicDomainSettings(clinicId) || {
      domain: initialDomain,
      sslStatus: initialDomain ? DOMAIN_STATUS.PENDING_DNS : DOMAIN_STATUS.UNCONFIGURED,
      verifiedAt: null
    };
  });

  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const saved = getClinicDomainSettings(clinicId);
    if (saved) {
      setDomainConfig(saved);
      if (saved.domain) {
        setDomainInput(saved.domain);
      }
    }
  }, [clinicId]);

  const cleanDomain = sanitizeDomain(domainInput);
  const isInputValid = isValidDomain(cleanDomain);
  const requiredRecords = cleanDomain ? getRequiredDnsRecords(cleanDomain, clinicId) : [];

  const handleCopy = (text, key) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleSaveDomain = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!cleanDomain) {
      const updated = {
        domain: '',
        sslStatus: DOMAIN_STATUS.UNCONFIGURED,
        verifiedAt: null
      };
      setDomainConfig(updated);
      saveClinicDomainSettings(clinicId, updated);
      dispatch({
        type: 'UPDATE_CLINIC_INFO',
        payload: { customDomain: '', custom_domain: '' }
      });
      setAlert({ type: 'info', text: 'تمت إزالة النطاق المخصص بنجاح.' });
      setTimeout(() => setAlert(null), 3000);
      return;
    }

    if (!isInputValid) {
      setAlert({ type: 'error', text: 'يرجى إدخال اسم نطاق صحيح (مثل clinic.com أو booking.clinic.com)' });
      return;
    }

    const updated = {
      domain: cleanDomain,
      sslStatus: domainConfig.domain === cleanDomain ? domainConfig.sslStatus : DOMAIN_STATUS.PENDING_DNS,
      verifiedAt: domainConfig.domain === cleanDomain ? domainConfig.verifiedAt : null
    };

    setDomainConfig(updated);
    saveClinicDomainSettings(clinicId, updated);

    dispatch({
      type: 'UPDATE_CLINIC_INFO',
      payload: { customDomain: cleanDomain, custom_domain: cleanDomain }
    });

    setAlert({ type: 'success', text: 'تم حفظ النطاق المخصص. يرجى توجيه سجلات الـ DNS أدناه.' });
    setTimeout(() => setAlert(null), 3500);
  };

  const handleVerifyDnsAndSsl = async () => {
    if (!cleanDomain || !isInputValid) {
      setAlert({ type: 'error', text: 'يرجى كتابة دومين صالح قبل بدء الفحص.' });
      return;
    }

    setIsVerifying(true);
    setAlert(null);

    try {
      const result = await verifyDomainDnsAndSsl(cleanDomain, clinicId);
      const updated = {
        domain: cleanDomain,
        sslStatus: result.sslStatus,
        verifiedAt: result.verifiedAt || null,
        lastChecked: new Date().toISOString()
      };

      setDomainConfig(updated);
      saveClinicDomainSettings(clinicId, updated);

      if (result.sslStatus === DOMAIN_STATUS.ACTIVE) {
        setAlert({ type: 'success', text: 'مبروك! تم التحقق من الـ DNS بنجاح، وشهادة الـ SSL مفعلة ونشطة.' });
      } else {
        setAlert({ type: 'error', text: result.message || 'السجلات لم تتطابق بعد. يرجى مراجعة مزود النطاق الخاص بك.' });
      }
    } catch (err) {
      setAlert({ type: 'error', text: 'حدث خطأ أثناء الاتصال بالخادم: ' + err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case DOMAIN_STATUS.ACTIVE:
        return (
          <span className="domain-status-badge active">
            <ShieldCheck size={16} />
            مفعل ومحمي بشهادة SSL (TLS 1.3)
          </span>
        );
      case DOMAIN_STATUS.PENDING_DNS:
        return (
          <span className="domain-status-badge pending_dns">
            <Clock size={16} />
            بانتظار توجيه سجلات الـ DNS
          </span>
        );
      case DOMAIN_STATUS.VERIFYING:
        return (
          <span className="domain-status-badge verifying">
            <RefreshCw size={16} className="spin" />
            جارٍ فحص الانتشار وتوليد الشهادة
          </span>
        );
      case DOMAIN_STATUS.ERROR:
        return (
          <span className="domain-status-badge error">
            <AlertCircle size={16} />
            خطأ في إعدادات السجلات
          </span>
        );
      default:
        return (
          <span className="domain-status-badge unconfigured">
            <Globe size={16} />
            غير مربوط بنطاق مخصص
          </span>
        );
    }
  };

  return (
    <div className="settings-section custom-domain-tab">
      <div className="section-header">
        <div>
          <h3>إدارة الدومين المخصص والشهادات الأمنية (Custom Domain & SSL)</h3>
          <p>
            اربط موقع وحجوزات عيادتك بنطاقك التجاري الخاص، مع توليد فوري وتلقائي لشهادات التشفير العالمية مجاناً (Let's Encrypt / TLS 1.3).
          </p>
        </div>
      </div>

      {alert && (
        <div className={`settings-alert ${alert.type === 'success' ? 'success' : 'error'}`}>
          {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{alert.text}</span>
        </div>
      )}

      {/* Domain Entry Card */}
      <div className="domain-status-card">
        <div className="domain-status-info">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>حالة النطاق المخصص الحالية</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'monospace', direction: 'ltr' }}>
                {domainConfig.domain || 'لم يُحدد نطاق بعد'}
              </span>
              {getStatusBadge(domainConfig.sslStatus)}
            </div>
          </div>
        </div>

        {domainConfig.domain && (
          <a
            href={`https://${domainConfig.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ExternalLink size={16} />
            زيارة الموقع
          </a>
        )}
      </div>

      {/* Domain Input Form */}
      <div className="settings-card">
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 700 }}>
          تعيين أو تغيير النطاق المخصص
        </h4>
        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          أدخل اسم النطاق التجاري الخاص بك (مثل: <code style={{ direction: 'ltr', display: 'inline-block' }}>dr-sara.com</code> أو <code style={{ direction: 'ltr', display: 'inline-block' }}>booking.dr-sara.com</code>).
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>تجربة سريعة:</span>
          <button
            type="button"
            className="demo-domain-chip"
            onClick={() => setDomainInput('dr-ahmed-dental.com')}
            style={{
              background: 'var(--surface-container, #F0F4F9)',
              border: '1px solid var(--border-color, #DADCE0)',
              borderRadius: '16px',
              padding: '0.25rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#0B57D0',
              fontFamily: 'monospace'
            }}
          >
            dr-ahmed-dental.com
          </button>
          <button
            type="button"
            className="demo-domain-chip"
            onClick={() => setDomainInput('drsara-clinic.com')}
            style={{
              background: 'var(--surface-container, #F0F4F9)',
              border: '1px solid var(--border-color, #DADCE0)',
              borderRadius: '16px',
              padding: '0.25rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#0B57D0',
              fontFamily: 'monospace'
            }}
          >
            drsara-clinic.com
          </button>
        </div>

        <form onSubmit={handleSaveDomain}>
          <div className="domain-input-box">
            <div className="domain-input-wrapper">
              <span className="domain-input-prefix">https://</span>
              <input
                type="text"
                className="domain-input-field"
                placeholder="clinic-domain.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
              />
            </div>

            <div className="domain-actions-group">
              <button type="submit" className="btn btn-primary">
                حفظ النطاق
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleVerifyDnsAndSsl}
                disabled={isVerifying || !cleanDomain}
              >
                {isVerifying ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    جارٍ التحقق...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    فحص الـ DNS والـ SSL
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* SSL Certificate Details Banner (when ACTIVE) */}
      {domainConfig.sslStatus === DOMAIN_STATUS.ACTIVE && (
        <div className="settings-card" style={{ border: '1.5px solid #A7F3D0', background: '#F0FDF4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: '#166534', fontSize: '1.05rem', fontWeight: 800 }}>
                شهادة الأمان SSL نشطة ومحمية بالكامل
              </h4>
              <span style={{ fontSize: '0.84rem', color: '#15803D' }}>
                النطاق يعمل الآن ببروتوكول HTTPS المشفر بتوافق كامل مع معايير الأمان العالمية
              </span>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', background: '#FFFFFF', padding: '1rem', borderRadius: '12px', border: '1px solid #BBF7D0', fontSize: '0.84rem' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.76rem', marginBottom: '2px' }}>نوع التشفير</span>
              <strong style={{ color: '#166534' }}>TLS 1.3 / ECC 256-bit</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.76rem', marginBottom: '2px' }}>جهة الإصدار التلقائي</span>
              <strong style={{ color: '#166534' }}>Let's Encrypt / Cloudflare Edge</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.76rem', marginBottom: '2px' }}>التجديد التلقائي</span>
              <strong style={{ color: '#166534' }}>مفعل آلياً (Auto-Renew)</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.76rem', marginBottom: '2px' }}>وضع العزل للعيادة</span>
              <strong style={{ color: '#0B57D0' }}>مفعل (White-Label Dedicated)</strong>
            </div>
          </div>
        </div>
      )}

      {/* Required DNS Records Table */}
      {cleanDomain && (
        <div className="settings-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', fontWeight: 750 }}>
                سجلات الـ DNS المطلوبة في لوحة تحكم النطاق
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                توجه إلى لوحة تحكم مزود النطاق (Cloudflare, GoDaddy, Namecheap) وأضف السجلات التالية:
              </p>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              تشفير آمن TLS 1.3 مع حماية ضد هجمات حجب الخدمة DDoS
            </span>
          </div>

          <div className="dns-table-container">
            <table className="dns-table">
              <thead>
                <tr>
                  <th>النوع (Type)</th>
                  <th>اسم المضيف (Name / Host)</th>
                  <th>القيمة الموجه إليها (Target / Value)</th>
                  <th>TTL</th>
                  <th>نسخ</th>
                </tr>
              </thead>
              <tbody>
                {requiredRecords.map((rec, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="dns-record-tag">{rec.type}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', direction: 'ltr', display: 'inline-block', fontWeight: 700 }}>
                        {rec.name}
                      </span>
                    </td>
                    <td>
                      <div className="dns-value-cell">
                        <span>{rec.value}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{rec.ttl}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`copy-dns-btn ${copiedKey === `${rec.type}-${rec.name}` ? 'copied' : ''}`}
                        onClick={() => handleCopy(rec.value, `${rec.type}-${rec.name}`)}
                        title="نسخ القيمة"
                      >
                        {copiedKey === `${rec.type}-${rec.name}` ? (
                          <>
                            <Check size={14} />
                            <span>تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Guide Box */}
      <div className="dns-guide-box">
        <h4>
          <HelpCircle size={18} color="var(--primary)" />
          خطوات تفعيل النطاق والشهادة الأمنية بنجاح
        </h4>
        <ol className="dns-guide-steps">
          <li>انسخ سجلات الـ DNS الموضحة في الجدول أعلاه وأضفها في لوحة تحكم الدومين الخاص بك.</li>
          <li>إذا كان نطاقك الرئيسي (مثل <code style={{ direction: 'ltr', display: 'inline-block' }}>dr-sara.com</code>)، احرص على إضافة سجل الـ A وسجل CNAME لـ www معاً.</li>
          <li>بعد حفظ السجلات، انقر على زر "فحص الـ DNS والـ SSL". سيقوم محرك ClinicFlow بفحص انتشار السجلات عالمياً عبر خوادم Cloudflare الآمنة.</li>
          <li>بمجرد اكتمال الفحص بنجاح، يتم تفعيل شهادة SSL مجانية وتوجيه جميع الزوار إلى الاتصال المشفر HTTPS تلقائياً.</li>
        </ol>
      </div>
    </div>
  );
}
