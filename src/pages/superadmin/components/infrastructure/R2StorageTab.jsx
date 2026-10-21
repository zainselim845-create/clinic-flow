import React, { useState } from 'react';
import { Cloud, Check, RefreshCw, Database, ShieldCheck, ExternalLink, HardDrive } from 'lucide-react';
import { getR2Config, saveR2Config, testR2Connection, isR2Configured } from '@/features/platform/services/r2StorageService';
import { toast } from '@/lib/toast';

export function R2StorageTab() {
  const [config, setConfig] = useState(() => getR2Config());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    saveR2Config(config);
    setSaveSuccess(true);
    toast.success('تم حفظ إعدادات Cloudflare R2 بنجاح!');
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testR2Connection(config);
      setTestResult(res);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      setTestResult({ success: false, message: `فشل الاتصال: ${err.message}` });
      toast.error('حدث خطأ أثناء اختبار الاتصال بـ Cloudflare R2');
    } finally {
      setTesting(false);
    }
  };

  const configured = isR2Configured();

  return (
    <div className="infra-content-pane">
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <Cloud size={24} style={{ color: '#F38020' }} />
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>التخزين السحابي عالي السرعة (Cloudflare R2 Object Storage)</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            تخزين سحابي متوافق مع S3 بدون أي رسوم لنقل البيانات (Zero Egress Fees) لحفظ أشعة المرضى، التقارير الطبية، وشعارات العيادات والنسخ الاحتياطية.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            backgroundColor: configured ? '#ECFDF5' : '#FFFBEB',
            color: configured ? '#065F46' : '#92400E',
            border: `1px solid ${configured ? '#A7F3D0' : '#FDE68A'}`
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: configured ? '#10B981' : '#F59E0B' }} />
            {configured ? 'R2 متصل ونشط سحابياً' : 'وضع التخزين المحلي الآمن (Fallback)'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <ShieldCheck size={18} style={{ color: '#10B981' }} />
            <strong style={{ fontSize: '0.88rem' }}>عزل تام بين العيادات (Multi-Tenant Isolation)</strong>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            تُفصل ملفات كل عيادة تلقائياً في مسار معزول ومشفّر: <code dir="ltr">/clinics/{'{clinic_id}'}/...</code>
          </p>
        </div>

        <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <HardDrive size={18} style={{ color: '#3B82F6' }} />
            <strong style={{ fontSize: '0.88rem' }}>صفر تكلفة لنقل البيانات (Zero Egress Fees)</strong>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            تحميل وعرض صور الأشعة والملفات الطبية ملايين المرات دون احتساب أي تكلفة باندويث من Cloudflare.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '750px' }}>
        <div className="form-group">
          <label style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block' }}>
            معرّف الحساب في كلاود فلير (Cloudflare Account ID):
          </label>
          <input
            type="text"
            dir="ltr"
            className="input-field"
            value={config.accountId}
            onChange={(e) => setConfig({ ...config, accountId: e.target.value })}
            placeholder="مثال: e4b238a912c93d8e57f12a3456789abc"
            style={{ width: '100%', height: '42px' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block' }}>
              مفتاح الوصول (Access Key ID):
            </label>
            <input
              type="text"
              dir="ltr"
              className="input-field"
              value={config.accessKeyId}
              onChange={(e) => setConfig({ ...config, accessKeyId: e.target.value })}
              placeholder="مثال: 9c0e5a882... (من R2 API Tokens)"
              style={{ width: '100%', height: '42px' }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block' }}>
              المفتاح السري (Secret Access Key):
            </label>
            <input
              type="password"
              dir="ltr"
              className="input-field"
              value={config.secretAccessKey}
              onChange={(e) => setConfig({ ...config, secretAccessKey: e.target.value })}
              placeholder="••••••••••••••••••••••••••••••••"
              style={{ width: '100%', height: '42px' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block' }}>
              اسم سلة التخزين (Bucket Name):
            </label>
            <input
              type="text"
              dir="ltr"
              className="input-field"
              value={config.bucketName}
              onChange={(e) => setConfig({ ...config, bucketName: e.target.value })}
              placeholder="smart-clinic-storage"
              style={{ width: '100%', height: '42px' }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block' }}>
              النطاق العام المخصص (Public Custom Domain - اختياري):
            </label>
            <input
              type="text"
              dir="ltr"
              className="input-field"
              value={config.publicDomain}
              onChange={(e) => setConfig({ ...config, publicDomain: e.target.value })}
              placeholder="مثال: cdn.smartclinic.app أو r2.smartclinic.app"
              style={{ width: '100%', height: '42px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>
            <Check size={16} />
            <span>حفظ إعدادات Cloudflare R2</span>
          </button>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="btn btn-secondary"
            style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={16} className={testing ? 'animate-spin' : ''} />
            <span>{testing ? 'جارِ فحص الاتصال بالسلة...' : 'اختبار الاتصال بالسلة (Ping R2)'}</span>
          </button>

          {saveSuccess && (
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>
              تم حفظ الإعدادات وتطبيقها بنجاح!
            </span>
          )}
        </div>

        {testResult && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginTop: '0.5rem',
            backgroundColor: testResult.success ? '#ECFDF5' : '#FEF2F2',
            color: testResult.success ? '#065F46' : '#991B1B',
            border: `1px solid ${testResult.success ? '#A7F3D0' : '#FECACA'}`
          }}>
            {testResult.message}
          </div>
        )}
      </form>

      <div style={{ marginTop: '2rem', padding: '1rem', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', maxWidth: '750px' }}>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.92rem' }}>طريقة الحصول على مفاتيح R2 من لوحة Cloudflare:</h4>
        <ol style={{ margin: 0, paddingRight: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
          <li>افتح لوحة تحكم <strong>Cloudflare Dashboard</strong> واختر <strong>R2 Object Storage</strong>.</li>
          <li>أنشئ سلة جديدة باسم (مثلاً: <code>smart-clinic-storage</code>).</li>
          <li>من القائمة الجانبية، اختر <strong>Manage R2 API Tokens</strong> ثم <strong>Create API Token</strong>.</li>
          <li>حدد الصلاحيات كـ <strong>Admin Read & Write</strong> ثم انسخ <strong>Access Key ID</strong> و <strong>Secret Access Key</strong> و <strong>Account ID</strong> والصقهم هنا.</li>
        </ol>
      </div>
    </div>
  );
}
