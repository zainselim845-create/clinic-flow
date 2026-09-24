import React from 'react';
import { Receipt, AlertCircle, RefreshCw, Eye, Plus } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

export default function InvoicesTable({
  isLoading,
  loadError,
  fetchInvoices,
  filteredInvoices = [],
  searchQuery = '',
  statusFilter = 'all',
  setSearchQuery,
  setStatusFilter,
  handleOpenNew,
  handleViewInvoice
}) {
  return (
    <div className="glass-card table-responsive-container">
      <table className="invoices-main-table">
        <thead>
          <tr>
            <th>رقم الفاتورة</th>
            <th>اسم المريض</th>
            <th>الهاتف</th>
            <th>التاريخ</th>
            <th>الإجمالي</th>
            <th>المدفوع</th>
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
          ) : loadError ? (
            <tr>
              <td colSpan="9" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
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
          ) : filteredInvoices.length === 0 ? (
            <tr>
              <td colSpan="9" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                  <Receipt size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} aria-hidden="true" />
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {searchQuery || statusFilter !== 'all'
                      ? 'لا توجد فواتير مطابقة لمعايير البحث والتصفية'
                      : 'لا توجد فواتير صادرة حتى الآن'}
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
                    {searchQuery || statusFilter !== 'all'
                      ? 'جرّب كتابة رقم فاتورة آخر أو مسح خانة البحث أو اختيار تصنيف الكل.'
                      : 'يمكنك إنشاء فاتورة كشف أو خدمات علاجية جديدة للمرضى بسهولة.'}
                  </p>
                  {searchQuery || statusFilter !== 'all' ? (
                    <button
                      type="button"
                      className="btn-table-action"
                      style={{ marginTop: '0.5rem', padding: '0.45rem 1rem' }}
                      onClick={() => { setSearchQuery?.(''); setStatusFilter?.('all'); }}
                    >
                      إعادة ضبط الفلاتر
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-table-action"
                      style={{ marginTop: '0.5rem', padding: '0.45rem 1rem', background: 'var(--primary)', color: '#FFFFFF' }}
                      onClick={handleOpenNew}
                    >
                      <Plus size={16} />
                      <span>إنشاء أول فاتورة</span>
                    </button>
                  )}
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
                  <td className="text-success">{paid.toLocaleString()} ج.م</td>
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
    </div>
  );
}
