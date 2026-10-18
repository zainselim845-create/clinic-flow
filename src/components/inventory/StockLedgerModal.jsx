import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, History, PlusCircle, Clock, ShieldCheck } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Portal } from '@ark-ui/react/portal';
import { 
  getStockTransactions, 
  adjustItemStock,
  STOCK_TRANSACTION_TYPES 
} from '@/features/inventory/services/inventoryService';

export default function StockLedgerModal({
  isOpen,
  onClose,
  selectedItem = null,
  clinicId,
  onStockUpdated
}) {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // New Movement Form
  const [movementType, setMovementType] = useState('in'); // 'in' | 'out' | 'adjustment' | 'waste'
  const [movementQty, setMovementQty] = useState(1);
  const [reason, setReason] = useState('شراء مستلزمات وتوريد جديد');
  const [notes, setNotes] = useState('');

  const loadTransactions = useCallback(async () => {
    if (!clinicId) return;
    setIsLoading(true);
    try {
      const { data } = await getStockTransactions(clinicId, selectedItem?.id || null);
      setTransactions(data || []);
    } catch (err) {
      console.warn('Failed to load stock ledger transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clinicId, selectedItem]);

  useEffect(() => {
    if (isOpen) {
      loadTransactions();
    }
  }, [isOpen, loadTransactions]);

  const handleRecordMovement = async (e) => {
    e.preventDefault();
    if (!selectedItem || !movementQty || movementQty <= 0) return;

    const current = Number(selectedItem.currentQty || 0);
    const qty = Number(movementQty);
    let newQty = current;

    if (movementType === 'in') {
      newQty = current + qty;
    } else if (movementType === 'out' || movementType === 'waste') {
      newQty = Math.max(0, current - qty);
    } else if (movementType === 'adjustment') {
      newQty = qty; // direct adjustment to new count
    }

    // Persist via adjustItemStock which records the movement transaction
    await adjustItemStock(selectedItem.id, newQty, clinicId, {
      itemName: selectedItem.name,
      type: movementType,
      previousQty: current,
      reason: reason || 'تسوية رصيد',
      notes
    });

    if (onStockUpdated) {
      onStockUpdated(selectedItem.id, newQty);
    }

    setIsRecording(false);
    setMovementQty(1);
    setNotes('');
    await loadTransactions();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="modal-overlay" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <Dialog.Content className="modal-content glass-card" style={{ maxWidth: '780px', width: '100%', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'var(--surface)' }}>
            
            {/* Header */}
            <div className="modal-header border-b border-zinc-200 dark:border-zinc-800 pb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <History className="text-zinc-500" size={20} />
                <div>
                  <Dialog.Title asChild>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      سجل حركات وتدقيق المخزون (Stock Audit Ledger)
                    </h3>
                  </Dialog.Title>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {selectedItem ? `تتبع حركة الصنف: ${selectedItem.name} (الرصيد الحالي: ${selectedItem.currentQty} ${selectedItem.unit})` : 'سجل حركة المستلزمات الطبية الموثق'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {selectedItem && (
                  <button
                    type="button"
                    onClick={() => setIsRecording(prev => !prev)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <PlusCircle size={14} />
                    <span>{isRecording ? 'إلغاء التسجيل' : 'تسجيل حركة جديدة'}</span>
                  </button>
                )}
                <Dialog.CloseTrigger asChild>
                  <button className="close-btn" type="button" aria-label="إغلاق" onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </Dialog.CloseTrigger>
              </div>
            </div>

            {/* Quick Record Movement Panel */}
            {isRecording && selectedItem && (
              <form onSubmit={handleRecordMovement} className="p-3 my-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} className="text-success" />
                  <span>تسجيل حركة جديدة وموثقة للصنف ({selectedItem.name})</span>
                </strong>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>نوع الحركة:</label>
                    <select
                      className="input-field"
                      value={movementType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMovementType(val);
                        if (val === 'in') setReason('شراء مستلزمات وتوريد جديد');
                        else if (val === 'out') setReason('صرف استهلاك كشف وعلاج');
                        else if (val === 'waste') setReason('تالف أو منتهي الصلاحية');
                        else setReason('تسوية جرد دوري');
                      }}
                    >
                      <option value="in">توريد / شراء جديد (+)</option>
                      <option value="out">صرف واستهلاك كشف (-)</option>
                      <option value="waste">تالف / منتهي الصلاحية (-)</option>
                      <option value="adjustment">تسوية جرد دوري (تعيين الرصيد)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      {movementType === 'adjustment' ? 'الرصيد الفعلي الجديد:' : 'الكمية المراد حركتها:'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="input-field"
                      value={movementQty}
                      onChange={(e) => setMovementQty(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>بيان وسبب الحركة:</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="مثال: فاتورة توريد رقم 402، جلسة حشو عصب..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button type="button" onClick={() => setIsRecording(false)} className="btn-secondary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}>إلغاء</button>
                  <button type="submit" className="btn-primary" style={{ padding: '0.35rem 0.9rem', fontSize: '0.8rem' }}>حفظ وقيد الحركة</button>
                </div>
              </form>
            )}

            {/* Movement Transactions Table */}
            <div style={{ maxHeight: '55vh', overflowY: 'auto', marginTop: '0.75rem' }}>
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                  <span>جاري تحميل سجل الحركات...</span>
                </div>
              ) : transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-secondary)' }}>
                  <Clock size={36} style={{ opacity: 0.5, margin: '0 auto 0.5rem' }} />
                  <strong style={{ display: 'block', color: 'var(--text-primary)' }}>لا توجد حركات مسجلة لهذا الصنف حتى الآن</strong>
                  <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                    يتم قيد أي حركة توريد أو صرف أو تسوية جرد آلياً في هذا السجل لحماية عهدة العيادة.
                  </p>
                </div>
              ) : (
                <table className="invoices-main-table" style={{ width: '100%', fontSize: '0.84rem' }}>
                  <thead>
                    <tr>
                      <th>نوع الحركة</th>
                      <th>الكمية المنقولة</th>
                      <th>الرصيد (قبل ← بعد)</th>
                      <th>السبب والبيان</th>
                      <th>القائم بالحركة</th>
                      <th>التاريخ والوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => {
                      const isPositive = tx.delta > 0 || tx.type === 'in';
                      return (
                        <tr key={tx.id}>
                          <td>
                            <span 
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: isPositive ? '#DCFCE7' : '#FEE2E2',
                                color: isPositive ? '#166534' : '#991B1B'
                              }}
                            >
                              {isPositive ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                              <span>{STOCK_TRANSACTION_TYPES[tx.type?.toUpperCase()]?.labelAr || tx.type}</span>
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: isPositive ? '#16A34A' : '#DC2626' }}>
                              {isPositive ? `+${Math.abs(tx.delta)}` : `-${Math.abs(tx.delta)}`}
                            </strong>
                          </td>
                          <td>
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {tx.previousQty} ← <strong>{tx.newQty}</strong>
                            </span>
                          </td>
                          <td>{tx.reason}</td>
                          <td><span className="role-tag">{tx.performedBy || 'طاقم العيادة'}</span></td>
                          <td>
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                              {new Date(tx.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                إجمالي الحركات الموثقة: {transactions.length} حركة
              </span>
              <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '0.4rem 1rem' }}>
                إغلاق
              </button>
            </div>

          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
