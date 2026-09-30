import React, { useState } from 'react';
import { 
  Database, Server, ShieldCheck, CheckCircle2, 
  Smartphone, Sparkles, Globe, CreditCard, Zap 
} from 'lucide-react';
import { useTenant } from '../../../context/TenantContext';
import { 
  SupabaseDatabaseTab, 
  SmsGatewaysTab, 
  AiCoreTab, 
  CustomDomainsTab, 
  SubscriptionPlansTab, 
  GoogleOAuthTab, 
  Resilience100MTab 
} from './infrastructure';

export function SaasInfrastructureCenter({ allTenants = [] }) {
  const [subTab, setSubTab] = useState('database');
  const { updateTenantDomain, updateTenantInfo, updateTenantStatus, refreshTenants } = useTenant();

  return (
    <div className="saas-section-card" style={{ padding: '1.75rem' }}>
      <div style={{
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '12px',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        color: 'var(--text-primary)'
      }}>
        <CheckCircle2 size={20} color="#10B981" />
        <div>
          <strong style={{ display: 'block', fontSize: '0.92rem', color: '#059669' }}>
            منظومة الربط والـ APIs مُهيأة مسبقاً وتعمل تلقائياً (Zero-Configuration APIs):
          </strong>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            تم تزويد المنظومة مسبقاً بكافة المفاتيح (Supabase، محرك الذكاء الاصطناعي، وبوابات الرسائل المركزية). لا يُطلب من العميل أو الطبيب إدخال أي مفاتيح أو إعدادات برمجية.
          </span>
        </div>
      </div>

      <div className="saas-tabs-nav" style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setSubTab('database')}
          className={`saas-tab-btn ${subTab === 'database' ? 'active-tab' : ''}`}
        >
          <Database size={16} />
          <span>قاعدة بيانات Supabase المركزية</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('sms')}
          className={`saas-tab-btn ${subTab === 'sms' ? 'active-tab' : ''}`}
        >
          <Smartphone size={16} />
          <span>بوابات الرسائل المركزية (SMS Gateways)</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('ai')}
          className={`saas-tab-btn ${subTab === 'ai' ? 'active-tab' : ''}`}
        >
          <Sparkles size={16} />
          <span>محرك الذكاء الاصطناعي المركزي (AI Core)</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('domains')}
          className={`saas-tab-btn ${subTab === 'domains' ? 'active-tab' : ''}`}
        >
          <Globe size={16} />
          <span>الدومينات الخاصة والـ SSL (Custom Domains)</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('subscriptions')}
          className={`saas-tab-btn ${subTab === 'subscriptions' ? 'active-tab' : ''}`}
        >
          <CreditCard size={16} />
          <span>باقات الاشتراكات والترخيص (Subscription Plans)</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('auth')}
          className={`saas-tab-btn ${subTab === 'auth' ? 'active-tab' : ''}`}
        >
          <ShieldCheck size={16} />
          <span>المصادقة وGoogle OAuth (SSO)</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('resilience')}
          className={`saas-tab-btn ${subTab === 'resilience' ? 'active-tab' : ''}`}
        >
          <Zap size={16} />
          <span>المرونة وطوابير المعالجة (100M Scale)</span>
        </button>
      </div>

      {subTab === 'database' && <SupabaseDatabaseTab allTenants={allTenants} />}
      {subTab === 'sms' && <SmsGatewaysTab />}
      {subTab === 'ai' && <AiCoreTab />}
      {subTab === 'domains' && (
        <CustomDomainsTab 
          allTenants={allTenants} 
          updateTenantDomain={updateTenantDomain} 
        />
      )}
      {subTab === 'subscriptions' && (
        <SubscriptionPlansTab 
          allTenants={allTenants} 
          updateTenantInfo={updateTenantInfo} 
          updateTenantStatus={updateTenantStatus} 
          refreshTenants={refreshTenants} 
        />
      )}
      {subTab === 'auth' && <GoogleOAuthTab />}
      {subTab === 'resilience' && <Resilience100MTab />}
    </div>
  );
}
