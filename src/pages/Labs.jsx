import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Layers, Plus, Search, Clock, CheckCircle2, 
  AlertCircle, ChevronRight, Calendar, Settings, RefreshCw 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTenant } from '../context/TenantContext';
import LabOrderModal from '../components/LabOrderModal';
import { Skeleton } from '../components/ui/Skeleton';
import { 
  getLabOrders, addLabOrder, updateLabOrderStatus, 
  LAB_ORDER_STATUSES 
} from '../services/labsService';
import { safeGetJSON, safeSetJSON } from '../utils/safeStorage';
import './Labs.css';

const Labs = () => {
  const location = useLocation();
  const { state } = useApp();
  const { tenant } = useTenant();
  const currentClinicId = tenant?.id || state?.clinicInfo?.id || '550e8400-e29b-41d4-a716-446655440000';
  const currentSlug = tenant?.slug || state?.clinicInfo?.slug || 'dr-ahmed';

  const clinicModules = tenant?.modules || state.clinicInfo?.modules || {};
  const isEnabled = Boolean(tenant?.enableLabs ?? state.clinicInfo?.enableLabs ?? clinicModules.labs);

  const loadScopedOrders = useCallback(() => {
    const parsed = safeGetJSON(`clinicflow_labs_${currentSlug}`, null);
    if (Array.isArray(parsed)) return parsed;
    return [];
  }, [currentSlug]);

  const [orders, setOrders] = useState(loadScopedOrders);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Deep-linking from Command Palette (action=new)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new') {
      setIsModalOpen(true);
    }
  }, [location.search]);

  useEffect(() => {
    setOrders(loadScopedOrders());
  }, [loadScopedOrders]);

  useEffect(() => {
    safeSetJSON(`clinicflow_labs_${currentSlug}`, orders);
  }, [orders, currentSlug]);

  const fetchOrders = async () => {
    if (!currentClinicId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await getLabOrders(currentClinicId);
      if (error) throw error;
      if (data && data.length > 0) {
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to load lab orders:', err);
      setLoadError('تعذر تحميل طلبات المعامل من الخادم. يرجى إعادة المحاولة.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentClinicId]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Clinic scoping
      if (o.clinicId && currentClinicId && o.clinicId !== currentClinicId) return false;

      const matchesSearch = 
        (o.patientName && o.patientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.labName && o.labName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.workType && o.workType.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter, currentClinicId]);

  const handleSaveOrder = async (newOrder) => {
    const orderWithClinic = {
      ...newOrder,
      clinicId: currentClinicId,
      clinic_id: currentClinicId
    };
    await addLabOrder(orderWithClinic);
    setOrders(prev => [orderWithClinic, ...prev]);
  };

  const handleAdvanceStatus = async (orderId, currentStatus) => {
    const sequence = ['pending', 'sent', 'first_try', 'adjustment', 'final_try', 'delivered'];
    const currIdx = sequence.indexOf(currentStatus);
    if (currIdx >= 0 && currIdx < sequence.length - 1) {
      const nextStatus = sequence[currIdx + 1];
      await updateLabOrderStatus(orderId, nextStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
    }
  };

  if (!isEnabled) {
    return (
      <div className="labs-container" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '540px', margin: '3rem auto', padding: '2.5rem', borderRadius: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <Layers size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
            ميزة معمل التركيبات والتحاليل غير مفعلة
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            هذه الميزة مخصصة للعيادات التي ترسل وتستقبل طلبات من معامل الأسنان والتحاليل الخارجية. يمكنك تفعيلها فوراً من إعدادات العيادة.
          </p>
          <a 
            href="/settings?tab=clinic"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem', textDecoration: 'none' }}
          >
            <Settings size={18} />
            <span>الانتقال لإعدادات العيادة لتفعيل الميزة</span>
          </a>
        </div>
      </div>
    );
  }

  // Metrics
  const activeOrdersCount = orders.filter(o => o.status !== 'delivered').length;
  const waitingDelivery = orders.filter(o => o.status === 'first_try' || o.status === 'final_try').length;
  const totalLabExpenses = orders.reduce((acc, o) => acc + Number(o.cost || 0), 0);

  return (
    <div className="labs-page">
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>إدارة المعامل وتتبع التركيبات (Lab Orders & Tracking)</h1>
          <p>متابعة مراحل التيجان، الجسور، الأطقم، والعدسات من تاريخ الإرسال حتى التسليم للمريض (ClinicFlow Lab Management)</p>
        </div>
        <div className="header-actions-btns">
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            <Plus size={18} />
            <span>إصدار طلب معمل جديد</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="labs-metrics-grid">
        <div className="lab-metric-card">
          <div className="metric-icon-wrap blue"><Layers size={22} /></div>
          <div>
            <span className="metric-lbl">الطلبات الجارية بالمعامل</span>
            <strong className="metric-val">{activeOrdersCount} طلب</strong>
          </div>
        </div>

        <div className="lab-metric-card">
          <div className="metric-icon-wrap orange"><Clock size={22} /></div>
          <div>
            <span className="metric-lbl">جاهزة للبروفة والتسليم</span>
            <strong className="metric-val">{waitingDelivery} طلب</strong>
          </div>
        </div>

        <div className="lab-metric-card">
          <div className="metric-icon-wrap green"><CheckCircle2 size={22} /></div>
          <div>
            <span className="metric-lbl">تم تسليمها وتثبيتها</span>
            <strong className="metric-val text-success">{orders.filter(o => o.status === 'delivered').length} تركيبة</strong>
          </div>
        </div>

        <div className="lab-metric-card">
          <div className="metric-icon-wrap purple"><AlertCircle size={22} /></div>
          <div>
            <span className="metric-lbl">إجمالي مصاريف المعامل</span>
            <strong className="metric-val">{totalLabExpenses.toLocaleString()} ج.م</strong>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="filters-bar glass-card" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: '240px' }}>
          <Search size={18} className="search-icon" aria-hidden="true" />
          <input
            type="text"
            placeholder="بحث بالمريض، المعمل، أو نوع التركيبة..."
            aria-label="بحث بالمريض، المعمل، أو نوع التركيبة"
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="status-filter-pills" role="tablist" aria-label="تصفية طلبات المعمل حسب الحالة">
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'all'}
            className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            الكل ({orders.length})
          </button>
          {LAB_ORDER_STATUSES.map(st => (
            <button
              key={st.key}
              type="button"
              role="tab"
              aria-selected={statusFilter === st.key}
              className={`filter-pill ${statusFilter === st.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(st.key)}
            >
              {st.labelAr}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-card table-responsive-container">
        <table className="labs-main-table">
          <thead>
            <tr>
              <th>المريض</th>
              <th>المعمل</th>
              <th>نوع التركيبة</th>
              <th>السن</th>
              <th>اللون (Shade)</th>
              <th>التكلفة</th>
              <th>تاريخ الاستلام</th>
              <th>الحالة الحالية</th>
              <th>المرحلة التالية</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`lab-order-skel-${idx}`}>
                  <td><Skeleton style={{ height: '18px', width: '130px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '110px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '90px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '50px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '60px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '70px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '80px', borderRadius: '4px' }} /></td>
                  <td><Skeleton style={{ height: '18px', width: '70px', borderRadius: '12px' }} /></td>
                  <td><Skeleton style={{ height: '28px', width: '90px', borderRadius: '6px' }} /></td>
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
                      className="btn-advance-status"
                      style={{ marginTop: '0.5rem', padding: '0.45rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      onClick={fetchOrders}
                    >
                      <RefreshCw size={15} />
                      <span>إعادة المحاولة الآن</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                    <Layers size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} aria-hidden="true" />
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {searchQuery || statusFilter !== 'all'
                        ? 'لا توجد طلبات معمل مطابقة لمعايير البحث والتصفية'
                        : 'لا توجد طلبات معامل مسجلة حتى الآن'}
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
                      {searchQuery || statusFilter !== 'all'
                        ? 'جرّب البحث باسم معمل أو مريض آخر أو إعادة تعيين حالة التصفية.'
                        : 'يمكنك إرسال طلب طربوش، فينير، أو طقم متحرك جديد ومتابعة مراحل التصنيع.'}
                    </p>
                    {searchQuery || statusFilter !== 'all' ? (
                      <button
                        type="button"
                        className="btn-advance-status"
                        style={{ marginTop: '0.5rem', padding: '0.45rem 1rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                        onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                      >
                        إعادة ضبط الفلاتر
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-advance-status"
                        style={{ marginTop: '0.5rem', padding: '0.45rem 1rem' }}
                        onClick={() => setIsModalOpen(true)}
                      >
                        <Plus size={16} />
                        <span>إرسال أول طلب للمعمل</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => {
                const statusObj = LAB_ORDER_STATUSES.find(s => s.key === order.status);
                return (
                  <tr key={order.id}>
                    <td><strong>{order.patientName}</strong></td>
                    <td>{order.labName}</td>
                    <td>{order.workType}</td>
                    <td>{order.toothNumber ? `#${order.toothNumber}` : '—'}</td>
                    <td><span className="shade-badge">{order.shade || 'A2'}</span></td>
                    <td>{order.cost} ج.م</td>
                    <td>
                      <span className="due-date-pill">
                        <Calendar size={12} />
                        {order.dueDate}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="lab-status-badge"
                        style={{ 
                          backgroundColor: `${statusObj?.color || '#64748B'}15`,
                          color: statusObj?.color || '#64748B',
                          border: `1px solid ${statusObj?.color || '#64748B'}40`
                        }}
                      >
                        {statusObj?.labelAr || order.status}
                      </span>
                    </td>
                    <td>
                      {order.status !== 'delivered' ? (
                        <button
                          onClick={() => handleAdvanceStatus(order.id, order.status)}
                          className="btn-advance-status"
                          title="ترقية الطلب للمرحلة التالية"
                        >
                          <span>المرحلة التالية</span>
                          <ChevronRight size={14} />
                        </button>
                      ) : (
                        <span className="completed-check">
                          <CheckCircle2 size={15} /> تم التثبيت
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <LabOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveOrder={handleSaveOrder}
        patients={state.patients || []}
      />

    </div>
  );
};

export default Labs;
