import React from 'react';
import { Search, ExternalLink, CheckCircle2, Copy, CheckCheck, AlertOctagon, Clock, Ban, Check, Zap, Globe, MessageSquare, Trash2, Palette, ShieldAlert, Crown } from 'lucide-react';
import { getClinicUsage } from '../../../services/usageMeteringService';
import { getClinicSenderId } from '../../../services/smsService';

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
  onSwitchAndVisit,
  onTopUpClinic,
  onCustomizeBrand,
  onManageSubscription,
  onDeleteClinic
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
                          style={{ backgroundColor: isSuspended ? '#ef4444' : isPending ? '#f59e0b' : (t.branding?.primaryColor || '#09090B') }} 
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
                        <div style={{ marginTop: '4px' }}>
                          <span 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.72rem',
                              fontFamily: 'monospace',
                              background: 'rgba(59, 130, 246, 0.08)',
                              color: '#2563eb',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              border: '1px solid rgba(59, 130, 246, 0.2)'
                            }}
                            title="معرّف مرسل الـ SMS الحصري للعيادة (Telecom Sender ID)"
                          >
                            <MessageSquare size={10} />
                            <span>Sender: {t.senderId || getClinicSenderId(t.id || t.slug)}</span>
                          </span>
                        </div>
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
                      {(t.customDomain || t.custom_domain) && (
                        <div style={{ marginTop: '4px' }}>
                          <a
                            href={`https://${t.customDomain || t.custom_domain}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.76rem',
                              color: '#059669',
                              textDecoration: 'none',
                              fontFamily: 'monospace',
                              background: 'rgba(16, 185, 129, 0.1)',
                              padding: '1px 6px',
                              borderRadius: '4px'
                            }}
                            title="النطاق المخصص الحصري"
                          >
                            <Globe size={11} />
                            <span>{t.customDomain || t.custom_domain}</span>
                          </a>
                        </div>
                      )}
                    </td>

                    <td>
                      <span className={`saas-tier-pill ${t.subscriptionTier || 'pro'}`}>
                        {t.subscriptionTier === 'enterprise' ? 'مؤسسي' : t.subscriptionTier === 'pro' ? 'برو ذكي' : 'أساسي'}
                      </span>
                      {t.customAgreedPrice !== undefined && t.customAgreedPrice !== null && t.customAgreedPrice !== '' && (
                        <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                          اتفاق: {t.customAgreedPrice} ج.م
                        </div>
                      )}
                    </td>

                    <td>
                      {t.isLifetimeLicense || t.subscriptionStatus === 'lifetime' ? (
                        <span style={{
                          background: '#FEF3C7',
                          color: '#B45309',
                          border: '1px solid #FCD34D',
                          borderRadius: '999px',
                          padding: '0.2rem 0.6rem',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}>
                          <Crown size={12} color="#D97706" />
                          <span>مدى الحياة ∞</span>
                        </span>
                      ) : isSuspended ? (
                        <span className="saas-status-pill suspended">
                          <AlertOctagon size={12} />
                          <span>موقوف ومجمد</span>
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
                      {(() => {
                        const usage = getClinicUsage(t.id, t.quotas, t.subscriptionTier);
                        const percent = Math.min(100, Math.round(((usage.smsUsed || 0) / Math.max(1, usage.totalSmsAllowed)) * 100));
                        return (
                          <div className="tenant-cell-quota">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '2px' }}>
                              <span>SMS: {usage.smsUsed}/{usage.totalSmsAllowed}</span>
                              <span style={{ fontWeight: 700, color: usage.isSmsDepleted ? '#EF4444' : 'var(--text-secondary)' }}>
                                {usage.remainingSms} متبقي
                              </span>
                            </div>
                            <div className="quota-bar-mini">
                              <div 
                                className="quota-bar-fill" 
                                style={{ 
                                  width: `${percent}%`,
                                  backgroundColor: usage.isSmsDepleted ? '#EF4444' : percent > 85 ? '#F59E0B' : undefined
                                }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    <td>
                      <div className="tenant-actions-cell">
                        {/* Top-up Button */}
                        <button
                          type="button"
                          onClick={() => onTopUpClinic && onTopUpClinic(t)}
                          className="btn-topup-clinic"
                          title="شحن رصيد رسائل SMS أو ذكاء اصطناعي فوراً"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            background: '#FEF3C7',
                            border: '1px solid #FCD34D',
                            borderRadius: '6px',
                            padding: '0.32rem 0.6rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#92400E'
                          }}
                        >
                          <Zap size={13} color="#D97706" />
                          <span>شحن رصيد</span>
                        </button>

                        {/* Brand & Logo Customization Button for SaaS SuperAdmin */}
                        <button
                          type="button"
                          onClick={() => onCustomizeBrand && onCustomizeBrand(t)}
                          className="btn-brand-clinic"
                          title="تخصيص الشعار والباليتة الثلاثية للعيادة"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            background: '#F4F4F5',
                            border: '1px solid #E4E4E7',
                            borderRadius: '6px',
                            padding: '0.32rem 0.6rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#09090B'
                          }}
                        >
                          <Palette size={13} color="#09090B" />
                          <span>الهوية والشعار</span>
                        </button>

                        {/* Direct Subscription & Freeze/Suspend Control */}
                        <button
                          type="button"
                          onClick={() => onManageSubscription && onManageSubscription(t)}
                          className="btn-manage-subscription"
                          title="التحكم الكامل في الباقة والوقف والتجديد والحصص"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            background: '#EEF2FF',
                            border: '1px solid #C7D2FE',
                            borderRadius: '6px',
                            padding: '0.32rem 0.6rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#3730A3'
                          }}
                        >
                          <ShieldAlert size={13} color="#4F46E5" />
                          <span>الباقة والوقف</span>
                        </button>

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

                        {onDeleteClinic && (
                          <button
                            type="button"
                            onClick={() => onDeleteClinic(t.slug || t.id)}
                            className="btn-delete-tenant"
                            title="حذف العيادة نهائياً من المنصة"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#FEE2E2',
                              border: '1px solid #FCA5A5',
                              borderRadius: '6px',
                              padding: '0.35rem 0.5rem',
                              cursor: 'pointer',
                              color: '#DC2626'
                            }}
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
