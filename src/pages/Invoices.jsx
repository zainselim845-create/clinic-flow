import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, Plus, Search, Download, 
  Clock, AlertCircle, DollarSign, Eye 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import InvoiceModal from '../components/InvoiceModal';
import { getInvoices, addInvoice } from '../services/invoicesService';
import './Invoices.css';

const Invoices = () => {
  const { state } = useApp();
  const currentClinic = state.clinicInfo || {};

  const [invoicesList, setInvoicesList] = useState([
    {
      id: 'inv-101',
      invoiceNumber: 'INV-5510',
      patientName: 'أحمد محمود سليمان',
      patientPhone: '01012345678',
      subtotal: 1800,
      discount: 100,
      taxPercentage: 0,
      taxAmount: 0,
      total: 1700,
      insuranceShare: 0,
      patientShare: 1700,
      paidAmount: 1000,
      remainingBalance: 700,
      paymentStatus: 'partial',
      items: [
        { description: 'طربوش زيركون الماني', quantity: 1, unitPrice: 1800, total: 1800 }
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 'inv-102',
      invoiceNumber: 'INV-5511',
      patientName: 'مريم علي عبد الله',
      patientPhone: '01122334455',
      subtotal: 400,
      discount: 0,
      taxPercentage: 0,
      taxAmount: 0,
      total: 400,
      insuranceShare: 0,
      patientShare: 400,
      paidAmount: 400,
      remainingBalance: 0,
      paymentStatus: 'paid',
      items: [
        { description: 'تنظيف جير وتلميع أسنان', quantity: 1, unitPrice: 400, total: 400 }
      ],
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, unpaid, partial, paid
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await getInvoices();
      if (data && data.length > 0) {
        setInvoicesList(data);
      }
    }
    load();
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoicesList.filter(inv => {
      const matchesSearch = 
        (inv.patientName && inv.patientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (inv.patientPhone && inv.patientPhone.includes(searchQuery)) ||
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || inv.paymentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoicesList, searchQuery, statusFilter]);

  // Metric Aggregates
  const totalBilled = invoicesList.reduce((acc, i) => acc + Number(i.total || 0), 0);
  const totalCollected = invoicesList.reduce((acc, i) => acc + Number(i.paidAmount || 0), 0);
  const totalOutstanding = invoicesList.reduce((acc, i) => acc + Number(i.remainingBalance || 0), 0);

  const handleOpenNew = () => {
    setSelectedInvoice(null);
    setIsModalOpen(true);
  };

  const handleViewInvoice = (inv) => {
    setSelectedInvoice(inv);
    setIsModalOpen(true);
  };

  const handleSaveInvoice = async (newInv) => {
    await addInvoice(newInv);
    setInvoicesList(prev => [newInv, ...prev.filter(i => i.id !== newInv.id)]);
  };

  const handleExportCSV = () => {
    const headers = ['رقم الفاتورة', 'المريض', 'رقم الهاتف', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة', 'التاريخ'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      inv.patientName,
      inv.patientPhone,
      inv.total,
      inv.paidAmount,
      inv.remainingBalance,
      inv.paymentStatus,
      new Date(inv.createdAt).toLocaleDateString('ar-EG')
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Invoices_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="invoices-page">
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>الفوترة والتحصيلات المالية (Invoices & Billing)</h2>
          <p>إدارة الفواتير العلاجية، سندات القبض، المدفوعات الجزئية، وحسابات الضرائب والتأمين</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleExportCSV} className="btn-secondary">
            <Download size={16} />
            <span>تصدير إكسيل (CSV)</span>
          </button>
          <button onClick={handleOpenNew} className="btn-primary">
            <Plus size={18} />
            <span>إصدار فاتورة جديدة</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="invoices-metrics-grid">
        <div className="inv-metric-card">
          <div className="metric-icon-wrap blue"><Receipt size={22} /></div>
          <div>
            <span className="metric-lbl">إجمالي المطالبات</span>
            <strong className="metric-val">{totalBilled.toLocaleString()} ج.م</strong>
          </div>
        </div>

        <div className="inv-metric-card">
          <div className="metric-icon-wrap green"><DollarSign size={22} /></div>
          <div>
            <span className="metric-lbl">إجمالي المتحصلات</span>
            <strong className="metric-val text-success">{totalCollected.toLocaleString()} ج.م</strong>
          </div>
        </div>

        <div className="inv-metric-card">
          <div className="metric-icon-wrap red"><AlertCircle size={22} /></div>
          <div>
            <span className="metric-lbl">الديون والمستحقات</span>
            <strong className="metric-val text-danger">{totalOutstanding.toLocaleString()} ج.م</strong>
          </div>
        </div>

        <div className="inv-metric-card">
          <div className="metric-icon-wrap orange"><Clock size={22} /></div>
          <div>
            <span className="metric-lbl">عدد الفواتير الصادرة</span>
            <strong className="metric-val">{invoicesList.length} فاتورة</strong>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="filters-bar glass-card" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: '240px' }}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="بحث برقم الفاتورة، اسم المريض، أو الهاتف..."
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="status-filter-pills">
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            الكل ({invoicesList.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'unpaid' ? 'active' : ''}`}
            onClick={() => setStatusFilter('unpaid')}
          >
            مستحقة للدفع
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'partial' ? 'active' : ''}`}
            onClick={() => setStatusFilter('partial')}
          >
            سداد جزئي
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'paid' ? 'active' : ''}`}
            onClick={() => setStatusFilter('paid')}
          >
            مدفوعة بالكامل
          </button>
        </div>
      </div>

      {/* Invoices Table */}
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
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                  لا توجد فواتير مطابقة للبحث.
                </td>
              </tr>
            ) : (
              filteredInvoices.map(inv => (
                <tr key={inv.id}>
                  <td><strong className="inv-code-badge">{inv.invoiceNumber}</strong></td>
                  <td><strong>{inv.patientName}</strong></td>
                  <td dir="ltr">{inv.patientPhone || '—'}</td>
                  <td>{new Date(inv.createdAt).toLocaleDateString('ar-EG')}</td>
                  <td><strong>{inv.total} ج.م</strong></td>
                  <td className="text-success">{inv.paidAmount} ج.م</td>
                  <td className={inv.remainingBalance > 0 ? 'text-danger font-bold' : ''}>
                    {inv.remainingBalance} ج.م
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <InvoiceModal
        isOpen={isModalOpen}
        invoice={selectedInvoice}
        clinicInfo={currentClinic}
        onClose={() => setIsModalOpen(false)}
        onSaveInvoice={handleSaveInvoice}
      />

    </div>
  );
};

export default Invoices;
