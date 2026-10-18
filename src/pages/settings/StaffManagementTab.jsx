import React, { useState, useMemo } from 'react';
import { UserPlus, Trash2, Edit3, Phone, Mail, KeyRound, Eye, EyeOff, ShieldCheck, Users, Search } from 'lucide-react';
import * as staffService from '@/features/platform/services/staffService';
import { provisionStaffAccount, deleteRegisteredUser, updateStaffAccountStatus, getRegisteredUsers } from '@/features/auth/services/authService';
import { SYSTEM_PERMISSIONS } from '@/utils/permissions';
import { useTenant } from '@/context/TenantContext';
import ConfirmationModal from '@/components/ConfirmationModal';
import { safeGetJSON, safeSetJSON } from '@/utils/safeStorage';
import { toast } from '@/lib/toast';
import { useDebounce } from '@/hooks/useDebounce';

export default function StaffManagementTab({ staffMembers, dispatch }) {
  const { tenant } = useTenant();
  const [deleteTargetStaff, setDeleteTargetStaff] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [deletedStaffIdentifiers, setDeletedStaffIdentifiers] = useState(() => new Set());
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [showStaffPass, setShowStaffPass] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    roleKey: 'receptionist',
    role: 'سكرتير أول (استقبال وحجوزات)',
    shift: 'مسائي (04:00 م - 10:00 م)',
    status: 'active',
    permissions: ['appointments', 'patients', 'sms']
  });

  // Reconcile staff list across AppContext state, scoped local storage cache, and auth registry
  const displayStaffMembers = useMemo(() => {
    const map = new Map();
    const currentSlug = tenant?.slug || 'clinic';
    const currentId = tenant?.id;

    const isDeleted = (item) => {
      if (!item) return true;
      if (item.id && deletedStaffIdentifiers.has(item.id)) return true;
      if (item.phone) {
        if (deletedStaffIdentifiers.has(item.phone)) return true;
        const cleanP = String(item.phone).replace(/\D/g, '');
        if (cleanP && deletedStaffIdentifiers.has(cleanP)) return true;
      }
      return false;
    };

    // 1. From AppContext state props
    (staffMembers || []).forEach(s => {
      if (s?.id && !isDeleted(s)) map.set(s.id, s);
    });

    // 2. From resilient local staff cache
    const localCache = safeGetJSON(`clinicflow_staff_${currentSlug}`, []);
    if (Array.isArray(localCache)) {
      localCache.forEach(s => {
        if (s?.id && !isDeleted(s) && !map.has(s.id)) map.set(s.id, s);
      });
    }

    // 3. From auth registry registered staff users
    try {
      const reg = getRegisteredUsers().filter(u =>
        (u.clinicId === currentId || u.clinicSlug === currentSlug || u.clinicId === currentSlug) &&
        u.role !== 'doctor' && u.role !== 'super_admin' && !isDeleted(u)
      );
      reg.forEach(u => {
        const existing = map.get(u.id) || Array.from(map.values()).find(s => s.phone === u.phone);
        if (!existing && !isDeleted(u)) {
          map.set(u.id, {
            id: u.id,
            clinicId: u.clinicId || currentId || currentSlug,
            clinicSlug: u.clinicSlug || currentSlug,
            name: u.name,
            phone: u.phone,
            email: u.email || '',
            role: u.jobTitle || u.role,
            roleKey: u.roleKey || u.role,
            shift: u.shift || 'مسائي (04:00 م - 10:00 م)',
            status: u.status || 'active',
            permissions: u.permissions || ['appointments', 'patients', 'sms'],
            createdAt: u.createdAt
          });
        }
      });
    } catch (err) {
      console.warn('[StaffManagementTab] Error reading registered users:', err);
    }

    return Array.from(map.values());
  }, [staffMembers, tenant, deletedStaffIdentifiers]);

  // Debounced search filtering across staff members
  const filteredStaffMembers = useMemo(() => {
    const q = (debouncedSearch || '').trim().toLowerCase();
    if (!q) return displayStaffMembers;
    const cleanQ = q.replace(/\D/g, '');
    return displayStaffMembers.filter(member => {
      const matchName = member.name && member.name.toLowerCase().includes(q);
      const matchPhone = member.phone && (member.phone.includes(q) || (cleanQ && member.phone.replace(/\D/g, '').includes(cleanQ)));
      const matchRole = member.role && member.role.toLowerCase().includes(q);
      return matchName || matchPhone || matchRole;
    });
  }, [displayStaffMembers, debouncedSearch]);

  const handleOpenAddModal = () => {
    setEditingStaff(null);
    setStaffError('');
    setStaffForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      roleKey: 'receptionist',
      role: 'سكرتير أول (استقبال وحجوزات)',
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
    if (!editingStaff && (!staffForm.password || staffForm.password.trim().length < 4)) {
      setStaffError('يرجى إدخال كلمة مرور مكونة من 4 خانات على الأقل للموظف');
      return;
    }

    const staffClinicId = tenant?.id || (tenant?.slug ? `tenant-${tenant.slug}` : 'clinic-default');
    const staffClinicSlug = tenant?.slug || 'clinic';

    // 1. Pre-flight auth validation and phone uniqueness check
    const targetId = editingStaff ? editingStaff.id : 'staff-' + Date.now();
    try {
      provisionStaffAccount({
        id: targetId,
        clinicId: staffClinicId,
        clinicSlug: staffClinicSlug,
        name: staffForm.name,
        phone: staffForm.phone,
        email: staffForm.email,
        password: staffForm.password,
        role: staffForm.roleKey || 'receptionist',
        permissions: staffForm.permissions,
        shift: staffForm.shift
      });
    } catch (err) {
      setStaffError(err.message || 'فشل تسجيل حساب الموظف، يرجى مراجعة البيانات.');
      return;
    }

    if (editingStaff) {
      const updatedPayload = { 
        ...staffForm, 
        id: editingStaff.id,
        clinicId: staffClinicId,
        clinicSlug: staffClinicSlug
      };

      // Immediate Scoped Local Storage write
      const scopedKey = `clinicflow_data_${staffClinicSlug}`;
      const currentScoped = safeGetJSON(scopedKey, {});
      if (currentScoped && typeof currentScoped === 'object') {
        const existingStaff = Array.isArray(currentScoped.staffMembers) ? currentScoped.staffMembers : [];
        currentScoped.staffMembers = existingStaff.map(s => s.id === editingStaff.id ? updatedPayload : s);
        safeSetJSON(scopedKey, currentScoped);
      }

      try {
        await staffService.updateStaffMember(editingStaff.id, updatedPayload, staffClinicSlug);
      } catch (err) {
        console.warn('Failed to update staff in staffService:', err);
      }

      dispatch({
        type: 'UPDATE_STAFF',
        payload: updatedPayload
      });

      if (staffForm.roleKey === "associate_doctor") {
        dispatch({
          type: "UPDATE_DOCTOR",
          payload: {
            id: editingStaff.id,
            clinicId: staffClinicId,
            name: staffForm.name,
            phone: staffForm.phone,
            email: staffForm.email,
            specialty: staffForm.specialty || "طبيب سريري بالمركز",
            commissionRate: staffForm.commissionRate || 50,
            isActive: staffForm.status === "active"
          }
        });
      }
    } else {
      const newStaff = {
        id: targetId,
        clinicId: staffClinicId,
        clinicSlug: staffClinicSlug,
        ...staffForm,
        createdAt: new Date().toISOString().split('T')[0]
      };

      // Immediate Scoped Local Storage write to prevent debounce loss
      const scopedKey = `clinicflow_data_${staffClinicSlug}`;
      const currentScoped = safeGetJSON(scopedKey, {});
      if (currentScoped && typeof currentScoped === 'object') {
        const existingStaff = Array.isArray(currentScoped.staffMembers) ? currentScoped.staffMembers : [];
        currentScoped.staffMembers = [newStaff, ...existingStaff.filter(s => s.id !== newStaff.id && s.phone !== newStaff.phone)];
        safeSetJSON(scopedKey, currentScoped);
      }

      try {
        await staffService.addStaffMember(newStaff);
      } catch (err) {
        console.warn('Failed to add staff in staffService:', err);
      }

      dispatch({
        type: 'ADD_STAFF',
        payload: newStaff
      });

      if (staffForm.roleKey === "associate_doctor") {
        dispatch({
          type: "ADD_DOCTOR",
          payload: {
            id: targetId,
            clinicId: staffClinicId,
            name: staffForm.name,
            phone: staffForm.phone,
            email: staffForm.email,
            specialty: staffForm.specialty || "طبيب سريري بالمركز",
            commissionRate: staffForm.commissionRate || 50,
            isActive: staffForm.status === "active"
          }
        });
      }
    }

    setIsStaffModalOpen(false);
    setEditingStaff(null);
  };

  const handleDeleteStaff = (id) => {
    const member = displayStaffMembers.find(s => s.id === id);
    if (member) {
      setDeleteTargetStaff(member);
    }
  };

  const handleToggleStaffStatus = async (id) => {
    if (togglingId === id) return;
    setTogglingId(id);
    try {
      const member = displayStaffMembers.find(s => s.id === id);
      const nextStatus = member?.status === 'active' ? 'inactive' : 'active';
      const staffClinicSlug = tenant?.slug || 'clinic';

      try {
        await staffService.updateStaffMember(id, { status: nextStatus }, staffClinicSlug);
      } catch (err) {
        console.warn('Failed to toggle staff status in staffService:', err);
      }

      try {
        updateStaffAccountStatus(id, nextStatus);
        if (member?.phone) updateStaffAccountStatus(member.phone, nextStatus);
      } catch (err) {
        console.warn('[StaffManagementTab] Failed to update staff account status:', err);
      }

      const scopedKey = `clinicflow_data_${staffClinicSlug}`;
      const currentScoped = safeGetJSON(scopedKey, {});
      if (currentScoped && typeof currentScoped === 'object' && Array.isArray(currentScoped.staffMembers)) {
        currentScoped.staffMembers = currentScoped.staffMembers.map(s => s.id === id ? { ...s, status: nextStatus } : s);
        safeSetJSON(scopedKey, currentScoped);
      }

      dispatch({ type: 'TOGGLE_STAFF_STATUS', payload: id });
      toast.success(nextStatus === 'active' ? 'تم تفعيل حساب الموظف' : 'تم تعطيل حساب الموظف');
    } finally {
      setTogglingId(null);
    }
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

      {displayStaffMembers.length > 0 && (
        <div style={{ marginBottom: '1.25rem', position: 'relative', maxWidth: '380px' }}>
          <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في فريق العمل (بالاسم، الهاتف، أو الدور)..."
            className="form-input"
            style={{ paddingRight: '38px', width: '100%' }}
          />
        </div>
      )}

      {displayStaffMembers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)', margin: '1rem 0' }}>
          <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', opacity: 0.6 }} />
          <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>لا يوجد موظفون مسجلون حالياً</h4>
          <p style={{ margin: '0 0 1.25rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            يمكنك إضافة موظفي الاستقبال، الأطباء المساعدين، والمحاسبين بالنقر على زر إضافة موظف جديد.
          </p>
          <button type="button" onClick={handleOpenAddModal} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={16} />
            <span>إضافة موظف الآن</span>
          </button>
        </div>
      ) : filteredStaffMembers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)', margin: '1rem 0' }}>
          <Users size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', opacity: 0.5 }} />
          <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 600 }}>لا توجد نتائج مطابقة لبحثك</h4>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            لم يتم العثور على أي موظف يطابق "{debouncedSearch}"
          </p>
        </div>
      ) : (
        <div className="staff-grid">
          {filteredStaffMembers.map((member) => (
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

              <div className="staff-perms-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                {(member.permissions || []).map(pId => {
                  const permDef = SYSTEM_PERMISSIONS.find(sp => sp.id === pId);
                  return (
                    <span 
                      key={pId} 
                      style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 700, 
                        background: 'var(--clinic-primary-light, #F4F4F5)', 
                        color: 'var(--clinic-primary, #09090B)', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px',
                        border: '1px solid var(--border-color, #E4E4E7)'
                      }}
                    >
                      {permDef ? permDef.name : pId}
                    </span>
                  );
                })}
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
      )}

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
                    placeholder="كلمة المرور (4 خانات على الأقل)"
                    minLength={4}
                    required={!editingStaff}
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
                <label>المسمى الوظيفي والدور السريري</label>
                <select
                  value={staffForm.roleKey || 'receptionist'}
                  onChange={(e) => {
                    const selected = e.target.value;
                    let label = 'سكرتير أول (استقبال)';
                    let perms = ['appointments', 'patients', 'sms'];
                    if (selected === 'associate_doctor') {
                      label = 'طبيب ممارس / مساعد سريري';
                      perms = ['appointments', 'patients', 'sms'];
                    } else if (selected === 'accountant') {
                      label = 'محاسب مالي للعيادة';
                      perms = ['invoices'];
                    } else if (selected === 'assistant') {
                      label = 'مساعد تمريض سريري';
                      perms = ['appointments', 'patients', 'inventory'];
                    }
                    setStaffForm({
                      ...staffForm,
                      roleKey: selected,
                      role: label,
                      permissions: perms
                    });
                  }}
                >
                  <option value="receptionist">سكرتير أول (استقبال وحجوزات)</option>
                  <option value="associate_doctor">طبيب ممارس / مساعد سريري (Associate Doctor)</option>
                  <option value="accountant">محاسب مالي للعيادة (Accountant)</option>
                  <option value="assistant">مساعد تمريض سريري (Clinical Assistant)</option>
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

              <div className="form-group">
                <label>صلاحيات الوصول الممنوحة للموظف:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.65rem', marginTop: '0.45rem' }}>
                  {SYSTEM_PERMISSIONS.map((perm) => {
                    const isChecked = (staffForm.permissions || []).includes(perm.id);
                    return (
                      <label 
                        key={perm.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          background: isChecked ? 'var(--clinic-primary-light, #F4F4F5)' : 'var(--bg-secondary)',
                          border: `1.5px solid ${isChecked ? 'var(--clinic-primary, #09090B)' : 'var(--border-color)'}`,
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: 600
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const current = staffForm.permissions || [];
                            const updated = e.target.checked
                              ? [...current, perm.id]
                              : current.filter(p => p !== perm.id);
                            setStaffForm({ ...staffForm, permissions: updated });
                          }}
                        />
                        <span>{perm.name}</span>
                      </label>
                    );
                  })}
                </div>
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

      <ConfirmationModal
        isOpen={Boolean(deleteTargetStaff)}
        onClose={() => setDeleteTargetStaff(null)}
        onConfirm={async () => {
          if (!deleteTargetStaff) return;
          const target = deleteTargetStaff;
          const id = target.id;
          const phone = target.phone;
          const email = target.email;
          const cleanPhone = phone ? String(phone).replace(/\D/g, '') : null;
          const staffClinicId = tenant?.id || (tenant?.slug ? `tenant-${tenant.slug}` : 'clinic-default');
          const staffClinicSlug = tenant?.slug || 'clinic';

          // 1. Instant optimistic removal from UI
          setDeletedStaffIdentifiers(prev => {
            const next = new Set(prev);
            if (id) next.add(id);
            if (phone) next.add(phone);
            if (cleanPhone) next.add(cleanPhone);
            return next;
          });

          // 2. Dispatch to AppContext immediately
          dispatch({ type: 'DELETE_STAFF', payload: { id, phone } });

          // 3. Clear from all local storage scopes
          const allScopes = Array.from(new Set([staffClinicSlug, staffClinicId, tenant?.id, tenant?.slug].filter(Boolean)));
          allScopes.forEach(keySlug => {
            const scopedKey = `clinicflow_data_${keySlug}`;
            const currentScoped = safeGetJSON(scopedKey, null);
            if (currentScoped && typeof currentScoped === 'object' && Array.isArray(currentScoped.staffMembers)) {
              currentScoped.staffMembers = currentScoped.staffMembers.filter(s => 
                s.id !== id && 
                (!phone || s.phone !== phone) && 
                (!cleanPhone || String(s.phone || '').replace(/\D/g, '') !== cleanPhone)
              );
              safeSetJSON(scopedKey, currentScoped);
            }

            const staffCacheKey = `clinicflow_staff_${keySlug}`;
            const cachedStaff = safeGetJSON(staffCacheKey, null);
            if (Array.isArray(cachedStaff)) {
              safeSetJSON(staffCacheKey, cachedStaff.filter(s => 
                s.id !== id && 
                (!phone || s.phone !== phone) && 
                (!cleanPhone || String(s.phone || '').replace(/\D/g, '') !== cleanPhone)
              ));
            }
          });

          // 4. Purge from Auth Registry
          try {
            deleteRegisteredUser(id);
            if (phone) deleteRegisteredUser(phone);
            if (cleanPhone) deleteRegisteredUser(cleanPhone);
            if (email) deleteRegisteredUser(email);
            deleteRegisteredUser(id, staffClinicSlug);
            if (phone) deleteRegisteredUser(phone, staffClinicSlug);
            deleteRegisteredUser(id, staffClinicId);
            if (phone) deleteRegisteredUser(phone, staffClinicId);
          } catch (err) {
            console.warn('[StaffManagementTab] Failed to delete registered staff user:', err);
          }

          try {
            setIsDeleting(true);
            await staffService.deleteStaffMember(id, staffClinicSlug, { phone, email, tenantId: tenant?.id });
          } catch (err) {
            console.warn('Failed to delete staff in staffService:', err);
          } finally {
            setIsDeleting(false);
          }

          toast.success(`تم حذف حساب الموظف (${target.name}) بنجاح`);
          setDeleteTargetStaff(null);
        }}
        title="حذف حساب الموظف"
        message={`هل أنت متأكد من حذف حساب الموظف (${deleteTargetStaff?.name}) نهائياً؟ سيتم إلغاء وصوله وصلاحياته في العيادة.`}
        confirmText={isDeleting ? "جاري الحذف..." : "نعم، حذف الحساب"}
        cancelText="إلغاء"
        isDestructive={true}
      />
    </div>
  );
}
