import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, ArrowUpRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTenant } from '../context/TenantContext';
import InvoiceModal from '../components/InvoiceModal';
import FeatureErrorBoundary from '../components/FeatureErrorBoundary';
import { getInvoices, addInvoice } from '../services/invoicesService';
import { isSupabaseConfigured } from '../lib/supabase';
import { getExpenses, addExpense, deleteExpense as apiDeleteExpense } from '../services/expensesService';
import { recordJournalEntry, CHART_OF_ACCOUNTS } from '../services/generalLedgerService';
import { safeGetJSON, safeSetJSON } from '../utils/safeStorage';
import {
  InvoicesMetricsGrid,
  InvoicesFiltersBar,
  InvoicesTable,
  ExpenseModal
} from '../components/invoices';
import './Invoices.css';

const Invoices = () => {
  const location = useLocation();
  const { state } = useApp();
  const { tenant } = useTenant();
  const currentClinic = state.clinicInfo || tenant || {};
  const clinicSlug = currentClinic?.slug || tenant?.slug || '';
  const clinicId = currentClinic?.id || tenant?.id || (clinicSlug ? `tenant-${clinicSlug}` : '');

  // Scoped Loaders
  const loadScopedInvoices = (slug) => {
    if (!slug) return [];
    const parsed = safeGetJSON(`clinicflow_invoices_${slug}`, null);
    if (Array.isArray(parsed)) return parsed;
    return [];
  };

  const loadScopedExpenses = (slug) => {
    if (!slug) return [];
    const parsed = safeGetJSON(`clinicflow_expenses_${slug}`, null);
    if (Array.isArray(parsed)) return parsed;
    return [];
  };

  // State Management
  const [invoicesList, setInvoicesList] = useState(() => loadScopedInvoices(clinicSlug));
  const [expensesList, setExpensesList] = useState(() => loadScopedExpenses(clinicSlug));
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Filters & Universal Date Range State
  const [viewMode, setViewMode] = useState('all'); // 'all' (حركة الخزينة), 'in' (فلوس داخل), 'out' (فلوس خارج)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, unpaid, partial, paid
  const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState(''); // YYYY-MM-DD

  // Modals State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Deep-linking from Command Palette or URL query params (action=new or action=expense)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new') {
      setSelectedInvoice(null);
      setIsInvoiceModalOpen(true);
    } else if (params.get('action') === 'expense') {
      setIsExpenseModalOpen(true);
    }
  }, [location.search]);

  // Reload scoped cache on clinic change
  useEffect(() => {
    setInvoicesList(loadScopedInvoices(clinicSlug));
    setExpensesList(loadScopedExpenses(clinicSlug));
  }, [clinicSlug, clinicId]);

  // Remote Invoices Fetch
  const fetchInvoices = useCallback(async () => {
    if (!clinicId || !isSupabaseConfigured()) return;
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
  }, [clinicId]);

  // Remote Expenses Fetch
  const fetchExpenses = useCallback(async () => {
    if (!clinicId) return;
    try {
      const { data, error } = await getExpenses(clinicId);
      if (!error && data && data.length > 0) {
        setExpensesList(data);
      }
    } catch (err) {
      console.warn('Expenses background sync notice:', err);
    }
  }, [clinicId]);

  useEffect(() => {
    fetchInvoices();
    fetchExpenses();
  }, [fetchInvoices, fetchExpenses]);

  // Save to tenant-scoped localStorage when lists change
  useEffect(() => {
    safeSetJSON(`clinicflow_invoices_${clinicSlug}`, invoicesList);
  }, [invoicesList, clinicSlug]);

  useEffect(() => {
    safeSetJSON(`clinicflow_expenses_${clinicSlug}`, expensesList);
  }, [expensesList, clinicSlug]);

  // Universal Filtered Invoices (Money In)
  const filteredInvoices = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return (invoicesList || []).filter(inv => {
      if (!inv) return false;
      const pName = inv.patientName ? String(inv.patientName).toLowerCase() : '';
      const pPhone = inv.patientPhone ? String(inv.patientPhone) : '';
      const invNum = inv.invoiceNumber ? String(inv.invoiceNumber).toLowerCase() : '';

      const matchesSearch = !q || pName.includes(q) || pPhone.includes(q) || invNum.includes(q);
      const matchesStatus = statusFilter === 'all' || inv.paymentStatus === statusFilter;

      // Universal Date Range ("من تاريخ كذا إلى تاريخ كذا")
      const invDate = (inv.createdAt || inv.date || inv.issueDate || '').slice(0, 10);
      const matchesStart = !startDate || (invDate && invDate >= startDate);
      const matchesEnd = !endDate || (invDate && invDate <= endDate);

      return matchesSearch && matchesStatus && matchesStart && matchesEnd;
    });
  }, [invoicesList, searchQuery, statusFilter, startDate, endDate]);

  // Universal Filtered Expenses (Money Out)
  const filteredExpenses = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return (expensesList || []).filter(exp => {
      if (!exp) return false;
      const title = exp.title ? String(exp.title).toLowerCase() : '';
      const cat = exp.category ? String(exp.category).toLowerCase() : '';
      const notes = exp.notes ? String(exp.notes).toLowerCase() : '';
      const ref = exp.receiptRef ? String(exp.receiptRef).toLowerCase() : '';

      const matchesSearch = !q || title.includes(q) || cat.includes(q) || notes.includes(q) || ref.includes(q);

      // Universal Date Range ("من تاريخ كذا إلى تاريخ كذا")
      const expDate = (exp.date || exp.createdAt || '').slice(0, 10);
      const matchesStart = !startDate || (expDate && expDate >= startDate);
      const matchesEnd = !endDate || (expDate && expDate <= endDate);

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [expensesList, searchQuery, startDate, endDate]);

  // Financial Aggregates for Active Period
  const totalBilled = useMemo(() => {
    return filteredInvoices.reduce((acc, i) => acc + (i ? Number(i.total || i.totalAmount || i.amount || ((Number(i.paidAmount || 0) + Number(i.remainingBalance || 0))) || 0) : 0), 0);
  }, [filteredInvoices]);

  const totalInflow = useMemo(() => {
    return filteredInvoices.reduce((acc, i) => acc + (i ? Number(i.paidAmount || i.paid || 0) : 0), 0);
  }, [filteredInvoices]);

  const totalOutstanding = useMemo(() => {
    return filteredInvoices.reduce((acc, i) => acc + (i ? Number(i.remainingBalance != null ? i.remainingBalance : Math.max(0, (Number(i.total || i.totalAmount || 0) - Number(i.paidAmount || i.paid || 0)))) : 0), 0);
  }, [filteredInvoices]);

  const totalOutflow = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + (e ? Number(e.amount || 0) : 0), 0);
  }, [filteredExpenses]);

  const netCashFlow = useMemo(() => {
    return totalInflow - totalOutflow;
  }, [totalInflow, totalOutflow]);

  // Human-readable date range label
  const dateRangeLabel = useMemo(() => {
    if (startDate && endDate) {
      if (startDate === endDate) return `يوم ${startDate}`;
      return `من ${startDate} إلى ${endDate}`;
    }
    if (startDate) return `ابتداءً من تاريخ ${startDate}`;
    if (endDate) return `حتى تاريخ ${endDate}`;
    return 'كل الفترات المحاسبية (شامل)';
  }, [startDate, endDate]);

  // Invoice Handlers
  const handleOpenNew = () => {
    setSelectedInvoice(null);
    setIsInvoiceModalOpen(true);
  };
  const handleCreateInvoice = handleOpenNew;

  const handleViewInvoice = (inv) => {
    setSelectedInvoice(inv);
    setIsInvoiceModalOpen(true);
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

  // Expense Handlers
  const handleOpenNewExpense = () => {
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (newExp) => {
    const expWithClinic = {
      ...newExp,
      clinicId,
      clinic_id: clinicId
    };

    // Save to local state immediately
    setExpensesList(prev => [expWithClinic, ...prev.filter(e => e.id !== expWithClinic.id)]);

    // Remote persistence if available
    try {
      await addExpense(expWithClinic);
    } catch (err) {
      console.warn('Backend expense persistence notice:', err);
    }

    // Double-Entry General Ledger journalizing
    try {
      recordJournalEntry({
        clinicId: clinicId || 'default',
        referenceType: 'expense',
        referenceId: expWithClinic.id,
        description: expWithClinic.title,
        date: expWithClinic.date,
        lines: [
          {
            accountCode: CHART_OF_ACCOUNTS.OPERATING_EXPENSE.code,
            accountName: expWithClinic.category || CHART_OF_ACCOUNTS.OPERATING_EXPENSE.nameAr,
            debit: expWithClinic.amount,
            credit: 0
          },
          {
            accountCode: expWithClinic.paymentMethod === 'cash' ? CHART_OF_ACCOUNTS.CASH_ON_HAND.code : CHART_OF_ACCOUNTS.BANK_INSTAPAY.code,
            accountName: expWithClinic.paymentMethod === 'cash' ? CHART_OF_ACCOUNTS.CASH_ON_HAND.nameAr : CHART_OF_ACCOUNTS.BANK_INSTAPAY.nameAr,
            debit: 0,
            credit: expWithClinic.amount
          }
        ]
      });
    } catch (ledgerErr) {
      console.warn('General ledger entry note:', ledgerErr.message);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف سند الصرف هذا؟')) {
      return;
    }
    setExpensesList(prev => prev.filter(e => e.id !== expenseId));
    try {
      await apiDeleteExpense(expenseId, clinicId);
    } catch (err) {
      console.warn('Expense deletion notice:', err);
    }
  };

  // Universal CSV Export
  const handleExportCSV = () => {
    let headers = [];
    let rows = [];

    if (viewMode === 'out') {
      headers = ['تاريخ الصرف', 'بيان المصروف', 'التصنيف', 'طريقة الصرف', 'المبلغ المنصرف (ج.م)', 'رقم الإيصال', 'ملاحظات'];
      rows = filteredExpenses.map(exp => [
        exp.date ? new Date(exp.date).toLocaleDateString('ar-EG') : '',
        `"${(exp.title || '').replace(/"/g, '""')}"`,
        exp.category || '',
        exp.paymentMethod || '',
        exp.amount || 0,
        exp.receiptRef || '',
        `"${(exp.notes || '').replace(/"/g, '""')}"`
      ]);
    } else if (viewMode === 'in') {
      headers = ['رقم الفاتورة', 'المريض', 'رقم الهاتف', 'الإجمالي', 'المدفوع (المحصل)', 'المتبقي', 'الحالة', 'التاريخ'];
      rows = filteredInvoices.map(inv => [
        inv.invoiceNumber,
        `"${(inv.patientName || '').replace(/"/g, '""')}"`,
        inv.patientPhone || '',
        inv.total || inv.totalAmount || (Number(inv.paidAmount || 0) + Number(inv.remainingBalance || 0)),
        inv.paidAmount || inv.paid || 0,
        inv.remainingBalance != null ? inv.remainingBalance : Math.max(0, (Number(inv.total || inv.totalAmount || 0) - Number(inv.paidAmount || inv.paid || 0))),
        inv.paymentStatus,
        new Date(inv.createdAt).toLocaleDateString('ar-EG')
      ]);
    } else {
      // Unified Cash Flow Export
      headers = ['نوع الحركة', 'البيان', 'المرجع / الرقم', 'التاريخ', 'طريقة السداد', 'فلوس داخل (+ ج.م)', 'فلوس خارج (- ج.م)', 'الحالة'];
      const inRows = filteredInvoices.map(inv => [
        'فلوس داخل (مقبوضات)',
        `"فاتورة علاجية - ${(inv.patientName || '').replace(/"/g, '""')}"`,
        inv.invoiceNumber,
        new Date(inv.createdAt).toLocaleDateString('ar-EG'),
        inv.paymentMethod || 'نقداً',
        inv.paidAmount || inv.paid || 0,
        0,
        inv.paymentStatus
      ]);
      const outRows = filteredExpenses.map(exp => [
        'فلوس خارج (مصروفات)',
        `"${(exp.title || '').replace(/"/g, '""')} (${exp.category || ''})"`,
        exp.receiptRef || 'سند صرف',
        exp.date ? new Date(exp.date).toLocaleDateString('ar-EG') : '',
        exp.paymentMethod || 'نقداً',
        0,
        exp.amount || 0,
        'منصرفة'
      ]);
      rows = [...inRows, ...outRows];
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ClinicFlow_CashFlow_${viewMode}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="invoices-page" dir="rtl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>مركز الحسابات وحركة الخزينة (داخل وخارج)</h1>
          <p>متابعة السيولة النقدية: فلوس داخل (تحصيلات وكشوفات) مقابل فلوس خارج (مصروفات العيادة)</p>
        </div>
        <div className="header-actions-btns" style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button onClick={handleExportCSV} className="btn btn-secondary">
            <Download size={16} />
            <span>تصدير كشف حساب (CSV)</span>
          </button>
          <button 
            onClick={handleOpenNewExpense} 
            className="btn btn-primary"
            style={{ backgroundColor: 'var(--danger, #DC2626)', borderColor: 'var(--danger, #DC2626)', color: '#FFFFFF' }}
          >
            <ArrowUpRight size={17} />
            <span>تسجيل مصروف (فلوس خارج)</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (Cash Flow Center: فلوس داخل / فلوس خارج / صافي الخزينة / المستحقات) */}
      <FeatureErrorBoundary featureName="Cash Flow Metrics Grid">
        <InvoicesMetricsGrid
          totalBilled={totalBilled}
          totalCollected={totalInflow}
          totalInflow={totalInflow}
          totalOutflow={totalOutflow}
          netCashFlow={netCashFlow}
          totalOutstanding={totalOutstanding}
          invoicesCount={filteredInvoices.length}
          expensesCount={filteredExpenses.length}
          dateRangeLabel={dateRangeLabel}
        />
      </FeatureErrorBoundary>

      {/* Search & Universal Date Filter Bar */}
      <FeatureErrorBoundary featureName="Invoices Filters Bar">
        <InvoicesFiltersBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          totalCount={filteredInvoices.length + filteredExpenses.length}
          viewMode={viewMode}
          setViewMode={setViewMode}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          inflowCount={filteredInvoices.length}
          outflowCount={filteredExpenses.length}
        />
      </FeatureErrorBoundary>

      {/* Invoices & Expenses Cash Flow Table */}
      <FeatureErrorBoundary featureName="Invoices & Expenses Data Table">
        <InvoicesTable
          isLoading={isLoading}
          loadError={loadError}
          fetchInvoices={fetchInvoices}
          filteredInvoices={filteredInvoices}
          filteredExpenses={filteredExpenses}
          viewMode={viewMode}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          setSearchQuery={setSearchQuery}
          setStatusFilter={setStatusFilter}
          handleOpenNew={handleOpenNew}
          handleOpenNewExpense={handleOpenNewExpense}
          handleViewInvoice={handleViewInvoice}
          handleDeleteExpense={handleDeleteExpense}
        />
      </FeatureErrorBoundary>

      {/* Invoice Details Modal */}
      <FeatureErrorBoundary featureName="Invoice Details Modal">
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          invoice={selectedInvoice}
          clinicInfo={currentClinic}
          onClose={() => setIsInvoiceModalOpen(false)}
          onSaveInvoice={handleSaveInvoice}
        />
      </FeatureErrorBoundary>

      {/* Expense Modal (سند صرف نقدية - فلوس خارج) */}
      <FeatureErrorBoundary featureName="Expense Recording Modal">
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onSaveExpense={handleSaveExpense}
        />
      </FeatureErrorBoundary>
    </div>
  );
};

export default Invoices;

