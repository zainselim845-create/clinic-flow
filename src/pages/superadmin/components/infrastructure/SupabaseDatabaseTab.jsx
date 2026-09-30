import React, { useState } from 'react';
import { Database, ShieldCheck, Download, CheckCircle2, Check, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig } from '../../../../lib/supabase';
import { getRegisteredTenants, getAllPlatformUsers } from '../../../../services/authService';

export function SupabaseDatabaseTab({ allTenants = [] }) {
  const [dbConfig, setDbConfig] = useState(() => getSupabaseConfig());
  const [dbSaveSuccess, setDbSaveSuccess] = useState(false);
  const [dbTesting, setDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState(null);
  const [showDbKey, setShowDbKey] = useState(false);

  const handleExportPlatformBackup = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        platform: 'ClinicFlow B2B SaaS',
        version: '2.5.0',
        tenants: getRegisteredTenants(),
        users: getAllPlatformUsers(),
        systemStats: {
          totalTenants: allTenants.length,
          storageStatus: 'isolated_per_tenant'
        }
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clinicflow_platform_master_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export platform backup:', err);
      alert('فشل تصدير النسخة الاحتياطية للمنصة.');
    }
  };

  const handleSaveDb = (e) => {
    e.preventDefault();
    saveSupabaseConfig(dbConfig.url, dbConfig.key);
    setDbSaveSuccess(true);
    setTimeout(() => setDbSaveSuccess(false), 3000);
  };

  const handleTestDb = async () => {
    setDbTesting(true);
    setDbTestResult(null);
    try {
      if (!dbConfig.url || !dbConfig.key) {
        throw new Error('يرجى ملء بيانات الرابط ومفتاح الاتصال أولاً.');
      }
      const res = await fetch(`${dbConfig.url}/rest/v1/`, {
        headers: {
          apikey: dbConfig.key,
          Authorization: `Bearer ${dbConfig.key}`
        }
      });
      if (res.ok || res.status === 200 || res.status === 404) {
        setDbTestResult({ success: true, message: 'الاتصال بقاعدة بيانات Supabase يعمل بنجاح!' });
      } else {
        setDbTestResult({ success: false, message: `فشل التحقق: رمز الاستجابة ${res.status}` });
      }
    } catch (err) {
      setDbTestResult({ success: false, message: err.message || 'تعذر الاتصال بالسحابة.' });
    } finally {
      setDbTesting(false);
    }
  };

  return (
    <div className="infra-content-pane">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem' }}>إدارة السحابة وقواعد البيانات (PostgreSQL & Multi-Tenancy)</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            ربط كافة عيادات المنصة بقاعدة بيانات PostgreSQL موحدة مع عزل أمان RLS صارم لكل مستأجر.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportPlatformBackup}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderColor: '#10B981', color: '#047857', background: '#ECFDF5' }}
        >
          <Download size={16} />
          <span>تصدير نسخة احتياطية لكافة عيادات المنصة (JSON)</span>
        </button>
      </div>

      <form onSubmit={handleSaveDb} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            رابط مشروع Supabase (Project URL):
          </label>
          <input
            type="text"
            placeholder="https://xyzcompany.supabase.co"
            dir="ltr"
            value={dbConfig.url || ''}
            onChange={(e) => setDbConfig({ ...dbConfig, url: e.target.value })}
            className="input-field"
            style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            مفتاح الوصول العام (Anon / Public API Key):
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showDbKey ? 'text' : 'password'}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              dir="ltr"
              value={dbConfig.key || ''}
              onChange={(e) => setDbConfig({ ...dbConfig, key: e.target.value })}
              className="input-field"
              style={{ width: '100%', padding: '0.6rem 2.5rem 0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
            />
            <button
              type="button"
              onClick={() => setShowDbKey(prev => !prev)}
              style={{
                position: 'absolute',
                right: '0.6rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                padding: '0.2rem'
              }}
              title={showDbKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
              aria-label={showDbKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
            >
              {showDbKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary">
            {dbSaveSuccess ? <Check size={16} /> : <CheckCircle2 size={16} />}
            <span>{dbSaveSuccess ? 'تم الحفظ بنجاح!' : 'حفظ إعدادات السحابة'}</span>
          </button>

          <button
            type="button"
            onClick={handleTestDb}
            disabled={dbTesting}
            className="btn btn-secondary"
          >
            <RefreshCw size={14} className={dbTesting ? 'animate-spin' : ''} />
            <span>{dbTesting ? 'جاري الفحص...' : 'فحص الاتصال بقاعدة البيانات'}</span>
          </button>

          {dbTestResult && (
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: dbTestResult.success ? '#059669' : '#DC2626' }}>
              {dbTestResult.message}
            </span>
          )}
        </div>
      </form>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', color: 'var(--text-primary)' }}>جداول المنصة المركزية وحصانة العزل:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {['clinics (العيادات)', 'users (المستخدمين)', 'appointments (المواعيد)', 'patients (المرضى)', 'invoices (الفواتير)', 'labs (المعامل)', 'inventory (المخزون)', 'attendance (الحضور)'].map((tbl, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
              <ShieldCheck size={14} color="#10B981" />
              <span>{tbl}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
