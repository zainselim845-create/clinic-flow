import React from 'react';
import { Users, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { SYSTEM_PERMISSIONS } from '../../../utils/permissions';

export const TEAM_SIZES = [
  {
    id: 'solo',
    title: 'عيادة فردية (طبيب بمفرده)',
    countBadge: '1',
    description: 'أنا أدير كافة تفاصيل العيادة والمواعيد والملفات بنفسي'
  },
  {
    id: 'small',
    title: 'فريق صغير (طبيب واستقبال)',
    countBadge: '2 - 3',
    description: 'طبيب مع موظف استقبال وسكرتارية لإدارة الحجوزات والمرضى'
  },
  {
    id: 'medium',
    title: 'فريق متوسط (طاقم متكامل)',
    countBadge: '4 - 6',
    description: 'أطباء شركاء وموظفي استقبال وتمريض ومحاسب مالي'
  },
  {
    id: 'large',
    title: 'مركز طبي متكامل أو مجمع',
    countBadge: '7+',
    description: 'مجمع عيادات أو مركز متعدد التخصصات والورديات'
  }
];

export const ROLES_INFO = [
  {
    id: 'receptionist',
    title: 'الاستقبال والسكرتارية',
    defaultPerms: ['appointments', 'patients', 'sms'],
    desc: 'تسجيل المرضى، تنظيم وحجز المواعيد، الفواتير، وإرسال تنبيهات SMS'
  },
  {
    id: 'associate_doctor',
    title: 'طبيب ممارس / مساعد',
    defaultPerms: ['appointments', 'patients', 'sms'],
    desc: 'الكشف السريري، فحص الأسنان والتقارير، الروشتات والتاريخ المرضي'
  },
  {
    id: 'accountant',
    title: 'المحاسب المالي',
    defaultPerms: ['invoices'],
    desc: 'إصدار الفواتير وسندات القبض، متابعة الخزينة وتقارير الإيرادات'
  },
  {
    id: 'assistant',
    title: 'التمريض والمساعد السريري',
    defaultPerms: ['appointments', 'patients', 'inventory'],
    desc: 'استقبال المريض بالعيادة، إدارة المخزون ومتابعة أوامر المعامل'
  }
];

export default function OnboardingStepTeam({
  teamSizes = TEAM_SIZES,
  teamSize,
  setTeamSize,
  rolesInfo = ROLES_INFO,
  enableInitialStaff,
  setEnableInitialStaff,
  initialStaffName,
  setInitialStaffName,
  initialStaffPhone,
  setInitialStaffPhone,
  initialStaffRole,
  setInitialStaffRole,
  initialStaffPassword,
  setInitialStaffPassword,
  initialStaffPerms,
  handleTogglePermission
}) {
  return (
    <div className="wizard-step-content">
      <div className="wizard-header">
        <h2>
          <Users size={28} color="var(--primary)" />
          <span>حجم فريق العمل وصلاحيات الطاقم</span>
        </h2>
        <p>
          حدد عدد أفراد فريق العمل في العيادة، ويمكنك إنشاء أول حساب لموظف الاستقبال أو المساعد فوراً وتحديد صلاحياته بدقة.
        </p>
      </div>

      {/* Team Size Grid */}
      <div className="team-sizes-grid">
        {teamSizes.map((t) => {
          const isSelected = teamSize === t.id;
          return (
            <div
              key={t.id}
              className={`team-size-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setTeamSize(t.id)}
            >
              <span className="team-size-badge">{t.countBadge}</span>
              <div className="team-size-title">{t.title}</div>
              <div className="team-size-desc">{t.description}</div>
            </div>
          );
        })}
      </div>

      {/* Roles & Permissions Guide */}
      <div className="roles-guide-container">
        <div className="roles-guide-header">
          <ShieldCheck size={18} color="var(--primary)" />
          <span>دليل أدوار وصلاحيات الطاقم في ClinicFlow:</span>
        </div>

        <div className="roles-guide-grid">
          {rolesInfo.map((r) => (
            <div key={r.id} className="role-mini-card">
              <div className="role-mini-name">{r.title}</div>
              <div className="role-mini-desc">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Initial Staff Member Creation Box */}
      <div className="initial-staff-box">
        <div 
          className="initial-staff-toggle-row" 
          onClick={() => setEnableInitialStaff(!enableInitialStaff)}
        >
          <div className="initial-staff-toggle-info">
            <h4>إنشاء حساب للموظف الأول الآن (استقبال / سكرتارية)</h4>
            <p>تفعيل هذا الخيار ينشئ حساباً جاهزاً لموظفك الأول برقم الهاتف للدخول فوراً.</p>
          </div>
          <input
            type="checkbox"
            checked={enableInitialStaff}
            onChange={(e) => setEnableInitialStaff(e.target.checked)}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {enableInitialStaff && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label"><span>اسم الموظف *</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={initialStaffName}
                  onChange={(e) => setInitialStaffName(e.target.value)}
                  placeholder="مثال: سارة محمود"
                />
              </div>

              <div className="form-group">
                <label className="form-label"><span>رقم هاتف الموظف (لتسجيل الدخول) *</span></label>
                <input
                  type="tel"
                  className="form-input"
                  value={initialStaffPhone}
                  onChange={(e) => setInitialStaffPhone(e.target.value)}
                  placeholder="01098765432"
                  style={{ direction: 'ltr', textAlign: 'left' }}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label"><span>الدور الوظيفي</span></label>
                <select
                  className="form-input"
                  value={initialStaffRole}
                  onChange={(e) => setInitialStaffRole(e.target.value)}
                >
                  <option value="receptionist">استقبال وسكرتارية أولى</option>
                  <option value="associate_doctor">طبيب ممارس / مساعد</option>
                  <option value="accountant">محاسب مالي للعيادة</option>
                  <option value="assistant">مساعد سريري وتمريض</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label"><span>كلمة المرور الافتراضية *</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={initialStaffPassword}
                  onChange={(e) => setInitialStaffPassword(e.target.value)}
                  placeholder="1234"
                />
              </div>
            </div>

            {/* Granular Permissions Checkboxes */}
            <div style={{ marginTop: '1rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                الصلاحيات الممنوحة لهذا الحساب:
              </span>
              <div className="permissions-checkboxes-grid">
                {SYSTEM_PERMISSIONS.map((perm) => {
                  const isChecked = initialStaffPerms.includes(perm.id);
                  return (
                    <label 
                      key={perm.id} 
                      className={`perm-checkbox-item ${isChecked ? 'checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePermission(perm.id)}
                      />
                      <div>
                        <div className="perm-label-title">{perm.name}</div>
                        <div className="perm-label-desc">{perm.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* In-app management callout */}
      <div className="inapp-staff-callout">
        <CheckCircle2 size={24} style={{ flexShrink: 0 }} />
        <div>
          <strong>إدارة الموظفين من داخل النظام:</strong> يمكنك في أي وقت بعد الدخول إضافة المزيد من الموظفين، تعديل بياناتهم وتغيير صلاحياتهم وتعيين الورديات من داخل لوحة التحكم عبر شاشة: <strong>الإعدادات ← إدارة فريق العمل والموظفين</strong>.
        </div>
      </div>
    </div>
  );
}
