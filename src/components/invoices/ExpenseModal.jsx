import React, { useState } from 'react';
import { 
  Receipt, 
  DollarSign, 
  Calendar, 
  CreditCard, 
  FileText, 
  Tag, 
  AlertCircle 
} from 'lucide-react';
import { Dialog } from '../ui/dialog';

const EXPENSE_CATEGORIES = [
  { id: 'خامات ومستلزمات طبية', label: 'خامات ومستلزمات طبية (شاش، قفازات، أدوية، مواد استهلاكية)' },
  { id: 'مصاريف معامل وتركيبات', label: 'مصاريف معامل وتحاليل وتركيبات خارجية' },
  { id: 'إيجار ومرافق', label: 'إيجار ومرافق (كهرباء، مياه، غاز، إنترنت)' },
  { id: 'رواتب وأجور', label: 'رواتب وأجور طاقم التمريض والسكرتارية' },
  { id: 'صيانة وتجهيزات', label: 'صيانة وتجهيزات الأجهزة الطبية والعيادة' },
  { id: 'بوفيه ونثريات', label: 'بوفيه ونثريات ومستلزمات نظافة وإداريات' },
  { id: 'أخرى', label: 'بنود ومصروفات تشغيلية أخرى' }
];

const PAYMENT_METHODS = [
  { id: 'cash', label: 'نقداً من خزينة العيادة' },
  { id: 'instapay', label: 'تحويل إنستاباي (InstaPay)' },
  { id: 'wallet', label: 'محفظة إلكترونية (فودافون كاش / أورنج / وي)' },
  { id: 'card', label: 'بطاقة دفع بنكية / ميزة / فيزا' }
];

export default function ExpenseModal({
  isOpen,
  onClose,
  onSaveExpense
}) {
  const todayStr = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].id);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].id);
  const [date, setDate] = useState(todayStr);
  const [receiptRef, setReceiptRef] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setCategory(EXPENSE_CATEGORIES[0].id);
    setPaymentMethod(PAYMENT_METHODS[0].id);
    setDate(todayStr);
    setReceiptRef('');
    setNotes('');
    setFormError('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanTitle = (title || '').trim();
    const numAmount = Number(amount);

    if (!cleanTitle) {
      setFormError('يرجى كتابة بيان أو اسم المصروف بوضوح.');
      return;
    }

    if (!numAmount || numAmount <= 0 || isNaN(numAmount)) {
      setFormError('يرجى تحديد مبلغ المصروف بشكل صحيح (أكبر من صفر).');
      return;
    }

    setIsSubmitting(true);
    try {
      const expensePayload = {
        id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: cleanTitle,
        amount: Math.round(numAmount * 100) / 100,
        category,
        paymentMethod,
        date: date || todayStr,
        receiptRef: (receiptRef || '').trim(),
        notes: (notes || '').trim(),
        createdAt: new Date().toISOString()
      };

      await onSaveExpense?.(expensePayload);
      handleClose();
    } catch (err) {
      console.error('Failed to save expense:', err);
      setFormError('حدث خطأ أثناء حفظ سند الصرف. يرجى المحاولة ثانية.');
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(details) => {
        if (!details.open) handleClose();
      }}
      title="تسجيل مصروف تشغيلي جديد (سند صرف نقدية)"
      description="إثبات المصروفات والنفقات التشغيلية لخصمها من رصيد الخزينة العامة"
      maxWidth="560px"
    >
      <form onSubmit={handleSubmit} className="expense-modal-form" dir="rtl">
        {formError && (
          <div className="expense-form-alert error" role="alert">
            <AlertCircle size={18} />
            <span>{formError}</span>
          </div>
        )}

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label htmlFor="expense-title" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            <FileText size={16} />
            <span>بيان المصروف / سبب الصرف *</span>
          </label>
          <input
            id="expense-title"
            type="text"
            className="input-field"
            placeholder="مثال: شراء قفازات ومستلزمات تعقيم، صيانة جهاز الأشعة، فاتورة كهرباء..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group">
            <label htmlFor="expense-amount" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              <DollarSign size={16} />
              <span>المبلغ المنصرف (ج.م) *</span>
            </label>
            <input
              id="expense-amount"
              type="number"
              step="any"
              min="0.01"
              className="input-field"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="expense-date" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              <Calendar size={16} />
              <span>تاريخ الصرف *</span>
            </label>
            <input
              id="expense-date"
              type="date"
              className="input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group">
            <label htmlFor="expense-category" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              <Tag size={16} />
              <span>تصنيف المصروف *</span>
            </label>
            <select
              id="expense-category"
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="expense-payment-method" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              <CreditCard size={16} />
              <span>طريقة الصرف / القناة *</span>
            </label>
            <select
              id="expense-payment-method"
              className="input-field"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {PAYMENT_METHODS.map(pm => (
                <option key={pm.id} value={pm.id}>{pm.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label htmlFor="expense-receipt" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            <Receipt size={16} />
            <span>رقم الإيصال / الفاتورة الضريبية (اختياري)</span>
          </label>
          <input
            id="expense-receipt"
            type="text"
            className="input-field"
            placeholder="مثال: فاتورة رقم REC-2026-904"
            value={receiptRef}
            onChange={(e) => setReceiptRef(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="expense-notes" className="form-label" style={{ display: 'block', fontWeight: 700, marginBottom: '0.35rem' }}>
            ملاحظات وتفاصيل إضافية
          </label>
          <textarea
            id="expense-notes"
            className="input-field"
            rows="2"
            placeholder="أية ملاحظات إضافية تخص المورد أو الصرف..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ background: 'var(--danger, #DC2626)', borderColor: 'var(--danger, #DC2626)', color: '#FFFFFF' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'جاري الإثبات...' : 'إثبات سند الصرف (فلوس خارج)'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
