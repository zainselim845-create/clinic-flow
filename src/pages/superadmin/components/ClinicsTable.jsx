import React from 'react';
import { Search, ExternalLink, CheckCircle2, Copy, CheckCheck, AlertOctagon, Clock, Ban, Check } from 'lucide-react';

export function ClinicsTable({
  filteredTenants,
  searchTerm,
  setSearchTerm,
  tierFilter,
  setTierFilter,
  statusFilter,
  setStatusFilter,
  activeClinics,
  pendingClinics,
  suspendedClinics,
  copiedSlug,
  onCopyLink,
  onApproveClinic,
  onSuspendClinic,
  onReactivateClinic,
  onSwitchAndVisit
}) {
  return (
    <div className="saas-section-card">
      <div className="section-card-header">
        <div>
          <h2>دليل المستأجرين والعيادات (Tenants Directory)</h2>
          <p>إدارة الخطط، الحصص التشغيلية، وعزل البيانات لكل عيادة على حدة</p>
        </div>

        <div className="section-header-filters">
          <div className="saas-search-box">
            <Search size={16} />
            <input 
              id="SuperAdminTenantSearch"
              name="tenantSearch"
              aria-label="البحث في المستأجرين والعيادات"
              type="text" 
              placeholder="ابحث بالاسم، الطبيب، أو الـ Slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select 
            id="SuperAdminTierFilter"
            name="tierFilter"
            aria-label="فلترة حسب باقة الاشتراك"
            value={tierFilter} 
            onChange={(e) => setTierFilter(e.target.value)}
            className="saas-filter-select"
          >
            <option value="all">كل الباقات</option>
            <option value="enterprise">مؤسسي Enterprise</option>
            <option value="pro">عيادة ذكية Pro</option>
            <option value="starter">أساسي Starter</option>
          </select>

          <select 
            id="SuperAdminStatusFilter"
            name="statusFilter"
            aria-label="فلترة حسب حالة العيادة والاشتراك"
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="saas-filter-select"
            data-status={statusFilter}
          >
            <option value="all">كافة حالات العيادات</option>
            <option value="active">العيادات النشطة ({activeClinics})</option>
            <option value="pending_approval">قيد المراجعة والموافقة ({pendingClinics})</option>
            <option value="suspended">الموقوفة لعدم السداد ({suspendedClinics})</option>
          </select>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="saas-table-wrapper">
        <table className="saas-table">
          <thead>
            <tr>
              <th>العيادة والمستأجر</th>
              <th>الطبيب والتخصص</th>
              <th>المسار المخصص (Slug)</th>
              <th>باقة الاشتراك</th>
              <th>حالة الاشتراك والترخيص</th>
              <th>حصص التشغيل</th>
              <th>إجراءات الإدارة والرقابة</th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={7} className="saas-empty-row">
                  لا توجد عيادات مطابقة لمعايير البحث والفلترة المحددة.
                </td>
              </tr>
            ) : (
              filteredTenants.map((t) => {
                const subStatus = t.subscriptionStatus || 'active';
                const isSuspended = subStatus === 'suspended';
                const isPending = subStatus === 'pending_approval';

                return (
                  <tr 
                    key={t.slug || t.id} 
                    className={`saas-tenant-row ${isSuspended ? 'is-suspended' : isPending ? 'is-pending' : ''}`}
                  >
                    <td>
                      <div className="tenant-cell-brand">
                        <div 
                          className="tenant-badge-dot" 
                          style={{ backgroundColor: isSuspended ? '#ef4444' : isPending ? '#f59e0b' : (t.branding?.primaryColor || '#0071E3') }} 
                        />
                        <div>
                          <strong>{t.name}</strong>
                          {isSuspended && (
                            <div className="tenant-suspension-note">
                              {t.suspensionReason || 'موقوف لعدم السداد'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="tenant-cell-doctor">
                        <span>{t.doctorName}</span>
                        <small>{t.specialty}</small>
                      </div>
                    </td>

                    <td>
                      <div className="tenant-cell-slug">
                        <code>/c/{t.slug}</code>
                        <button 
                          type="button" 
                          onClick={() => onCopyLink(t.slug)}
                          className="btn-icon-copy"
                          title="نسخ رابط الحجز العام"
                          aria-label="نسخ رابط الحجز"
                        >
                          {copiedSlug === t.slug ? <CheckCheck size={14} color="#10B981" /> : <Copy size={14} />}
                        </button>
                        <a 
                          href={`/c/${t.slug}/booking`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="btn-icon-copy"
                          title="فتح بوابة حجز العيادة للمرضى"
                          aria-label="فتح بوابة حجز العيادة"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </td>

                    <td>
                      <span className={`saas-tier-pill ${t.subscriptionTier || 'pro'}`}>
                        {t.subscriptionTier === 'enterprise' ? 'مؤسسي' : t.subscriptionTier === 'pro' ? 'برو ذكي' : 'أساسي'}
                      </span>
                    </td>

                    <td>
                      {isSuspended ? (
                        <span className="saas-status-pill suspended">
                          <AlertOctagon size={12} />
                          <span>موقوف لعدم السداد</span>
                        </span>
                      ) : isPending ? (
                        <span className="saas-status-pill pending">
                          <Clock size={12} />
                          <span>بانتظار الموافقة</span>
                        </span>
                      ) : (
                        <span className="saas-status-pill active">
                          <CheckCircle2 size={12} />
                          <span>نشط وساري</span>
                        </span>
                      )}
                    </td>

                    <td>
                      <div className="tenant-cell-quota">
                        <span>SMS: {t.quotas?.smsUsed || 0}/{t.quotas?.monthlySmsQuota || 1000}</span>
                        <div className="quota-bar-mini">
                          <div 
                            className="quota-bar-fill" 
                            style={{ width: `${Math.min(100, Math.round(((t.quotas?.smsUsed || 0) / (t.quotas?.monthlySmsQuota || 1000)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="tenant-actions-cell">
                        {isPending && (
                          <button 
                            type="button"
                            onClick={() => onApproveClinic(t.slug)}
                            className="btn-approve-clinic"
                            title="الموافقة على تسجيل العيادة وتفعيلها فوراً"
                          >
                            <Check size={13} />
                            <span>اعتماد العيادة</span>
                          </button>
                        )}

                        {!isSuspended ? (
                          <button 
                            type="button"
                            onClick={() => onSuspendClinic(t.slug)}
                            className="btn-suspend-clinic"
                            title="إيقاف العيادة فوراً لعدم سداد الاشتراك"
                          >
                            <Ban size={13} />
                            <span>إيقاف لعدم السداد</span>
                          </button>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => onReactivateClinic(t.slug)}
                            className="btn-reactivate-clinic"
                            title="إلغاء الإيقاف وإعادة تفعيل العيادة"
                          >
                            <CheckCircle2 size={13} />
                            <span>إعادة التفعيل</span>
                          </button>
                        )}

                        <button 
                          type="button"
                          className="btn-switch-tenant"
                          onClick={() => onSwitchAndVisit(t.slug)}
                          title="التبديل إلى بيانات هذه العيادة فوراً"
                        >
                          <span>لوحة العيادة</span>
                          <ExternalLink size={13} />
                        </button>
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
