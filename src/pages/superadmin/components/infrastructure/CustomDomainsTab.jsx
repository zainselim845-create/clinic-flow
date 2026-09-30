import React, { useState } from 'react';
import { Globe, CheckCheck, Copy, CheckCircle2, Check, RefreshCw } from 'lucide-react';
import { 
  DOMAIN_STATUS, 
  verifyDomainDnsAndSsl, 
  saveClinicDomainSettings, 
  sanitizeDomain 
} from '../../../../services/customDomainService';
import { copyToClipboard } from '../../../../utils/clipboard';

export function CustomDomainsTab({ allTenants = [], updateTenantDomain }) {
  const [domainInputs, setDomainInputs] = useState(() => {
    const map = {};
    allTenants.forEach(t => {
      map[t.id] = t.customDomain || t.custom_domain || '';
    });
    return map;
  });
  const [domainVerifying, setDomainVerifying] = useState({});
  const [domainResults, setDomainResults] = useState({});
  const [domainSaved, setDomainSaved] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopyText = async (key, text) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleSaveDomain = async (clinicId, domain) => {
    const cleaned = sanitizeDomain(domain);
    if (updateTenantDomain) {
      await updateTenantDomain(clinicId, cleaned);
    }
    saveClinicDomainSettings(clinicId, {
      domain: cleaned,
      sslStatus: cleaned ? DOMAIN_STATUS.PENDING_DNS : DOMAIN_STATUS.UNCONFIGURED,
      verifiedAt: null
    });
    setDomainSaved(prev => ({ ...prev, [clinicId]: true }));
    setTimeout(() => setDomainSaved(prev => ({ ...prev, [clinicId]: false })), 2500);
  };

  const handleVerifyDomain = async (clinicId, domain) => {
    const cleaned = sanitizeDomain(domain);
    if (!cleaned) return;
    setDomainVerifying(prev => ({ ...prev, [clinicId]: true }));
    try {
      const res = await verifyDomainDnsAndSsl(cleaned, clinicId);
      setDomainResults(prev => ({ ...prev, [clinicId]: res }));
      if (res.isValid && res.sslActive) {
        saveClinicDomainSettings(clinicId, {
          domain: cleaned,
          sslStatus: DOMAIN_STATUS.ACTIVE_SSL,
          verifiedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      setDomainResults(prev => ({ ...prev, [clinicId]: { isValid: false, message: err.message } }));
    } finally {
      setDomainVerifying(prev => ({ ...prev, [clinicId]: false }));
    }
  };

  return (
    <div className="infra-content-pane">
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem' }}>إدارة الدومينات الخاصة والـ SSL المركزية (Platform Custom Domains)</h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          تهيئة وربط الدومينات المخصصة لعيادات المنصة، وفحص سجلات DNS وتوليد شهادات الحماية SSL مباشرة من إدارة الساس.
        </p>
      </div>

      {/* DNS Configuration Guide Card */}
      <div style={{
        background: 'var(--surface-container, #F8FAFC)',
        border: '1px solid var(--border-color, #E2E8F0)',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
          سجلات الـ DNS المطلوبة لتوجيه الدومين إلى خوادم كلينيك فلو:
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'var(--surface, #FFF)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>CNAME</span>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.3rem' }}>cname.clinicflow.app</div>
            </div>
            <button
              type="button"
              onClick={() => handleCopyText('cname', 'cname.clinicflow.app')}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            >
              {copiedKey === 'cname' ? <CheckCheck size={14} color="#10B981" /> : <Copy size={14} />}
              <span>{copiedKey === 'cname' ? 'تم النسخ' : 'نسخ'}</span>
            </button>
          </div>

          <div style={{ background: 'var(--surface, #FFF)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10B981', background: '#ECFDF5', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>A Record</span>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.3rem' }}>76.76.21.21</div>
            </div>
            <button
              type="button"
              onClick={() => handleCopyText('a_record', '76.76.21.21')}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            >
              {copiedKey === 'a_record' ? <CheckCheck size={14} color="#10B981" /> : <Copy size={14} />}
              <span>{copiedKey === 'a_record' ? 'تم النسخ' : 'نسخ'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clinics Domain List Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        <table className="saas-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>العيادة والمستأجر</th>
              <th>الدومين المخصص (Custom Domain)</th>
              <th>حالة الـ SSL والاتصال</th>
              <th>إجراءات الربط والفحص</th>
            </tr>
          </thead>
          <tbody>
            {allTenants.map((tenant) => {
              const currentDomain = domainInputs[tenant.id] ?? (tenant.customDomain || tenant.custom_domain || '');
              const isVerifying = domainVerifying[tenant.id];
              const result = domainResults[tenant.id];
              const isSaved = domainSaved[tenant.id];
              const hasDomain = Boolean(tenant.customDomain || tenant.custom_domain);

              return (
                <tr key={tenant.id}>
                  <td>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{tenant.name}</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>/{tenant.slug}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '320px' }}>
                      <input
                        type="text"
                        dir="ltr"
                        placeholder="مثال: drsara-clinic.com"
                        value={currentDomain}
                        onChange={(e) => setDomainInputs(prev => ({ ...prev, [tenant.id]: e.target.value }))}
                        className="input-field"
                        style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', flex: 1 }}
                      />
                    </div>
                  </td>
                  <td>
                    {hasDomain ? (
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        background: '#ECFDF5',
                        color: '#047857',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <CheckCircle2 size={12} />
                        دومين نشط وموجّه
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)'
                      }}>
                        غير مهيأ
                      </span>
                    )}
                    {result && (
                      <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: result.isValid ? '#059669' : '#DC2626' }}>
                        {result.message || (result.isValid ? 'DNS & SSL سليم ومفعل!' : 'DNS لم يوجه بعد')}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleSaveDomain(tenant.id, currentDomain)}
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', borderRadius: '6px' }}
                      >
                        {isSaved ? <Check size={14} /> : <CheckCircle2 size={14} />}
                        <span>{isSaved ? 'تم الحفظ!' : 'حفظ'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyDomain(tenant.id, currentDomain)}
                        disabled={isVerifying || !currentDomain}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', borderRadius: '6px' }}
                      >
                        <RefreshCw size={13} className={isVerifying ? 'animate-spin' : ''} />
                        <span>{isVerifying ? 'جاري الفحص...' : 'فحص DNS'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
