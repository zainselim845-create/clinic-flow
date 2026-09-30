import React, { useState } from 'react';
import { ShieldCheck, Check } from 'lucide-react';
import { getGoogleClientId, saveGoogleClientId, getGoogleOAuthSetupInfo } from '../../../../services/googleAuthService';
import { copyToClipboard } from '../../../../utils/clipboard';

export function GoogleOAuthTab() {
  const [googleClientId, setGoogleClientIdState] = useState(() => getGoogleClientId());
  const [googleSaveSuccess, setGoogleSaveSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const setupInfo = getGoogleOAuthSetupInfo();

  const handleSaveGoogleOAuth = (e) => {
    e.preventDefault();
    saveGoogleClientId(googleClientId);
    setGoogleSaveSuccess(true);
    setTimeout(() => setGoogleSaveSuccess(false), 2500);
  };

  const handleCopyText = async (key, text) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  return (
    <div className="infra-content-pane">
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem' }}>إعدادات تسجيل الدخول الموحد (Google OAuth 2.0 & Platform Identity)</h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          تهيئة معرف العميل الموحد (Google Client ID) لتمكين أطباء وطواقم المنصة من تسجيل الدخول الآمن بنقرة واحدة عبر السحابة.
        </p>
      </div>

      <form onSubmit={handleSaveGoogleOAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '650px' }}>
        <div className="form-group">
          <label style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block' }}>
            معرّف عميل Google (OAuth 2.0 Client ID):
          </label>
          <input
            type="text"
            dir="ltr"
            className="input-field"
            value={googleClientId}
            onChange={(e) => setGoogleClientIdState(e.target.value)}
            placeholder="مثال: 337379604098-xxx.apps.googleusercontent.com"
            style={{ width: '100%', height: '42px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary">
            <Check size={16} />
            <span>حفظ إعدادات Google OAuth المركزية</span>
          </button>
          {googleSaveSuccess && (
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>
              تم حفظ Google Client ID وتطبيقه على كافة العيادات بنجاح!
            </span>
          )}
        </div>
      </form>

      {/* Setup Guide for Google Cloud Console */}
      <div style={{ marginTop: '2rem', background: 'var(--surface-container, #F8FAFC)', border: '1px solid var(--border-color, #E2E8F0)', borderRadius: '12px', padding: '1.25rem', maxWidth: '650px' }}>
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
          الروابط المعتمدة للربط في Google Cloud Credentials:
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Authorized JavaScript Origins:</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF', border: '1px solid var(--border-color)', padding: '0.5rem 0.75rem', borderRadius: '8px', marginTop: '0.25rem' }}>
              <code style={{ fontSize: '0.8rem', direction: 'ltr' }}>{setupInfo.origin}</code>
              <button type="button" onClick={() => handleCopyText('google-origin', setupInfo.origin)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                {copiedKey === 'google-origin' ? 'تم النسخ' : 'نسخ'}
              </button>
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Authorized Redirect URIs:</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF', border: '1px solid var(--border-color)', padding: '0.5rem 0.75rem', borderRadius: '8px', marginTop: '0.25rem' }}>
              <code style={{ fontSize: '0.8rem', direction: 'ltr' }}>{setupInfo.loginRedirect}</code>
              <button type="button" onClick={() => handleCopyText('google-redirect', setupInfo.loginRedirect)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                {copiedKey === 'google-redirect' ? 'تم النسخ' : 'نسخ'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
