import React, { useState } from 'react';
import { addTreatmentPlan, updateTreatmentPlanStatus, deleteTreatmentPlan } from '../services/treatmentPlansService';
import { addInvoice } from '../services/invoicesService';
import { 
  FileSpreadsheet, Plus, Trash2, CheckCircle2, 
  Calendar, Clock, DollarSign, Edit3, X, ChevronDown, Receipt 
} from 'lucide-react';
import './TreatmentPlanModal.css';

const TreatmentPlanModal = ({ patientId, plans = [], onPlansUpdate, onClose }) => {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [invoiceNotice, setInvoiceNotice] = useState(null);
  const [planTitle, setPlanTitle] = useState('خطة علاج وتأهيل الأسنان الشاملة');
  const [planNotes, setPlanNotes] = useState('');
  const [items, setItems] = useState([
    { toothNumber: '16', surface: 'O', procedureName: 'حشو عصب ثلاثي الجذور (RCT)', fee: 800, discount: 0 },
    { toothNumber: '16', surface: 'WHOLE', procedureName: 'تاج / طربوش زيركون (Zirconia Crown)', fee: 1800, discount: 100 },
    { toothNumber: '24', surface: 'MOD', procedureName: 'حشو تجميلي كومبوزيت مركب', fee: 500, discount: 0 }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const handleConvertToInvoice = async (plan) => {
    const invoiceNum = 'INV-' + Math.floor(1000 + Math.random() * 9000);
    const invoiceData = {
      id: 'inv_' + Date.now(),
      patientId: plan.patientId || patientId,
      invoiceNumber: invoiceNum,
      subtotal: Number(plan.totalCost || 0),
      discount: Number(plan.discount || 0),
      taxPercentage: 0,
      taxAmount: 0,
      total: Number(plan.netCost || plan.totalCost || 0),
      patientShare: Number(plan.netCost || plan.totalCost || 0),
      paidAmount: 0,
      remainingBalance: Number(plan.netCost || plan.totalCost || 0),
      paymentStatus: 'unpaid',
      notes: `مُصدرة آلياً من خطة علاج: ${plan.title}`,
      items: (plan.items || []).map((it, idx) => ({
        id: `it_${Date.now()}_${idx}`,
        name: `${it.procedureName} (سن #${it.toothNumber || 'عام'})`,
        price: Number(it.fee || 0),
        discount: Number(it.discount || 0)
      })),
      createdAt: new Date().toISOString()
    };

    try {
      await addInvoice(invoiceData);
      setInvoiceNotice(`تم إنشاء الفاتورة (${invoiceNum}) بنجاح وتحويلها للتحصيل!`);
      setTimeout(() => setInvoiceNotice(null), 4000);
    } catch (err) {
      console.error('Error converting plan to invoice:', err);
    }
  };


  // Common quick procedures
  const quickProcedures = [
    { name: 'كشف وفحص تشخيصي مع تنظيف جير', fee: 350 },
    { name: 'حشو تجميلي كومبوزيت سطحي', fee: 400 },
    { name: 'حشو تجميلي كومبوزيت عميق', fee: 600 },
    { name: 'علاج جذور وعصب (RCT) أمامي', fee: 700 },
    { name: 'علاج جذور وعصب (RCT) ضروس', fee: 1100 },
    { name: 'طربوش زيركون الماني عالي الدقة', fee: 1800 },
    { name: 'طربوش E-max تجميلي فائق الشفافية', fee: 2200 },
    { name: 'زرعة أسنان سويسرية متقدمة', fee: 7000 },
    { name: 'خلع ضرس عقل جراحي مدفون', fee: 1200 }
  ];

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { toothNumber: '', surface: 'WHOLE', procedureName: '', fee: 0, discount: 0 }
    ]);
  };

  const handleRemoveItem = (index) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const subtotal = items.reduce((acc, curr) => acc + Number(curr.fee || 0), 0);
  const totalDiscount = items.reduce((acc, curr) => acc + Number(curr.discount || 0), 0);
  const netTotal = subtotal - totalDiscount;

  const handleSavePlan = async () => {
    if (!planTitle || items.length === 0) return;
    setIsSaving(true);

    const newPlan = {
      id: Date.now().toString(),
      patientId,
      title: planTitle,
      totalCost: subtotal,
      discount: totalDiscount,
      netCost: netTotal,
      status: 'accepted',
      notes: planNotes,
      items: items.map((it, idx) => ({
        ...it,
        id: `item_${Date.now()}_${idx}`,
        netFee: Number(it.fee || 0) - Number(it.discount || 0)
      })),
      createdAt: new Date().toISOString()
    };

    try {
      await addTreatmentPlan(newPlan);
      if (onPlansUpdate) {
        onPlansUpdate([newPlan, ...plans]);
      }
      setIsCreatingNew(false);
    } catch (err) {
      console.error('Error creating treatment plan:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (planId, newStatus) => {
    try {
      await updateTreatmentPlanStatus(planId, newStatus);
      if (onPlansUpdate) {
        onPlansUpdate(plans.map(p => p.id === planId ? { ...p, status: newStatus } : p));
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeletePlan = async (planId) => {
    try {
      await deleteTreatmentPlan(planId);
      if (onPlansUpdate) {
        onPlansUpdate(plans.filter(p => p.id !== planId));
      }
    } catch (err) {
      console.error('Error deleting plan:', err);
    }
  };

  return (
    <div className="treatment-plan-modal-overlay">
      <div className="treatment-plan-modal-card">
        
        <div className="modal-header-navy">
          <div className="header-title-flex">
            <FileSpreadsheet size={22} className="text-nebras-orange" />
            <div>
              <h3>خطط العلاج والتأهيل (Treatment Plans)</h3>
              <p>تخطيط الإجراءات السريرية، تسعير الجلسات، وتتبع نسبة الإنجاز</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-close-navy">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body-scrollable">
          
          {!isCreatingNew ? (
            <div className="plans-list-view">
              {invoiceNotice && (
                <div className="plan-invoice-alert">
                  <CheckCircle2 size={16} className="text-success" />
                  <span>{invoiceNotice}</span>
                </div>
              )}


              <div className="plans-top-actions">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(true)}
                  className="btn-create-new-plan"
                >
                  <Plus size={16} />
                  <span>إنشاء خطة علاج جديدة للمريض</span>
                </button>
              </div>


              {plans.length === 0 ? (
                <div className="empty-plans-state">
                  <FileSpreadsheet size={36} className="text-muted" />
                  <h4>لا توجد خطط علاج مسجلة لهذا المريض</h4>
                  <p>يمكنك إنشاء خطة علاج وتأهيل مقسمة على جلسات مع حساب التكلفة والخصومات.</p>
                </div>
              ) : (
                <div className="plans-grid">
                  {plans.map(plan => (
                    <div key={plan.id} className="plan-summary-card">
                      <div className="plan-card-header">
                        <div>
                          <h5>{plan.title}</h5>
                          <span className="plan-date">
                            {new Date(plan.createdAt).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                        <div className="plan-header-controls">
                          <select
                            className={`plan-status-select ${plan.status}`}
                            value={plan.status}
                            onChange={(e) => handleStatusChange(plan.id, e.target.value)}
                          >
                            <option value="draft">مسودة (Draft)</option>
                            <option value="presented">معروضة للمريض</option>
                            <option value="accepted">معتمدة من المريض</option>
                            <option value="in_progress">قيد التنفيذ</option>
                            <option value="completed">مكتملة بالكامل</option>
                          </select>
                          <button
                            onClick={() => handleDeletePlan(plan.id)}
                            className="btn-delete-plan"
                            title="حذف الخطة"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Items table */}
                      <div className="plan-items-table-wrap">
                        <table className="plan-table">
                          <thead>
                            <tr>
                              <th>رقم السن</th>
                              <th>السطح</th>
                              <th>الإجراء السريري المطلوب</th>
                              <th>التكلفة</th>
                              <th>الخصم</th>
                              <th>الصافي</th>
                              <th>الحالة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(plan.items || []).map((it, idx) => (
                              <tr key={idx}>
                                <td><strong className="tooth-code">#{it.toothNumber || '—'}</strong></td>
                                <td>{it.surface || 'السن كامل'}</td>
                                <td>{it.procedureName}</td>
                                <td>{it.fee} ج.م</td>
                                <td>{it.discount ? `${it.discount} ج.م` : '—'}</td>
                                <td><strong>{it.netFee || it.fee} ج.م</strong></td>
                                <td>
                                  <span className={`item-badge ${it.status || 'pending'}`}>
                                    {it.status === 'completed' ? 'تم' : 'مطلوب'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Financial Footer */}
                      <div className="plan-financial-strip">
                        <div className="strip-info-group">
                          <span>إجمالي البنود: <strong>{plan.items?.length || 0} إجراءات</strong></span>
                          <div className="price-summary-pills">
                            <span className="price-pill subtotal">الإجمالي: {plan.totalCost} ج.م</span>
                            {plan.discount > 0 && (
                              <span className="price-pill discount">الخصم: -{plan.discount} ج.م</span>
                            )}
                            <span className="price-pill net">الصافي: {plan.netCost} ج.م</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleConvertToInvoice(plan)}
                          className="btn-convert-invoice"
                          title="تحويل خطة العلاج إلى فاتورة تحصيل رسمية"
                        >
                          <Receipt size={14} />
                          <span>تحويل لفاتورة تحصيل</span>
                        </button>
                      </div>


                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Creation Form */
            <div className="create-plan-form">
              
              <div className="form-top-fields">
                <div className="field-block">
                  <label>مسمى خطة العلاج *</label>
                  <input
                    type="text"
                    className="plan-input"
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                    placeholder="مثال: خطة تركيبات وتجميل الأسنان الأمامية..."
                    required
                  />
                </div>
                <div className="field-block">
                  <label>ملاحظات عامة</label>
                  <input
                    type="text"
                    className="plan-input"
                    value={planNotes}
                    onChange={(e) => setPlanNotes(e.target.value)}
                    placeholder="ملاحظات حول طريقة السداد أو التفضيلات..."
                  />
                </div>
              </div>

              {/* Quick Add Procedures */}
              <div className="quick-procedures-block">
                <span className="quick-lbl">إضافة سريعة من قائمة الإجراءات الشائعة:</span>
                <div className="quick-tags-wrap">
                  {quickProcedures.map((proc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="quick-proc-tag"
                      onClick={() => {
                        setItems(prev => [
                          ...prev,
                          { toothNumber: '', surface: 'WHOLE', procedureName: proc.name, fee: proc.fee, discount: 0 }
                        ]);
                      }}
                    >
                      <span>+ {proc.name}</span>
                      <strong className="tag-fee">({proc.fee} ج.م)</strong>
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Table Editor */}
              <div className="editor-table-wrap">
                <table className="editor-table">
                  <thead>
                    <tr>
                      <th style={{ width: '90px' }}>السن #</th>
                      <th style={{ width: '120px' }}>السطح</th>
                      <th>الإجراء المطلوب</th>
                      <th style={{ width: '120px' }}>التكلفة (ج.م)</th>
                      <th style={{ width: '100px' }}>خصم (ج.م)</th>
                      <th style={{ width: '110px' }}>الصافي</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const net = Number(item.fee || 0) - Number(item.discount || 0);
                      return (
                        <tr key={idx}>
                          <td>
                            <input
                              type="number"
                              className="table-input"
                              placeholder="16"
                              value={item.toothNumber}
                              onChange={(e) => handleItemChange(idx, 'toothNumber', e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              className="table-select"
                              value={item.surface}
                              onChange={(e) => handleItemChange(idx, 'surface', e.target.value)}
                            >
                              <option value="WHOLE">كامل</option>
                              <option value="O">إطباقي (O)</option>
                              <option value="M">إنسي (M)</option>
                              <option value="D">وحشي (D)</option>
                              <option value="B">دهليزي (B)</option>
                              <option value="L">لساني (L)</option>
                              <option value="ROOT">جذر</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              className="table-input"
                              placeholder="اسم الإجراء..."
                              value={item.procedureName}
                              onChange={(e) => handleItemChange(idx, 'procedureName', e.target.value)}
                              required
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="table-input"
                              value={item.fee}
                              onChange={(e) => handleItemChange(idx, 'fee', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="table-input"
                              value={item.discount}
                              onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                            />
                          </td>
                          <td>
                            <strong className="net-display">{net} ج.م</strong>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="btn-remove-row"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="editor-bottom-bar">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="btn-add-item-row"
                >
                  <Plus size={15} />
                  <span>إضافة إجراء آخر للخطة</span>
                </button>

                <div className="total-calculator-box">
                  <div className="calc-item">
                    <span>الإجمالي قبل الخصم:</span>
                    <strong>{subtotal} ج.م</strong>
                  </div>
                  <div className="calc-item">
                    <span>إجمالي الخصومات:</span>
                    <strong className="text-discount">-{totalDiscount} ج.م</strong>
                  </div>
                  <div className="calc-item grand-total">
                    <span>صافي تكلفة الخطة:</span>
                    <strong className="text-net">{netTotal} ج.م</strong>
                  </div>
                </div>
              </div>

              <div className="form-actions-bottom">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="btn-back-plans"
                >
                  رجوع للقائمة
                </button>
                <button
                  type="button"
                  onClick={handleSavePlan}
                  disabled={isSaving || !planTitle || items.length === 0}
                  className="btn-save-final-plan"
                >
                  <CheckCircle2 size={16} />
                  <span>{isSaving ? 'جاري الحفظ...' : 'اعتماد وحفظ خطة العلاج'}</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default TreatmentPlanModal;
