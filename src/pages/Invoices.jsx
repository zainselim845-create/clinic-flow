import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTenant } from '../context/TenantContext';
import InvoiceModal from '../components/InvoiceModal';
import FeatureErrorBoundary from '../components/FeatureErrorBoundary';
import { getInvoices, addInvoice } from '../services/invoicesService';
import { safeGetJSON, safeSetJSON } from '../utils/safeStorage';
import {
  InvoicesMetricsGrid,
  InvoicesFiltersBar,
  InvoicesTable
} from '../components/invoices';
import './Invoices.css';

const Invoices = () => {
  const location = useLocation();
  const { state } = useApp();
  const { tenant } = useTenant();
  const currentClinic = state.clinicInfo || tenant || {};
  const clinicSlug = currentClinic?.slug || tenant?.slug || '';
  const clinicId = currentClinic?.id || tenant?.id || (clinicSlug ? `tenant-${clinicSlug}` : '');

  const loadScopedInvoices = (slug) => {
    if (!slug) return [];
    const parsed = safeGetJSON(`clinicflow_invoices_${slug}`, null);
    if (Array.isArray(parsed)) return parsed;
    return [];
  };

  const [invoicesList, setInvoicesList] = useState(() => loadScopedInvoices(clinicSlug));
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, unpaid, partial, paid
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Deep-linking from Command Palette (action=new)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new') {
      setSelectedInvoice(null);
      setIsModalOpen(true);
    }
  }, [location.search]);

  useEffect(() => {
    setInvoicesList(loadScopedInvoices(clinicSlug, clinicId));
  }, [clinicSlug, clinicId]);

  const fetchInvoices = async () => {
    if (!clinicId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await getInvoices(clinicId);
      if (error) throw error;
      if (data && data.length > 0) {
        setInvoicesList(data);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setLoadError('تعذر تحميل الفواتير من الخادم. يرجى إعادة المحاولة.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [clinicId]);

  // Save to tenant-scoped localStorage when list changes
  useEffect(() => {
    safeSetJSON(`clinicflow_invoices_${clinicSlug}`, invoicesList);
  }, [invoicesList, clinicSlug]);

  const filteredInvoices = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return invoicesList.filter(inv => {
      if (!inv) return false;
      const pName = inv.patientName ? String(inv.patientName).toLowerCase() : '';
      const pPhone = inv.patientPhone ? String(inv.patientPhone) : '';
      const invNum = inv.invoiceNumber ? String(inv.invoiceNumber).toLowerCase() : '';

      const matchesSearch = !q || pName.includes(q) || pPhone.includes(q) || invNum.includes(q);
      const matchesStatus = statusFilter === 'all' || inv.paymentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoicesList, searchQuery, statusFilter]);

  // Metric Aggregates
  const totalBilled = useMemo(() => {
    return (invoicesList || []).reduce((acc, i) => acc + (i ? Number(i.total || i.totalAmount || i.amount || ((Number(i.paidAmount || 0) + Number(i.remainingBalance || 0))) || 0) : 0), 0);
  }, [invoicesList]);

  const totalCollected = useMemo(() => {
    return (invoicesList || []).reduce((acc, i) => acc + (i ? Number(i.paidAmount || i.paid || 0) : 0), 0);
  }, [invoicesList]);

  const totalOutstanding = useMemo(() => {
    return (invoicesList || []).reduce((acc, i) => acc + (i ? Number(i.remainingBalance != null ? i.remainingBalance : Math.max(0, (Number(i.total || i.totalAmount || 0) - Number(i.paidAmount || i.paid || 0)))) : 0), 0);
  }, [invoicesList]);

  const handleOpenNew = () => {
    setSelectedInvoice(null);
    setIsModalOpen(true);
  };
  const handleCreateInvoice = handleOpenNew;

  const handleViewInvoice = (inv) => {
    setSelectedInvoice(inv);
    setIsModalOpen(true);
  };

  const handleSaveInvoice = async (newInv) => {
    const invWithClinic = {
      ...newInv,
      clinicId,
      clinic_id: clinicId
    };
    await addInvoice(invWithClinic);
    setInvoicesList(prev => [invWithClinic, ...prev.filter(i => i.id !== invWithClinic.id)]);
  };

  const handleExportCSV = () => {
    const headers = ['رقم الفاتورة', 'المريض', 'رقم الهاتف', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة', 'التاريخ'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      inv.patientName,
      inv.patientPhone,
      inv.total || inv.totalAmount || (Number(inv.paidAmount || 0) + Number(inv.remainingBalance || 0)),
      inv.paidAmount || inv.paid || 0,
      inv.remainingBalance != null ? inv.remainingBalance : Math.max(0, (Number(inv.total || inv.totalAmount || 0) - Number(inv.paidAmount || inv.paid || 0))),
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
          <h1>الفوترة والتحصيلات المالية (Invoices & Billing)</h1>
          <p>إدارة الفواتير العلاجية، سندات القبض، المدفوعات الجزئية، والخصومات المعتمدة</p>
        </div>
        <div className="header-actions-btns">
          <button onClick={handleExportCSV} className="btn btn-secondary">
            <Download size={16} />
            <span>تصدير إكسيل (CSV)</span>
          </button>
          <button onClick={handleOpenNew} onSelect={handleCreateInvoice} className="btn btn-primary">
            <Plus size={18} />
            <span>إصدار فاتورة جديدة</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <FeatureErrorBoundary featureName="Invoices Metrics Grid">
        <InvoicesMetricsGrid
          totalBilled={totalBilled}
          totalCollected={totalCollected}
          totalOutstanding={totalOutstanding}
          invoicesCount={invoicesList.length}
        />
      </FeatureErrorBoundary>

      {/* Search & Filter Bar */}
      <FeatureErrorBoundary featureName="Invoices Filters Bar">
        <InvoicesFiltersBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          totalCount={invoicesList.length}
        />
      </FeatureErrorBoundary>

      {/* Invoices Table */}
      <FeatureErrorBoundary featureName="Invoices Data Table">
        <InvoicesTable
          isLoading={isLoading}
          loadError={loadError}
          fetchInvoices={fetchInvoices}
          filteredInvoices={filteredInvoices}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          setSearchQuery={setSearchQuery}
          setStatusFilter={setStatusFilter}
          handleOpenNew={handleOpenNew}
          handleViewInvoice={handleViewInvoice}
        />
      </FeatureErrorBoundary>

      {/* Modal */}
      <FeatureErrorBoundary featureName="Invoice Details Modal">
        <InvoiceModal
          isOpen={isModalOpen}
          invoice={selectedInvoice}
          clinicInfo={currentClinic}
          onClose={() => setIsModalOpen(false)}
          onSaveInvoice={handleSaveInvoice}
        />
      </FeatureErrorBoundary>
    </div>
  );
};

export default Invoices;
