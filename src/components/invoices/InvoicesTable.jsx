import React, { useMemo } from 'react';
import { 
  Receipt, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  Plus, 
  Trash2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  CreditCard 
} from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

export default function InvoicesTable({
  isLoading = false,
  loadError = null,
  fetchInvoices,
  filteredInvoices = [],
  filteredExpenses = [],
  viewMode = 'all', // 'all' | 'in' | 'out'
  searchQuery = '',
  statusFilter = 'all',
  setSearchQuery,
  setStatusFilter,
  handleOpenNew,
  handleOpenNewExpense,
  handleViewInvoice,
  handleDeleteExpense
}) {
  const formatPaymentRail = (pm) => {
    switch (pm) {
      case 'instapay': return 'إنستاباي';
      case 'wallet': return 'محفظة كاش';
      case 'card': return 'بطاقة بنكية';
      case 'cash':
      default: return 'نقداً';
    }
  };

  // Unified Chronological Cash Flow Ledger
  const combinedTransactions = useMemo(() => {
    const inList = (filteredInvoices || []).map(inv => {
      const paid = Number(inv.paidAmount || inv.paid || 0);
      const billed = Number(inv.total || inv.totalAmount || inv.amount || 0);
      const remaining = inv.remainingBalance != null ? Number(inv.remainingBalance) : Math.max(0, billed - paid);
      const dateStr = inv.createdAt || inv.date || '';
      return {
        type: 'inflow',
        id: inv.id,
        date: dateStr,
        displayDate: dateStr ? new Date(dateStr).toLocaleDateString('ar-EG') : '—',
        title: `فاتورة كشف / علاج - ${inv.patientName || 'مريض'}`,
        subTitle: inv.patientPhone ? `هاتف: ${inv.patientPhone}` : (inv.items?.[0]?.description || 'خدمات عيادة'),
        refNumber: inv.invoiceNumber || 'INV',
        category: 'مقبوضات علاجية',
        paymentMethod: inv.paymentMethod || 'cash',
        amount: paid > 0 ? paid : billed,
        remaining,
        status: inv.paymentStatus || 'paid',
        raw: inv
      };
    });

    const outList = (filteredExpenses || []).map(exp => {
      const dateStr = exp.date || exp.createdAt || '';
      return {
        type: 'outflow',
        id: exp.id,
        date: dateStr,
        displayDate: dateStr ? new Date(dateStr).toLocaleDateString('ar-EG') : '—',
        title: exp.title || 'مصروف تشغيلي',
        subTitle: exp.notes || exp.receiptRef || '',
        refNumber: exp.receiptRef || 'سند صرف',
        category: exp.category || 'مصروفات تشغيلية',
        paymentMethod: exp.paymentMethod || 'cash',
        amount: Number(exp.amount) || 0,
        remaining: 0,
        status: 'spent',
        raw: exp
      };
    });

    return [...inList, ...outList].sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });
  }, [filteredInvoices, filteredExpenses]);

  return (
    <div className="glass-card table-responsive-container">
      {/* View Mode 1: Unified Cash Flow (حركة الخزينة الشاملة) */}
      {viewMode === 'all' && (
        <table className="invoices-main-table">
          <thead>
            <tr>
              <th>نوع الحركة</th>
              <th>البيان والتفاصيل</th>
              <th>المرجع / الرقم</th>
              <th>التاريخ</th>
              <th>طريقة السداد</th>
              <th>المبلغ (ج.م)</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`cf-skel-${idx}`}>
                  <td><Skeleton style={{ height: '24px', width: '85px', borderRadius: '12px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '160px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '80px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '75px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '75px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '75px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '20px', width: '60px', borderRadius: '12px' }} /></td>
                  <td><Skeleton style={{ height: '28px', width: '75px', borderRadius: '6px' }} /></td>
                </tr>
              ))
            ) : loadError ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                    <AlertCircle size={36} color="var(--danger, #DC2626)" aria-hidden="true" />
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{loadError}</strong>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      onClick={fetchInvoices}
                    >
                      <RefreshCw size={15} />
                      <span>إعادة المحاولة الآن</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : combinedTransactions.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                    <Receipt size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} aria-hidden="true" />
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                      لا توجد حركات مالية مسجلة في الفترة المحددة
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '420px' }}>
                      يمكنك إصدار فاتورة جديدة لتحصيل مقبوضات علاجية أو تسجيل سند صرف لمصروف تشغيلي.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleOpenNew}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Plus size={15} />
                        <span>إصدار فاتورة (داخل)</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleOpenNewExpense}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderColor: 'var(--danger, #DC2626)', color: 'var(--danger, #DC2626)' }}
                      >
                        <ArrowUpRight size={15} />
                        <span>تسجيل مصروف (خارج)</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              combinedTransactions.map(tx => {
                const isInflow = tx.type === 'inflow';
                return (
                  <tr key={`${tx.type}-${tx.id}`}>
                    <td>
                      <span 
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: 'var(--radius-full, 9999px)',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          background: isInflow ? 'var(--success-light, #DCFCE7)' : 'var(--error-light, #FEE2E2)',
                          color: isInflow ? 'var(--success, #16A34A)' : 'var(--danger, #DC2626)'
                        }}
                      >
                        {isInflow ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                        <span>{isInflow ? 'فلوس داخل' : 'فلوس خارج'}</span>
                      </span>
                    </td>
                    <td>
                      <strong>{tx.title}</strong>
                      {tx.subTitle && (
                        <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          {tx.subTitle}
                        </small>
                      )}
                    </td>
                    <td><strong className="inv-code-badge">{tx.refNumber}</strong></td>
                    <td>{tx.displayDate}</td>
                    <td>
                      <span className="badge-payment-rail">
                        {formatPaymentRail(tx.paymentMethod)}
                      </span>
                    </td>
                    <td>
                      <strong className={isInflow ? 'text-success' : 'text-danger'} style={{ fontSize: '0.96rem' }}>
                        {isInflow ? `+${tx.amount.toLocaleString()} ج.م` : `-${tx.amount.toLocaleString()} ج.م`}
                      </strong>
                    </td>
                    <td>
                      {isInflow ? (
                        <span className={`status-pill ${tx.status}`}>
                          {tx.status === 'paid' ? 'مدفوعة' : tx.status === 'partial' ? 'جزئي' : 'مستحقة'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          منصرفة
                        </span>
                      )}
                    </td>
                    <td>
                      {isInflow ? (
                        <button
                          type="button"
                          onClick={() => handleViewInvoice(tx.raw)}
                          className="btn-table-action"
                          title="عرض وسداد الفاتورة"
                        >
                          <Eye size={14} />
                          <span>عرض</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense?.(tx.id)}
                          className="btn-table-action"
                          style={{ color: 'var(--danger, #DC2626)', borderColor: 'var(--danger, #DC2626)' }}
                          title="حذف سند الصرف"
                        >
                          <Trash2 size={14} />
                          <span>حذف</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}

      {/* View Mode 2: Inflow Only (فلوس داخل - فواتير المرضى) */}
      {viewMode === 'in' && (
        <table className="invoices-main-table">
          <thead>
            <tr>
              <th>رقم الفاتورة</th>
              <th>اسم المريض</th>
              <th>الهاتف</th>
              <th>التاريخ</th>
              <th>الإجمالي</th>
              <th>المدفوع (المحصل)</th>
              <th>المتبقي</th>
              <th>حالة السداد</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`inv-skel-${idx}`}>
                  <td><Skeleton style={{ height: '18px', width: '80px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '130px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '90px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '80px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '70px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '70px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '70px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '60px', borderRadius: '12px' }} /></td>
                  <td><Skeleton style={{ height: '28px', width: '85px', borderRadius: '6px' }} /></td>
                </tr>
              ))
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                    <Receipt size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} aria-hidden="true" />
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {searchQuery || statusFilter !== 'all'
                        ? 'لا توجد فواتير مطابقة لمعايير البحث والتصفية'
                        : 'لا توجد مقبوضات علاجية صادرة في هذه الفترة'}
                    </strong>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      onClick={handleOpenNew}
                    >
                      <Plus size={16} />
                      <span>إصدار فاتورة جديدة</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredInvoices.map(inv => {
                const billed = Number(inv.total || inv.totalAmount || inv.amount || ((Number(inv.paidAmount || 0) + Number(inv.remainingBalance || 0))));
                const paid = Number(inv.paidAmount || inv.paid || 0);
                const remaining = inv.remainingBalance != null ? Number(inv.remainingBalance) : Math.max(0, billed - paid);

                return (
                  <tr key={inv.id}>
                    <td><strong className="inv-code-badge">{inv.invoiceNumber}</strong></td>
                    <td><strong>{inv.patientName}</strong></td>
                    <td dir="ltr">{inv.patientPhone || '—'}</td>
                    <td>{new Date(inv.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td><strong>{billed.toLocaleString()} ج.م</strong></td>
                    <td className="text-success font-bold">+{paid.toLocaleString()} ج.م</td>
                    <td className={remaining > 0 ? 'text-danger font-bold' : ''}>
                      {remaining.toLocaleString()} ج.م
                    </td>
                    <td>
                      <span className={`status-pill ${inv.paymentStatus}`}>
                        {inv.paymentStatus === 'paid' ? 'مدفوعة' : inv.paymentStatus === 'partial' ? 'جزئي' : 'مستحقة'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleViewInvoice(inv)}
                        className="btn-table-action"
                        title="عرض وطباعة وسداد الفاتورة"
                      >
                        <Eye size={15} />
                        <span>عرض / سداد</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}

      {/* View Mode 3: Outflow Only (فلوس خارج - المصروفات والنفقات التشغيلية) */}
      {viewMode === 'out' && (
        <table className="invoices-main-table">
          <thead>
            <tr>
              <th>تاريخ الصرف</th>
              <th>بيان المصروف</th>
              <th>التصنيف</th>
              <th>طريقة الصرف</th>
              <th>المبلغ المنصرف</th>
              <th>رقم الإيصال</th>
              <th>ملاحظات</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                    <ArrowUpRight size={40} style={{ color: 'var(--danger, #DC2626)', opacity: 0.6 }} aria-hidden="true" />
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                      لا توجد مصروفات تشغيلية مسجلة في هذه الفترة
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                      سجّل فواتير المستلزمات الطبية، المعامل، المرافق، والرواتب لضبط الخزينة.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ marginTop: '0.5rem', background: 'var(--danger, #DC2626)', borderColor: 'var(--danger, #DC2626)' }}
                      onClick={handleOpenNewExpense}
                    >
                      <Plus size={16} />
                      <span>تسجيل أول مصروف تشغيلي</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredExpenses.map(exp => (
                <tr key={exp.id}>
                  <td>{exp.date ? new Date(exp.date).toLocaleDateString('ar-EG') : '—'}</td>
                  <td><strong>{exp.title}</strong></td>
                  <td>
                    <span className="badge-expense-category">
                      {exp.category || 'نثريات'}
                    </span>
                  </td>
                  <td>
                    <span className="badge-payment-rail">
                      {formatPaymentRail(exp.paymentMethod)}
                    </span>
                  </td>
                  <td>
                    <strong className="text-danger font-bold">
                      -{Number(exp.amount || 0).toLocaleString()} ج.م
                    </strong>
                  </td>
                  <td>
                    {exp.receiptRef ? <span className="inv-code-badge">{exp.receiptRef}</span> : '—'}
                  </td>
                  <td>
                    <small style={{ color: 'var(--text-secondary)' }}>{exp.notes || '—'}</small>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense?.(exp.id)}
                      className="btn-table-action"
                      style={{ color: 'var(--danger, #DC2626)', borderColor: 'var(--danger, #DC2626)' }}
                      title="حذف سند الصرف"
                    >
                      <Trash2 size={15} />
                      <span>حذف</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

