import React from 'react';
import { CreditCard, Smartphone } from 'lucide-react';

export default function EgyptianPaymentSection({ clinicForm, setClinicForm }) {
  return (
    <div className="form-group full-width" style={{
      background: 'var(--surface-container, #F8FAFC)',
      border: '1.5px solid var(--border-color)',
      borderRadius: '12px',
      padding: '1.25rem',
      marginTop: '0.75rem',
      marginBottom: '0.5rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'rgba(16, 185, 129, 0.1)',
          color: '#10B981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <CreditCard size={20} />
        </div>
        <div>
          <h5 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            قنوات الدفع الرقمية والتحويل اللحظي (InstaPay & Mobile Wallets)
          </h5>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            تفعيل حسابات التحويل الإلكتروني لتظهر مباشرة للمرضى في تذاكر وصفحات الحجز
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        <div>
          <label htmlFor="instapayIpa" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            عنوان الدفع اللحظي إنستاباي (InstaPay IPA Address)
          </label>
          <div className="input-with-icon">
            <CreditCard size={16} />
            <input
              id="instapayIpa"
              name="instapayIpa"
              type="text"
              dir="ltr"
              value={clinicForm.instapayIpa || ''}
              onChange={(e) => setClinicForm({ ...clinicForm, instapayIpa: e.target.value })}
              placeholder="doctor-name@instapay"
              style={{ fontSize: '0.82rem' }}
            />
          </div>
          <small style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
            مثال: dr-ahmed@instapay أو رقم الهاتف المسجل بشبكة المدفوعات اللحظية IPN
          </small>
        </div>

        <div>
          <label htmlFor="cashWalletPhone" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            رقم محفظة الكاش (Vodafone / Orange / Etisalat / WE Cash)
          </label>
          <div className="input-with-icon">
            <Smartphone size={16} />
            <input
              id="cashWalletPhone"
              name="cashWalletPhone"
              type="tel"
              dir="ltr"
              value={clinicForm.cashWalletPhone || ''}
              onChange={(e) => setClinicForm({ ...clinicForm, cashWalletPhone: e.target.value })}
              placeholder="01006285031"
              style={{ fontSize: '0.82rem' }}
            />
          </div>
          <small style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
            الرقم الذي يستقبل عليه المركز تحويلات فودافون كاش أو المحافظ الذكية
          </small>
        </div>
      </div>
    </div>
  );
}
