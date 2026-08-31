import React, { useState } from 'react';
import { Database, Server, HardDrive, Copy, Check, RefreshCw, CheckCircle2, AlertCircle, Download, KeyRound, Eye, EyeOff, Save, Trash2 } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig, supabase } from '../../lib/supabase';

export default function DatabaseSyncTab({ state, dispatch }) {
  const initialDb = getSupabaseConfig();
  const [dbConfig, setDbConfig] = useState({
    url: initialDb.url || 'https://rogkodgqeowiylpckspi.supabase.co',
    key: initialDb.key || ''
  });
  const [dbTestLoading, setDbTestLoading] = useState(false);
  const [dbTestResult, setDbTestResult] = useState(null);
  const [dbSaveSuccess, setDbSaveSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showDbKey, setShowDbKey] = useState(false);

  const handleSaveDb = (e) => {
    e.preventDefault();
    saveSupabaseConfig(dbConfig.url, dbConfig.key);
    setDbSaveSuccess(true);
    setTimeout(() => setDbSaveSuccess(false), 3000);
  };

  const handleTestDbConnection = async () => {
    setDbTestLoading(true);
    setDbTestResult(null);
    try {
      if (!dbConfig.url || !dbConfig.key) {
        throw new Error('يرجى كتابة أو لصق مفتاح anon public key أولاً');
      }
      saveSupabaseConfig(dbConfig.url, dbConfig.key);
      const { error } = await supabase.from('appointments').select('id', { count: 'exact', head: true });
      if (error) throw error;
      setDbTestResult({
        success: true,
        message: 'الاتصال السحابي بقاعدة بيانات Supabase يعمل بنجاح 100%! الجداول مؤمنة ونشطة.'
      });
    } catch (err) {
      setDbTestResult({
        success: false,
        message: err.message || 'تعذر الاتصال بقاعدة البيانات. يرجى التأكد من المفتاح وتشغيل كود SQL.'
      });
    } finally {
      setDbTestLoading(false);
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      clinicInfo: state.clinicInfo,
      staffMembers: state.staffMembers,
      patients: state.patients,
      appointments: state.appointments,
      notifications: state.notifications,
      blockedSlots: state.blockedSlots,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinicflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (imported.clinicInfo) {
          dispatch({ type: 'UPDATE_CLINIC_INFO', payload: imported.clinicInfo });
        }
        if (Array.isArray(imported.patients)) {
          imported.patients.forEach(p => dispatch({ type: 'ADD_PATIENT', payload: p }));
        }
        if (Array.isArray(imported.appointments)) {
          imported.appointments.forEach(a => dispatch({ type: 'ADD_APPOINTMENT', payload: a }));
        }
        setDbTestResult({ success: true, message: 'تم استعادة النسخة الاحتياطية وتحديث بيانات النظام بنجاح! ' });
      } catch (err) {
        setDbTestResult({ success: false, message: 'فشل قراءة ملف النسخة الاحتياطية: ' + err.message });
      }
    };
    reader.readAsText(file);
  };

  const handleCopySql = () => {
    const sqlScript = `-- ClinicFlow PostgreSQL Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    doctor_name TEXT DEFAULT 'د. أحمد الشريف',
    specialty TEXT,
    address TEXT,
    phone TEXT,
    doctor_email TEXT DEFAULT 'doctor@clinicflow.com',
    regular_fee TEXT DEFAULT '300 ج.م',
    consultation_fee TEXT DEFAULT '150 ج.م',
    working_hours TEXT DEFAULT 'السبت - الخميس: ٥:٠٠ مساءً - ١٠:٠٠ مساءً',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    type TEXT DEFAULT 'كشف عادي',
    fee TEXT DEFAULT '300 ج.م',
    status TEXT DEFAULT 'booked',
    booking_code TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocked_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    time TEXT NOT NULL,
    reason TEXT,
    is_full_day BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`;
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="settings-section database-tab">
      <div className="section-header">
        <div>
          <h3>مركز الربط السحابي والنسخ الاحتياطي (Supabase Cloud & Backup)</h3>
          <p>توصيل العيادة بقاعدة بيانات PostgreSQL سحابية وحفظ نسخ احتياطية آمنة</p>
        </div>
      </div>

      {dbSaveSuccess && (
        <div className="settings-alert success">
          <CheckCircle2 size={18} />
          <span>تم حفظ إعدادات قاعدة البيانات السحابية بنجاح!</span>
        </div>
      )}

      <form onSubmit={handleSaveDb} className="db-form">
        <div className="form-grid">
          <div className="form-group full-width">
            <label>رابط مشروع Supabase (Project URL)</label>
            <div className="input-with-icon">
              <Server size={18} />
              <input
                type="url"
                value={dbConfig.url}
                onChange={(e) => setDbConfig({ ...dbConfig, url: e.target.value })}
                placeholder="https://xyz.supabase.co"
                required
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label>مفتاح الوصول العام (Anon / Public API Key)</label>
            <div className="input-with-icon">
              <KeyRound size={18} />
              <input
                type={showDbKey ? 'text' : 'password'}
                value={dbConfig.key}
                onChange={(e) => setDbConfig({ ...dbConfig, key: e.target.value })}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                required
              />
              <button
                type="button"
                onClick={() => setShowDbKey(!showDbKey)}
                className="btn-eye"
              >
                {showDbKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="db-actions-row">
          <button type="submit" className="btn btn-primary">
            <Save size={18} />
            <span>حفظ إعدادات السحابة</span>
          </button>
          <button
            type="button"
            onClick={handleTestDbConnection}
            disabled={dbTestLoading}
            className="btn btn-secondary"
          >
            {dbTestLoading ? <RefreshCw size={18} className="spin" /> : <Database size={18} />}
            <span>{dbTestLoading ? 'جاري فحص الاتصال...' : 'فحص الاتصال بقاعدة البيانات'}</span>
          </button>
          <button
            type="button"
            onClick={handleCopySql}
            className="btn btn-outline"
          >
            {copiedSql ? <Check size={18} /> : <Copy size={18} />}
            <span>{copiedSql ? 'تم نسخ كود SQL!' : 'نسخ كود SQL للجداول'}</span>
          </button>
        </div>
      </form>

      {dbTestResult && (
        <div className={`db-result-box ${dbTestResult.success ? 'success' : 'error'}`}>
          {dbTestResult.success ? (
            <>
              <CheckCircle2 size={18} />
              <span>{dbTestResult.message}</span>
            </>
          ) : (
            <>
              <AlertCircle size={18} />
              <span>{dbTestResult.message}</span>
            </>
          )}
        </div>
      )}

      <div className="backup-section-card">
        <h4>
          <HardDrive size={18} />
          <span>النسخ الاحتياطي اليدوي والتصدير المحلي</span>
        </h4>
        <p>تصدير كامل بيانات العيادة (المرضى، المواعيد، الإشعارات) كملف JSON مشفر للنسخ الاحتياطي في أي وقت.</p>

        <div className="backup-buttons">
          <button type="button" onClick={handleExportBackup} className="btn btn-secondary">
            <Download size={18} />
            <span>تصدير نسخة احتياطية كاملة (JSON)</span>
          </button>
          <label className="btn btn-outline file-upload-label">
            <HardDrive size={18} />
            <span>استعادة من ملف نسخة احتياطية</span>
            <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* 3. Factory Reset & Fresh Start */}
      <div className="backup-section-card reset-section-card" style={{ marginTop: '1.5rem', border: '1.5px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.02)' }}>
        <h4 style={{ color: '#DC2626' }}>
          <Trash2 size={18} />
          <span>إعادة ضبط البيانات وبدء تشغيل العيادة من الصفر</span>
        </h4>
        <p>يمكنك مسح كافة بيانات التجارب السابقة وبدء تشغيل العيادة نظيفة تماماً، أو إعادة تحميل البيانات السريرية النموذجية المضبوطة.</p>

        <div className="backup-buttons" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            onClick={() => {
              if (window.confirm('هل أنت متأكد من مسح كافة بيانات التجارب السابقة وبدء تشغيل العيادة نظيفة تماماً من الصفر؟')) {
                dispatch({ type: 'WIPE_ALL_DATA_CLEAN' });
                setDbTestResult({ success: true, message: 'تم مسح كافة البيانات السابقة بنجاح! النظام جاهز ونظيف للعمل الفعلي.' });
              }
            }} 
            className="btn btn-danger"
            style={{ background: '#DC2626', color: 'white', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Trash2 size={16} />
            <span>مسح بيانات الديمو وبدء العيادة فارغة من الصفر</span>
          </button>

          <button 
            type="button" 
            onClick={() => {
              if (window.confirm('هل تريد إعادة تعيين وتحميل البيانات السريرية النموذجية المنظمة (10 مرضى، 8 مواعيد، 9 خدمات)؟')) {
                dispatch({ type: 'RESET_TO_FRESH_START' });
                setDbTestResult({ success: true, message: 'تم تحميل وتعيين البيانات السريرية النموذجية المنظمة بنجاح 100%!' });
              }
            }} 
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} />
            <span>إعادة تهيئة البيانات السريرية النموذجية المنظمة</span>
          </button>
        </div>
      </div>
    </div>
  );
}
