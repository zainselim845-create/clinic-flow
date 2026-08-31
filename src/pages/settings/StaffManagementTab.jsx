import React, { useState } from 'react';
import { UserPlus, Trash2, Edit3, Phone, Mail, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import * as staffService from '../../services/staffService';

import { isSupabaseConfigured } from '../../lib/supabase';

export default function StaffManagementTab({ staffMembers, dispatch }) {
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [showStaffPass, setShowStaffPass] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '123',
    role: 'سكرتير أول',
    shift: 'مسائي (04:00 م - 10:00 م)',
    status: 'active',
    permissions: ['appointments', 'patients', 'sms']
  });

  const useSupabase = isSupabaseConfigured();

  const handleOpenAddModal = () => {
    setEditingStaff(null);
    setStaffError('');
    setStaffForm({
      name: '',
      email: '',
      phone: '',
      password: '123',
      role: 'سكرتير أول',
      shift: 'مسائي (04:00 م - 10:00 م)',
      status: 'active',
      permissions: ['appointments', 'patients', 'sms']
    });
    setIsStaffModalOpen(true);
  };

  const handleOpenEditModal = (member) => {
    setEditingStaff(member);
    setStaffError('');
    setStaffForm({ ...member });
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setStaffError('');
    if (!staffForm.name || !staffForm.phone) {
      setStaffError('يرجى إدخال اسم ورقم هاتف الموظف');
      return;
    }

    if (editingStaff) {
      const updatedPayload = { ...staffForm, id: editingStaff.id };
      if (useSupabase) {
        try {
          await staffService.updateStaffMember(editingStaff.id, updatedPayload);
        } catch (err) {
          console.error('Failed to update staff in Supabase:', err);
        }
      }
      dispatch({
        type: 'UPDATE_STAFF',
        payload: updatedPayload
      });
    } else {
      const newStaff = {
        id: 'staff-' + Date.now(),
        ...staffForm,
        createdAt: new Date().toISOString().split('T')[0]
      };
      if (useSupabase) {
        try {
          await staffService.addStaffMember(newStaff);
        } catch (err) {
          console.error('Failed to add staff in Supabase:', err);
        }
      }
      dispatch({
        type: 'ADD_STAFF',
        payload: newStaff
      });
    }

    setIsStaffModalOpen(false);
    setEditingStaff(null);
  };

  const handleDeleteStaff = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف حساب هذا الموظف من العيادة؟')) {
      if (useSupabase) {
        try {
          await staffService.deleteStaffMember(id);
        } catch (err) {
          console.error('Failed to delete staff in Supabase:', err);
        }
      }
      dispatch({ type: 'DELETE_STAFF', payload: id });
    }
  };

  const handleToggleStaffStatus = async (id) => {
    const member = staffMembers.find(s => s.id === id);
    if (member && useSupabase) {
      try {
        await staffService.updateStaffMember(id, { status: member.status === 'active' ? 'inactive' : 'active' });
      } catch (err) {
        console.error('Failed to toggle staff status in Supabase:', err);
      }
    }
    dispatch({ type: 'TOGGLE_STAFF_STATUS', payload: id });
  };


  return (
    <div className="settings-section staff-tab">
      <div className="section-header">
        <div>
          <h3>إدارة فريق العمل وحسابات الاستقبال</h3>
          <p>إضافة وتعديل حسابات السكرتارية وتحديد الصلاحيات وورديات العمل</p>
        </div>
        <button type="button" onClick={handleOpenAddModal} className="btn btn-primary">
          <UserPlus size={18} />
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      <div className="staff-grid">
        {staffMembers.map((member) => (
          <div key={member.id} className={`staff-card ${member.status === 'inactive' ? 'inactive' : ''}`}>
            <div className="staff-card-header">
              <div className="staff-avatar">
                {member.name.charAt(0)}
              </div>
              <div className="staff-identity">
                <h4>{member.name}</h4>
                <span className="staff-role-badge">{member.role}</span>
              </div>
              <span className={`status-pill ${member.status}`}>
                {member.status === 'active' ? 'نشط' : 'معطل'}
              </span>
            </div>

            <div className="staff-details">
              <div className="detail-item">
                <Phone size={16} />
                <span>{member.phone}</span>
              </div>
              {member.email && (
                <div className="detail-item">
                  <Mail size={16} />
                  <span>{member.email}</span>
                </div>
              )}
              <div className="detail-item">
                <ShieldCheck size={16} />
                <span>وردية: {member.shift}</span>
              </div>
            </div>

            <div className="staff-actions">
              <button 
                type="button" 
                onClick={() => handleToggleStaffStatus(member.id)} 
                className="btn-status-toggle"
              >
                {member.status === 'active' ? 'تعطيل الحساب' : 'تفعيل الحساب'}
              </button>
              <button 
                type="button" 
                onClick={() => handleOpenEditModal(member)} 
                className="btn-icon" 
                title="تعديل"
              >
                <Edit3 size={16} />
              </button>
              <button 
                type="button" 
                onClick={() => handleDeleteStaff(member.id)} 
                className="btn-icon delete" 
                title="حذف"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isStaffModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content staff-modal">
            <div className="modal-header">
              <h3>{editingStaff ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}</h3>
              <button type="button" onClick={() => setIsStaffModalOpen(false)} className="btn-close">×</button>
            </div>

            <form onSubmit={handleSaveStaff}>
              {staffError && (
                <div className="staff-error-alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.65rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  {staffError}
                </div>
              )}

              <div className="form-group">
                <label>الاسم بالكامل</label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="مثال: سارة محمد"
                />
              </div>

              <div className="form-group">
                <label>رقم الهاتف (لتسجيل الدخول)</label>
                <input
                  type="tel"
                  required
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  placeholder="01122223333"
                />
              </div>

              <div className="form-group">
                <label>البريد الإلكتروني</label>
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  placeholder="sara@clinic.com"
                />
              </div>

              <div className="form-group">
                <label>كلمة المرور</label>
                <div className="input-with-icon">
                  <KeyRound size={18} />
                  <input
                    type={showStaffPass ? 'text' : 'password'}
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowStaffPass(!showStaffPass)}
                    className="btn-eye"
                  >
                    {showStaffPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>المسمى الوظيفي</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                >
                  <option value="سكرتير أول">سكرتير أول (استقبال كامل)</option>
                  <option value="سكرتير مساعد">سكرتير مساعد</option>
                  <option value="تمريض">طاقم تمريض</option>
                  <option value="مدير إداري">مدير إداري للعيادة</option>
                </select>
              </div>

              <div className="form-group">
                <label>فترة الوردية</label>
                <select
                  value={staffForm.shift}
                  onChange={(e) => setStaffForm({ ...staffForm, shift: e.target.value })}
                >
                  <option value="صباحي (09:00 ص - 03:00 م)">صباحي (09:00 ص - 03:00 م)</option>
                  <option value="مسائي (04:00 م - 10:00 م)">مسائي (04:00 م - 10:00 م)</option>
                  <option value="كامل (09:00 ص - 10:00 م)">يوم كامل</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setIsStaffModalOpen(false)} className="btn btn-secondary">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
