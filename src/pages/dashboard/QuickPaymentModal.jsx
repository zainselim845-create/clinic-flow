import React, { useState, useEffect } from 'react';
import { Wallet, CreditCard, Banknote, Smartphone, X, Check, ShieldCheck } from 'lucide-react';
import { Dialog } from '../../components/ui/dialog';
import { Portal } from '@ark-ui/react/portal';

export default function QuickPaymentModal({
  isOpen,
  appointment,
  onClose,
  onConfirm
}) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amount, setAmount] = useState('300');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (appointment) {
      const rawFee = appointment.fee ?? appointment.paidAmount;
      const numericFee = typeof rawFee === 'number'
        ? rawFee
        : (rawFee ? parseInt(String(rawFee).replace(/\D/g, ''), 10) || 300 : 300);
      setAmount(String(numericFee));
      setDiscount('0');
      setPaymentMethod('cash');
      setNotes('');
      setIsSubmitting(false);
    }
  }, [appointment]);

  if (!appointment) return null;

  const numericAmount = parseFloat(amount) || 0;
  const numericDiscount = parseFloat(discount) || 0;
  const netTotal = Math.max(0, numericAmount - numericDiscount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onConfirm(appointment.id, paymentMethod, netTotal, notes);
      onClose();
    } catch (err) {
      console.error('Error confirming payment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentOptions = [
    {
      id: 'cash',
      label: 'نقداً (كاش)',
      description: 'استلام المبلغ نقداً في الخزينة',
      icon: Banknote,
      color: '#059669',
      bgColor: '#ECFDF5',
      borderColor: '#A7F3D0'
    },
    {
      id: 'card',
      label: 'بطاقة بنكية (فيزا / ماستركارد)',
      description: 'الدفع عبر جهاز نقاط البيع POS',
      icon: CreditCard,
      color: '#2563EB',
      bgColor: '#EFF6FF',
      borderColor: '#BFDBFE'
    },
    {
      id: 'instapay',
      label: 'إنستاباي / محفظة إلكترونية',
      description: 'تحويل لحظي لحساب أو محفظة العيادة',
      icon: Smartphone,
      color: '#7C3AED',
      bgColor: '#F5F3FF',
      borderColor: '#DDD6FE'
    }
  ];

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => { if (!details.open && onClose) onClose(); }} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="modal-content" style={{ maxWidth: '520px', padding: '1.75rem' }}>
            <div className="sheet-modal-grabber" style={{ marginBottom: '8px' }} />
            
            <div className="modal-header" style={{ paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <div className="title-row" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#ECFDF5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Wallet size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <Dialog.Title asChild>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      تحصيل الرسوم وإصدار الفاتورة
                    </h3>
                  </Dialog.Title>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    المريض: {appointment.patientName} • {appointment.type || 'كشف عيادة'}
                  </span>
                </div>
              </div>
              <Dialog.CloseTrigger asChild>
                <button type="button" onClick={onClose} className="btn-close" aria-label="إغلاق النافذة">
                  <X size={18} />
                </button>
              </Dialog.CloseTrigger>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Patient and Fee Summary Box */}
              <div style={{
                background: 'var(--bg-tertiary, #F4F4F5)',
                borderRadius: '10px',
                padding: '0.85rem 1.15rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid var(--border-color, #E4E4E7)'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>إجمالي الكشف المطلوب</span>
                  <strong style={{ fontSize: '1.25rem', color: '#059669' }}>{netTotal.toLocaleString('en-US')} ج.م</strong>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>الحالة المالية</span>
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    background: '#FEF3C7',
                    color: '#92400E',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    بانتظار السداد
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'block' }}>
                  طريقة التحصيل *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {paymentOptions.map((opt) => {
                    const isSelected = paymentMethod === opt.id;
                    const Icon = opt.icon;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setPaymentMethod(opt.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 1rem',
                          borderRadius: '10px',
                          border: `1.5px solid ${isSelected ? opt.color : 'var(--border-color, #E4E4E7)'}`,
                          background: isSelected ? opt.bgColor : 'var(--surface, #FFFFFF)',
                          cursor: 'pointer',
                          transition: 'all 0.18s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: isSelected ? opt.color : 'var(--bg-tertiary, #F4F4F5)',
                            color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                              {opt.label}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              {opt.description}
                            </span>
                          </div>
                        </div>
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: `2px solid ${isSelected ? opt.color : 'var(--border-color, #E4E4E7)'}`,
                          background: isSelected ? opt.color : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF'
                        }}>
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Amount and Discount Adjustment */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>المبلغ المحصل (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    style={{ fontWeight: 700 }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>خصم معتمد (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>ملاحظات المحاسبة (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: خصم نقابة، تسوية تأمين، كشف مستعجل..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Modal Actions */}
              <div className="modal-actions" style={{ marginTop: '0.5rem', paddingTop: '1rem' }}>
                <Dialog.CloseTrigger asChild>
                  <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
                    إلغاء
                  </button>
                </Dialog.CloseTrigger>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={isSubmitting || netTotal < 0}
                  style={{ minWidth: '180px' }}
                >
                  <ShieldCheck size={16} />
                  <span>{isSubmitting ? 'جاري الاعتماد...' : `تأكيد تحصيل ${netTotal} ج.م`}</span>
                </button>
              </div>

            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
