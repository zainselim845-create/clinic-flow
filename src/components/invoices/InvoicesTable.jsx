import React, { useMemo } from 'react'; 
import { 
  Receipt, 
  Eye, 
  Trash2, 
  ArrowDownLeft, 
  ArrowUpRight 
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import ScreenState from '@/components/ui/ScreenState';

/**
 * InvoicesTable — unified financial ledger views (all / in / out).
 * Lifecycle handled by the canonical ScreenState primitive
 * (Loading → Error+Retry → Empty+CTA → Loaded), one adoption per view.
 */
export default function InvoicesTable({
  isLoading = false,
  loadError = null,
  fetchInvoices,
  filteredInvoices = [],
  filteredExpenses = [],
  viewMode = 'all', // 'all' | 'in' | 'out'
  searchQuery = '',
  statusFilter = 'all',
  _setSearchQuery,
  _setStatusFilter,
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

  const skeletonTable = (cols, keyPrefix) => (
    <table className="invoices-main-table" aria-hidden="true">
      <tbody>
        {Array.from({ length: 5 }).map((_, idx) => (
          <tr key={`${keyPrefix}-skel-${idx}`}>
            {Array.from({ length: cols }).map((__, c) => (
              <td key={`${keyPrefix}-skel-${idx}-${c}`}>
                <Skeleton style={{ height: c === cols - 1 ? '28px' : '18px', width: c === 0 ? '85px' : '90px', borderRadius: '6px' }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="glass-card table-responsive-container">
      {/* View Mode 1: Unified Cash Flow (حركة الخزينة الشاملة) */}
      {viewMode === 'all' && (
        <ScreenState
          isLoading={isLoading}
          loadError={loadError}
          isEmpty={combinedTransactions.length === 0}
          skeleton={skeletonTable(8, 'cf')}
          errorTitle={loadError || 'تعذّر تحميل الحركات المالية'}
          onRetry={fetchInvoices}
          retryLabel="إعادة المحاولة الآن"
          emptyIcon={<Receipt size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} aria-hidden="true" />}
          emptyTitle="لا توجد حركات مالية مسجلة في الفترة المحددة"
          emptyMessage="يمكنك إصدار فاتورة جديدة لتحصيل مقبوضات علاجية أو تسجيل سند صرف لمصروف تشغيلي."
          emptyActionLabel="إصدار فاتورة (داخل)"
          onEmptyAction={handleOpenNew}
          secondaryActionLabel="تسجيل مصروف (خارج)"
          onSecondaryAction={handleOpenNewExpense}
        >
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
              {combinedTransactions.map(tx => {
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
              })}
            </tbody>
          </table>
        </ScreenState>
      )}

      {/* View Mode 2: Inflow Only (فلوس داخل - فواتير المرضى) */}
      {viewMode === 'in' && (
        <ScreenState
          isLoading={isLoading}
          loadError={loadError}
          isEmpty={filteredInvoices.length === 0}
          skeleton={skeletonTable(9, 'inv')}
          errorTitle={loadError || 'تعذّر تحميل الفواتير'}
          onRetry={fetchInvoices}
          retryLabel="إعادة المحاولة الآن"
          emptyIcon={<Receipt size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} aria-hidden="true" />}
          emptyTitle={searchQuery || statusFilter !== 'all'
            ? 'لا توجد فواتير مطابقة لمعايير البحث والتصفية'
            : 'لا توجد مقبوضات علاجية صادرة في هذه الفترة'}
          emptyMessage="أصدر فاتورة جديدة لتوثيق مقبوضات الكشوفات والعلاجات وتتبع حالات السداد."
          emptyActionLabel="إصدار فاتورة جديدة"
          onEmptyAction={handleOpenNew}
        >
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
              {filteredInvoices.map(inv => {
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
              })}
            </tbody>
          </table>
        </ScreenState>
      )}

      {/* View Mode 3: Outflow Only (فلوس خارج - المصروفات والنفقات التشغيلية) */}
      {viewMode === 'out' && (
        <ScreenState
          isLoading={isLoading}
          loadError={loadError}
          isEmpty={filteredExpenses.length === 0}
          skeleton={skeletonTable(8, 'exp')}
          errorTitle={loadError || 'تعذّر تحميل المصروفات'}
          onRetry={fetchInvoices}
          retryLabel="إعادة المحاولة الآن"
          emptyIcon={<ArrowUpRight size={40} style={{ color: 'var(--danger, #DC2626)', opacity: 0.6 }} aria-hidden="true" />}
          emptyTitle="لا توجد مصروفات تشغيلية مسجلة في هذه الفترة"
          emptyMessage="سجّل فواتير المستلزمات الطبية، المعامل، المرافق، والرواتب لضبط الخزينة."
          emptyActionLabel="تسجيل أول مصروف تشغيلي"
          onEmptyAction={handleOpenNewExpense}
        >
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
              {filteredExpenses.map(exp => (
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
              ))}
            </tbody>
          </table>
        </ScreenState>
      )}
    </div>
  );
}
