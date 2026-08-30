import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, Plus, Search, Filter, Clock, CheckCircle2, 
  AlertCircle, ChevronRight, Phone, Calendar, Download, Eye 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import LabOrderModal from '../components/LabOrderModal';
import { 
  getLabOrders, addLabOrder, updateLabOrderStatus, 
  LAB_ORDER_STATUSES 
} from '../services/labsService';
import './Labs.css';

const Labs = () => {
  const { state } = useApp();
  const [orders, setOrders] = useState([
    {
      id: 'lab-101',
      patientName: 'أحمد محمود سليمان',
      labName: 'معمل الأهرام للتركيبات الرقمية',
      workType: 'طربوش زيركون (Zirconia Crown)',
      toothNumber: 16,
      shade: 'A2',
      cost: 450,
      status: 'first_try',
      sentDate: '2026-08-25',
      dueDate: '2026-08-31',
      notes: 'إطباق خفيف مع نقطة تماس دقيقة',
      createdAt: new Date().toISOString()
    },
    {
      id: 'lab-102',
      patientName: 'مريم علي عبد الله',
      labName: 'معمل الدقي للأسنان',
      workType: 'عدسة / فينير تجميلي (Veneer)',
      toothNumber: 11,
      shade: 'Bleach 2 (BL2)',
      cost: 650,
      status: 'sent',
      sentDate: '2026-08-28',
      dueDate: '2026-09-03',
      notes: 'شفافية عالية في طرف السن',
      createdAt: new Date().toISOString()
    },
    {
      id: 'lab-103',
      patientName: 'طارق حسام نبيل',
      labName: 'معمل مودرن دنت',
      workType: 'طقم جزئي متحرك (Partial Denture)',
      toothNumber: null,
      shade: 'A3',
      cost: 900,
      status: 'delivered',
      sentDate: '2026-08-15',
      dueDate: '2026-08-22',
      receivedDate: '2026-08-21',
      notes: 'تم تثبيت الطقم بنجاح للمريض',
      createdAt: new Date().toISOString()
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await getLabOrders();
      if (data && data.length > 0) {
        setOrders(data);
      }
    }
    load();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = 
        (o.patientName && o.patientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.labName && o.labName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.workType && o.workType.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const handleSaveOrder = async (newOrder) => {
    await addLabOrder(newOrder);
    setOrders(prev => [newOrder, ...prev]);
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

  // Metrics
  const activeOrdersCount = orders.filter(o => o.status !== 'delivered').length;
  const waitingDelivery = orders.filter(o => o.status === 'first_try' || o.status === 'final_try').length;
  const totalLabExpenses = orders.reduce((acc, o) => acc + Number(o.cost || 0), 0);

  return (
    <div className="labs-page">
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>إدارة المعامل وتتبع التركيبات (Lab Orders & Tracking)</h2>
          <p>متابعة مراحل التيجان، الجسور، الأطقم، والعدسات من تاريخ الإرسال حتى التسليم للمريض (Nebras Lab Management)</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
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
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="بحث بالمريض، المعمل، أو نوع التركيبة..."
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
            الكل ({orders.length})
          </button>
          {LAB_ORDER_STATUSES.map(st => (
            <button
              key={st.key}
              type="button"
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
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                  لا توجد طلبات معمل مسجلة مطابقة.
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
