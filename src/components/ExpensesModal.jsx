import React, { useState, useMemo } from 'react';
import { 
  X, Plus, Trash2, Wallet, Download 
} from 'lucide-react';

import { useApp } from '../context/AppContext';
import { getTodayDateStr } from '../utils/timeSlots';
import { expenseCategories } from '../data/demoData';
import './ExpensesModal.css';

export const ExpensesModal = ({ isOpen, onClose }) => {
  const { state, dispatch } = useApp();
  const today = getTodayDateStr();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(expenseCategories[0]);
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const expenses = state.expenses || [];

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => filterCategory === 'all' || e.category === filterCategory);
  }, [expenses, filterCategory]);


  const totalAmount = useMemo(() => {
    return (state.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [state.expenses]);

  const todayAmount = useMemo(() => {
    return (state.expenses || []).filter(e => e.date === today).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [state.expenses, today]);


  if (!isOpen) return null;

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    const newExpense = {
      id: 'exp-' + Date.now(),
      title: title.trim(),
      amount: Number(amount) || 0,
      category,
      date,
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    };

    dispatch({ type: 'ADD_EXPENSE', payload: newExpense });
    setTitle('');
    setAmount('');
    setNotes('');
  };

  const handleDeleteExpense = (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      dispatch({ type: 'DELETE_EXPENSE', payload: id });
    }
  };

  const handleExportCsv = () => {
    if (expenses.length === 0) return;
    const headers = ['التاريخ', 'بند الصرف', 'التصنيف', 'المبلغ (ج.م)', 'ملاحظات'];
    const rows = expenses.map(e => [e.date, `"${e.title}"`, `"${e.category}"`, e.amount, `"${e.notes || ''}"`]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinic_expenses_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="expenses-modal-overlay">
      <div className="expenses-modal-card glass-card">
        
        {/* Header */}
        <div className="modal-header">
          <div className="brand-title">
            <Wallet size={22} className="text-danger" />
            <h3>سجل مصروفات العيادة والخزينة (Expenses Ledger)</h3>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Quick Stats Banner */}
        <div className="expenses-stats-strip">
          <div className="exp-stat-pill">
            <span>مصروفات اليوم:</span>
            <strong style={{ color: '#ef4444' }}>{todayAmount} ج.م</strong>
          </div>
          <div className="exp-stat-pill">
            <span>إجمالي المصروفات الكلية:</span>
            <strong style={{ color: '#ef4444' }}>{totalAmount} ج.م</strong>
          </div>
          <div className="exp-stat-pill">
            <span>عدد العمليات:</span>
            <strong>{expenses.length} عملية</strong>
          </div>
          <button 
            type="button" 
            className="btn-export-csv" 
            onClick={handleExportCsv}
            disabled={expenses.length === 0}
          >
            <Download size={14} />
            <span>تصدير Excel (CSV)</span>
          </button>
        </div>

        <div className="modal-body-scrollable">
          
          {/* Add Expense Form */}
          <form onSubmit={handleAddExpense} className="add-expense-form-box">
            <h4 style={{ margin: '0 0 0.75rem 0', fontWeight: 800, fontSize: '0.95rem' }}>
              تسجيل مصروف جديد:
            </h4>
            <div className="form-grid-3col">
              <div className="form-group">
                <label>بند / وصف المصروف *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="مثال: شراء كحول وشاش طبي، إيجار..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>المبلغ (ج.م) *</label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="مثال: 500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={1}
                  required
                />
              </div>

              <div className="form-group">
                <label>تصنيف المصروف</label>
                <select 
                  className="input-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {expenseCategories.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>تاريخ الصرف</label>
                <input 
                  type="date" 
                  className="input-field"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group full-span-2">
                <label>ملاحظات إضافية أو رقم الفاتورة</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="ملاحظات توضيحية..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-add-exp-action">
                <Plus size={16} />
                <span>إضافة المصروف إلى الخزينة</span>
              </button>
            </div>
          </form>

          {/* Expenses Table */}
          <div className="expenses-table-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem' }}>
                جدول المصروفات المسجلة ({filteredExpenses.length}):
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>تصفية حسب التصنيف:</span>
                <select 
                  className="input-field" 
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.82rem' }}
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="all">كافة التصنيفات</option>
                  {expenseCategories.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                لا توجد مصروفات مسجلة في هذا التصنيف حتى الآن.
              </div>
            ) : (
              <div className="expenses-table-wrapper">
                <table className="expenses-data-table">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>بند الصرف</th>
                      <th>التصنيف</th>
                      <th>المبلغ</th>
                      <th>ملاحظات</th>
                      <th style={{ textAlign: 'center' }}>حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td>{exp.date}</td>
                        <td style={{ fontWeight: 700 }}>{exp.title}</td>
                        <td>
                          <span className="category-badge">{exp.category}</span>
                        </td>
                        <td style={{ color: '#ef4444', fontWeight: 800 }}>{exp.amount} ج.م</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{exp.notes || '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            type="button" 
                            className="btn-trash-exp"
                            onClick={() => handleDeleteExpense(exp.id)}
                            title="حذف المصروف"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
export default ExpensesModal;
