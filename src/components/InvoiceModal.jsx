import React, { useState } from 'react';
import { 
  FileText, Printer, MessageCircle, Plus, Trash2, 
  CheckCircle2, X, MapPin, Phone 
} from 'lucide-react';
import { recordPayment } from '../services/invoicesService';

import './InvoiceModal.css';

const InvoiceModal = ({ 
  invoice, 
  clinicInfo = {}, 
  isOpen, 
  onClose, 
  onSaveInvoice 
}) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  // Form State if creating new
  const [isCreatingNew, setIsCreatingNew] = useState(!invoice);
  const [patientName, setPatientName] = useState(invoice?.patientName || '');
  const [patientPhone, setPatientPhone] = useState(invoice?.patientPhone || '');
  const [items, setItems] = useState(invoice?.items || [
    { description: 'كشف واستشارة طبية شاملة', quantity: 1, unitPrice: 300, total: 300 }
  ]);
  const [discount, setDiscount] = useState(invoice?.discount || 0);
  const [taxPercent, setTaxPercent] = useState(invoice?.taxPercentage || 0);

  // Totals calculations
  const subtotal = items.reduce((acc, it) => acc + (Number(it.unitPrice || 0) * Number(it.quantity || 1)), 0);
  const taxAmount = (subtotal - Number(discount)) * (Number(taxPercent) / 100);
  const grandTotal = Math.max(0, subtotal - Number(discount) + taxAmount);
  const patientShare = grandTotal;

  const handleAddItem = () => {
    setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const handleRemoveItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = Number(field === 'quantity' ? value : updated[index].quantity || 1);
        const price = Number(field === 'unitPrice' ? value : updated[index].unitPrice || 0);
        updated[index].total = qty * price;
      }
      return updated;
    });
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!patientName || items.length === 0) return;

    const newInv = {
      id: 'inv_' + Date.now(),
      invoiceNumber: 'INV-' + Math.floor(1000 + Math.random() * 9000),
      patientName,
      patientPhone,
      items,
      subtotal,
      discount: Number(discount),
      taxPercentage: Number(taxPercent),
      taxAmount,
      total: grandTotal,
      patientShare,
      paidAmount: 0,
      remainingBalance: patientShare,
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString()
    };

    if (onSaveInvoice) onSaveInvoice(newInv);
    onClose();
  };

  const handleAddPaymentClick = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) return;
    setIsRecordingPayment(true);

    try {
      await recordPayment(invoice.id, {
        patientId: invoice.patientId,
        amount: Number(paymentAmount),
        paymentMethod
      });
      setPaymentAmount('');
      if (onSaveInvoice) {
        onSaveInvoice({
          ...invoice,
          paidAmount: Number(invoice.paidAmount || 0) + Number(paymentAmount),
          remainingBalance: Math.max(0, Number(invoice.remainingBalance || invoice.patientShare) - Number(paymentAmount))
        });
      }
    } catch (err) {
      console.error('Error recording payment:', err);
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const currentInv = invoice || {
    invoiceNumber: 'INV-PREVIEW',
    patientName,
    patientPhone,
    items,
    subtotal,
    discount,
    taxAmount,
    total: grandTotal,
    patientShare,
    paidAmount: 0,
    remainingBalance: patientShare,
    paymentStatus: 'unpaid',
    createdAt: new Date().toISOString()
  };

  const cleanPhone = (currentInv.patientPhone || '').replace(/\D/g, '');
  const whatsappReceipt = encodeURIComponent(
    `فاتورة علاجية من: ${clinicInfo.name || 'العيادة'}\n` +
    `رقم الفاتورة: ${currentInv.invoiceNumber}\n` +
    `المريض: ${currentInv.patientName}\n` +
    `الإجمالي: ${currentInv.patientShare} ج.م\n` +
    `المدفوع: ${currentInv.paidAmount} ج.م\n` +
    `المتبقي: ${currentInv.remainingBalance} ج.م`
  );

  if (!isOpen) return null;

  return (
    <div className="invoice-modal-overlay">
      <div className="invoice-modal-card">
        
        {/* Modal Controls Top Bar */}
        <div className="invoice-controls-bar">
          <div className="ctrl-left">
            <button 
              type="button" 
              onClick={() => window.print()} 
              className="btn-inv-action print"
            >
              <Printer size={16} />
              <span>طباعة إيصال الفاتورة</span>
            </button>
            {cleanPhone && (
              <a
                href={`https://wa.me/2${cleanPhone}?text=${whatsappReceipt}`}
                target="_blank"
                rel="noreferrer"
                className="btn-inv-action whatsapp"
              >
                <MessageCircle size={16} />
                <span>إرسال عبر الواتساب</span>
              </a>
            )}
          </div>
          <button onClick={onClose} className="btn-inv-close">
            <X size={18} />
          </button>
        </div>

        {/* Printable Official Invoice Sheet */}
        <div className="printable-invoice-sheet">
          
          {/* Letterhead */}
          <div className="invoice-letterhead">
            <div className="clinic-meta">
              <h2>{clinicInfo.name || 'مركز طب وتجميل الأسنان'}</h2>
              <p className="dr-title">{clinicInfo.doctorName} — {clinicInfo.specialty}</p>
              <p className="clinic-sub-info"><MapPin size={12} /> {clinicInfo.address}</p>
              <p className="clinic-sub-info"><Phone size={12} /> {clinicInfo.phone}</p>
            </div>
            <div className="invoice-badge-box">
              <span className="inv-badge-label">فاتورة علاجية رسمية</span>
              <strong className="inv-num">{currentInv.invoiceNumber}</strong>
              <span className="inv-date">
                التاريخ: {new Date(currentInv.createdAt).toLocaleDateString('ar-EG')}
              </span>
            </div>
          </div>

          {/* Patient Details Row */}
          <div className="invoice-patient-banner">
            <div className="banner-item">
              <span className="lbl">اسم المريض:</span>
              <strong className="val">{currentInv.patientName || 'عميل نقدي'}</strong>
            </div>
            <div className="banner-item">
              <span className="lbl">رقم الهاتف:</span>
              <strong className="val" dir="ltr">{currentInv.patientPhone || '—'}</strong>
            </div>
            <div className="banner-item">
              <span className="lbl">حالة السداد:</span>
              <span className={`status-pill ${currentInv.paymentStatus}`}>
                {currentInv.paymentStatus === 'paid' ? 'مدفوعة بالكامل' : currentInv.paymentStatus === 'partial' ? 'سداد جزئي' : 'مستحقة للدفع'}
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          {isCreatingNew ? (
            <div className="inv-items-editor">
              <label className="section-title">بنود الفاتورة والإجراءات:</label>
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>بيان الإجراء أو العلاج</th>
                    <th style={{ width: '80px' }}>العدد</th>
                    <th style={{ width: '120px' }}>سعر الوحدة</th>
                    <th style={{ width: '120px' }}>الإجمالي</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          className="table-txt-input"
                          placeholder="وصف الخدمة أو الإجراء..."
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="table-txt-input"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="table-txt-input"
                          value={it.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        />
                      </td>
                      <td>
                        <strong>{Number(it.unitPrice || 0) * Number(it.quantity || 1)} ج.م</strong>
                      </td>
                      <td>
                        <button type="button" onClick={() => handleRemoveItem(idx)} className="btn-del-row">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button type="button" onClick={handleAddItem} className="btn-add-table-row">
                <Plus size={14} />
                <span>إضافة بند آخر</span>
              </button>
            </div>
          ) : (
            <table className="inv-table printable-table">
              <thead>
                <tr>
                  <th>م</th>
                  <th>بيان الإجراء الطبي أو المستلزمات</th>
                  <th>الكمية</th>
                  <th>سعر الوحدة</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {(currentInv.items || []).map((it, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{it.description}</td>
                    <td>{it.quantity || 1}</td>
                    <td>{it.unitPrice || it.fee || 0} ج.م</td>
                    <td><strong>{it.total || ((it.unitPrice || 0) * (it.quantity || 1))} ج.م</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Financial Breakdown Summary */}
          <div className="invoice-bottom-totals">
            <div className="totals-table">
              <div className="total-line">
                <span>إجمالي الخدمات:</span>
                <strong>{subtotal} ج.م</strong>
              </div>
              {Number(discount) > 0 && (
                <div className="total-line text-danger">
                  <span>الخصم الممنوح:</span>
                  <strong>-{discount} ج.م</strong>
                </div>
              )}
              {Number(taxAmount) > 0 && (
                <div className="total-line">
                  <span>ضريبة القيمة المضافة ({taxPercent}%):</span>
                  <strong>+{taxAmount} ج.م</strong>
                </div>
              )}
              <div className="total-line grand-line">
                <span>المطلوب من المريض:</span>
                <strong className="text-grand">{patientShare} ج.م</strong>
              </div>
              <div className="total-line">
                <span>المبلغ المسدد:</span>
                <strong className="text-paid">{currentInv.paidAmount} ج.م</strong>
              </div>
              <div className="total-line remaining-line">
                <span>المتبقي في الذمة:</span>
                <strong className="text-rem">{currentInv.remainingBalance} ج.م</strong>
              </div>
            </div>
          </div>

          {/* Payment Quick Recorder (if unpaid balance exists) */}
          {!isCreatingNew && Number(currentInv.remainingBalance) > 0 && (
            <div className="record-payment-strip no-print">
              <span className="pay-title">تسجيل دفعة نقدية الآن:</span>
              <div className="pay-inputs">
                <input
                  type="number"
                  placeholder="المبلغ المسدد..."
                  className="pay-amount-input"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
                <select 
                  className="pay-method-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">نقداً (Cash)</option>
                  <option value="card">فيزا / كارت (POS)</option>
                  <option value="instapay">إنستاباي (InstaPay)</option>
                  <option value="wallet">محفظة المريض</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddPaymentClick}
                  disabled={isRecordingPayment || !paymentAmount}
                  className="btn-submit-payment"
                >
                  {isRecordingPayment ? 'جاري التسجيل...' : 'إثبات السداد'}
                </button>
              </div>
            </div>
          )}

          {isCreatingNew && (
            <div className="create-inv-btn-row no-print">
              <button onClick={handleCreateSubmit} className="btn-confirm-new-inv">
                <CheckCircle2 size={16} />
                <span>حفظ واعتماد الفاتورة</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default InvoiceModal;
