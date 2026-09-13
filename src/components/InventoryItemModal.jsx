import React, { useState, useEffect } from 'react';
import { INVENTORY_CATEGORIES } from '../services/inventoryService';
import { Package, X, CheckCircle2 } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { Portal } from '@ark-ui/react/portal';
import './InventoryItemModal.css';

const InventoryItemModal = ({ isOpen, onClose, onSaveItem }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('composite');
  const [unit, setUnit] = useState('علبة / سرنجة');
  const [currentQty, setCurrentQty] = useState(10);
  const [minQuantity, setMinQuantity] = useState(3);
  const [costPerUnit, setCostPerUnit] = useState(250);
  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) return;

    setIsSubmitting(true);
    const newItem = {
      id: 'item_' + Date.now(),
      name,
      category,
      unit,
      currentQty: Number(currentQty),
      minQuantity: Number(minQuantity),
      costPerUnit: Number(costPerUnit),
      lotNumber,
      expiryDate,
      createdAt: new Date().toISOString()
    };

    if (onSaveItem) onSaveItem(newItem);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => { if (!details.open && onClose) onClose(); }} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="inventory-modal-overlay" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="inventory-modal-card">
            
            <div className="modal-header-navy">
              <div className="hdr-flex">
                <Package size={20} className="text-nebras-orange" />
                <div>
                  <Dialog.Title asChild>
                    <h4>إضافة صنف مخزون جديد (New Inventory Item)</h4>
                  </Dialog.Title>
                  <Dialog.Description asChild>
                    <p>تسجيل مستلزم طبي أو مادة علاجية مع تحديد حد الأمان وتاريخ الصلاحية</p>
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.CloseTrigger asChild>
                <button onClick={onClose} className="btn-close-navy" aria-label="إغلاق النافذة" type="button">
                  <X size={16} />
                </button>
              </Dialog.CloseTrigger>
            </div>

        <form onSubmit={handleSubmit} className="modal-body-form">
          
          <div className="form-row-2">
            <div className="field-box">
              <label>اسم الصنف أو المستحضر *</label>
              <input
                type="text"
                required
                placeholder="مثال: كومبوزيت 3M Filtek Z250 (A2)"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="field-box">
              <label>تصنيف الصنف *</label>
              <select
                className="input-field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {INVENTORY_CATEGORIES.filter(c => c.id !== 'all').map(c => (
                  <option key={c.id} value={c.id}>{c.labelAr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row-3">
            <div className="field-box">
              <label>وحدة الصرف / العبوة</label>
              <input
                type="text"
                className="input-field"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>

            <div className="field-box">
              <label>الرصيد الحالي بالمخزن *</label>
              <input
                type="number"
                min="0"
                required
                className="input-field"
                value={currentQty}
                onChange={(e) => setCurrentQty(e.target.value)}
              />
            </div>

            <div className="field-box">
              <label>حد الطلب الأدنى (إنذار النقص)</label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row-3">
            <div className="field-box">
              <label>تكلفة الوحدة (ج.م)</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value)}
              />
            </div>

            <div className="field-box">
              <label>رقم التشغيلة (Lot #)</label>
              <input
                type="text"
                placeholder="LOT-2026-X"
                className="input-field"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
              />
            </div>

            <div className="field-box">
              <label>تاريخ انتهاء الصلاحية</label>
              <input
                type="date"
                className="input-field"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer-row">
            <Dialog.CloseTrigger asChild>
              <button type="button" onClick={onClose} className="btn-cancel">
                إلغاء
              </button>
            </Dialog.CloseTrigger>
            <button type="submit" disabled={isSubmitting} className="btn-save">
              <CheckCircle2 size={16} />
              <span>إضافة الصنف للمخزن</span>
            </button>
          </div>

        </form>

          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default InventoryItemModal;
