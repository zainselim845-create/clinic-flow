import React from 'react';
import { 
  Search, UserPlus, LogIn, Edit, KeyRound, Ban, CheckCircle2, 
  Trash2, Shield, User, Stethoscope, Building, Phone, Mail, Clock
} from 'lucide-react';

export function UsersTable({
  users = [],
  searchTerm = '',
  setSearchTerm,
  roleFilter = 'all',
  setRoleFilter,
  statusFilter = 'all',
  setStatusFilter,
  clinicFilter = 'all',
  setClinicFilter,
  allTenants = [],
  onImpersonate,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onDelete,
  onOpenCreate
}) {
  const cleanSearch = (searchTerm || '').trim().toLowerCase();

  const filteredUsers = users.filter(u => {
    const nameStr = (u.name || '').toLowerCase();
    const emailStr = (u.email || '').toLowerCase();
    const phoneStr = (u.phone || '').replace(/\D/g, '');
    const clinicStr = (u.clinicName || u.clinicSlug || '').toLowerCase();
    const searchDigits = cleanSearch.replace(/\D/g, '');

    const matchesSearch = !cleanSearch || 
      nameStr.includes(cleanSearch) || 
      emailStr.includes(cleanSearch) || 
      clinicStr.includes(cleanSearch) ||
      (searchDigits && phoneStr.includes(searchDigits));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const currentStatus = u.status || 'active';
    const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;
    const matchesClinic = clinicFilter === 'all' || u.clinicSlug === clinicFilter;

    return matchesSearch && matchesRole && matchesStatus && matchesClinic;
  });

  // Calculate user segment statistics
  const totalUsers = users.length;
  const doctorCount = users.filter(u => u.role === 'doctor').length;
  const staffCount = users.filter(u => u.role === 'staff' || u.role === 'receptionist').length;
  const activeCount = users.filter(u => (u.status || 'active') === 'active').length;
  const suspendedCount = users.filter(u => u.status === 'suspended').length;

  const getRoleBadge = (role, isClinicOwner) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="user-role-badge super-admin">
            <Shield size={12} />
            <span>مدير عام المنصة</span>
          </span>
        );
      case 'multi_clinic_owner':
        return (
          <span className="user-role-badge owner">
            <Building size={12} />
            <span>مالك مجمع عيادات</span>
          </span>
        );
      case 'doctor':
        return (
          <span className="user-role-badge doctor">
            <Stethoscope size={12} />
            <span>{isClinicOwner ? 'طبيب مالك عيادة' : 'طبيب معالج'}</span>
          </span>
        );
      case 'staff':
      case 'receptionist':
      default:
        return (
          <span className="user-role-badge staff">
            <User size={12} />
            <span>سكرتارية واستقبال</span>
          </span>
        );
    }
  };

  return (
    <div className="saas-section-card users-table-card">
      <div className="section-card-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2>إدارة حسابات العملاء والمستخدمين (Client Accounts Directory)</h2>
            <span className="user-total-counter-pill">{filteredUsers.length} من {totalUsers} حساب</span>
          </div>
          <p>عرض تفصيلي لجميع الأطباء، موظفي الاستقبال، وملاك العيادات مع صلاحيات الدخول الفوري والتحكم الشامل</p>
        </div>

        <button
          type="button"
          className="btn-create-tenant"
          onClick={onOpenCreate}
          style={{ padding: '0.55rem 1.1rem', fontSize: '0.88rem' }}
        >
          <UserPlus size={16} />
          <span>إضافة حساب مستخدم جديد</span>
        </button>
      </div>

      {/* Mini Stats Summary */}
      <div className="users-stat-summary-bar">
        <div className="stat-pill-item" onClick={() => { setRoleFilter('all'); setStatusFilter('all'); }}>
          <span className="pill-dot gray"></span>
          <span className="pill-label">إجمالي الحسابات:</span>
          <span className="pill-val">{totalUsers}</span>
        </div>
        <div className="stat-pill-item" onClick={() => setRoleFilter('doctor')}>
          <span className="pill-dot blue"></span>
          <span className="pill-label">أطباء وعيادات:</span>
          <span className="pill-val">{doctorCount}</span>
        </div>
        <div className="stat-pill-item" onClick={() => setRoleFilter('staff')}>
          <span className="pill-dot green"></span>
          <span className="pill-label">طاقم واستقبال:</span>
          <span className="pill-val">{staffCount}</span>
        </div>
        <div className="stat-pill-item" onClick={() => setStatusFilter('active')}>
          <span className="pill-dot emerald"></span>
          <span className="pill-label">حسابات نشطة:</span>
          <span className="pill-val">{activeCount}</span>
        </div>
        {suspendedCount > 0 && (
          <div className="stat-pill-item warning" onClick={() => setStatusFilter('suspended')}>
            <span className="pill-dot red"></span>
            <span className="pill-label">موقوف:</span>
            <span className="pill-val">{suspendedCount}</span>
          </div>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="users-filter-toolbar">
        <div className="saas-search-box" style={{ minWidth: '260px', flex: '1 1 280px' }}>
          <Search size={16} />
          <input 
            type="text" 
            placeholder="ابحث باسم المستخدم، البريد، الهاتف، أو اسم العيادة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          value={roleFilter} 
          onChange={(e) => setRoleFilter(e.target.value)}
          className="saas-filter-select"
        >
          <option value="all">كافة الأدوار والصلاحيات</option>
          <option value="doctor">الأطباء وملاك العيادات</option>
          <option value="staff">السكرتارية وطاقم العمل</option>
          <option value="multi_clinic_owner">ملاك المجمعات الطبية</option>
          <option value="super_admin">إدارة المنصة المركزية</option>
        </select>

        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="saas-filter-select"
        >
          <option value="all">كافة الحالات</option>
          <option value="active">الحسابات النشطة ({activeCount})</option>
          <option value="suspended">الحسابات الموقوفة ({suspendedCount})</option>
        </select>

        <select 
          value={clinicFilter} 
          onChange={(e) => setClinicFilter(e.target.value)}
          className="saas-filter-select"
        >
          <option value="all">كافة العيادات</option>
          {allTenants.map(t => (
            <option key={t.slug} value={t.slug}>
              {t.name || t.slug}
            </option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div className="saas-table-wrapper">
        <table className="saas-table">
          <thead>
            <tr>
              <th>المستخدم والاسم</th>
              <th>معلومات الاتصال</th>
              <th>الدور والصلاحية</th>
              <th>العيادة التابعة</th>
              <th>الحالة</th>
              <th>تاريخ التسجيل</th>
              <th style={{ textAlign: 'center' }}>التحكم الفوري والإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="saas-empty-row">
                  لا توجد حسابات مستخدمين مطابقة لمعايير البحث المحددة.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isSuspended = u.status === 'suspended';
                const isSuperAdmin = u.role === 'super_admin' || u.isSuperAdmin;
                const initials = (u.name || 'م')
                  .replace(/د\.?\s*/, '')
                  .trim()
                  .charAt(0);

                return (
                  <tr key={u.id || u.email} className={`saas-user-row ${isSuspended ? 'is-suspended' : ''}`}>
                    {/* User & Name */}
                    <td>
                      <div className="user-profile-cell">
                        <div className={`user-avatar-circle ${u.role}`}>
                          {initials}
                        </div>
                        <div className="user-name-meta">
                          <strong className="user-full-name">{u.name}</strong>
                          <span className="user-job-title">{u.jobTitle || 'عضو بالفريق'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Contact details */}
                    <td>
                      <div className="user-contact-cell">
                        {u.email && (
                          <div className="contact-item">
                            <Mail size={12} />
                            <span dir="ltr">{u.email}</span>
                          </div>
                        )}
                        {u.phone && (
                          <div className="contact-item">
                            <Phone size={12} />
                            <span dir="ltr">{u.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Role */}
                    <td>
                      {getRoleBadge(u.role, u.isClinicOwner)}
                    </td>

                    {/* Clinic assignment */}
                    <td>
                      <div className="user-clinic-cell">
                        <strong>{u.clinicName || 'عيادة عامة'}</strong>
                        {u.clinicSlug && u.clinicSlug !== '*' && (
                          <code className="clinic-slug-code">{u.clinicSlug}</code>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      {isSuspended ? (
                        <span className="saas-status-pill suspended">
                          <Ban size={12} />
                          <span>حساب موقوف</span>
                        </span>
                      ) : (
                        <span className="saas-status-pill active">
                          <CheckCircle2 size={12} />
                          <span>نشط وساري</span>
                        </span>
                      )}
                    </td>

                    {/* Created At */}
                    <td>
                      <span className="user-date-text">
                        <Clock size={12} />
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : 'مسجل'}
                      </span>
                    </td>

                    {/* Action Controls */}
                    <td>
                      <div className="user-actions-cell">
                        {/* 1-Click Impersonate / Login as Client */}
                        {isSuperAdmin ? (
                          <span 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#FEF3C7',
                              color: '#92400E',
                              border: '1px solid #FCD34D',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700
                            }}
                            title="هذا هو حساب إدارة الساس الحالي"
                          >
                            <Shield size={11} />
                            <span>حساب الإدارة</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onImpersonate && onImpersonate(u)}
                            className="btn-impersonate-user"
                            title="دخول فوري كعميل وتصفح النظام باسم هذا الحساب"
                          >
                            <LogIn size={13} />
                            <span>دخول كعميل</span>
                          </button>
                        )}

                        {/* Edit User Details */}
                        <button
                          type="button"
                          onClick={() => onEdit && onEdit(u)}
                          className="btn-edit-user"
                          title="تعديل بيانات الحساب والعيادة"
                        >
                          <Edit size={13} />
                        </button>

                        {/* Reset Password */}
                        <button
                          type="button"
                          onClick={() => onResetPassword && onResetPassword(u)}
                          className="btn-reset-pw"
                          title="إعادة تعيين وتغيير كلمة المرور فوراً"
                        >
                          <KeyRound size={13} />
                        </button>

                        {/* Suspend / Activate Toggle */}
                        {!isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => onToggleStatus && onToggleStatus(u.id, u.status || 'active')}
                            className={isSuspended ? 'btn-activate-user' : 'btn-suspend-user'}
                            title={isSuspended ? 'إعادة تفعيل الحساب' : 'إيقاف الحساب مؤقتاً'}
                          >
                            {isSuspended ? <CheckCircle2 size={13} /> : <Ban size={13} />}
                          </button>
                        )}

                        {/* Delete Account */}
                        {!isSuperAdmin && onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(u.id)}
                            className="btn-delete-tenant"
                            title="حذف هذا الحساب نهائياً"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
