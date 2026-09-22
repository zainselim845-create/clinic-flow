import React from 'react';
import { Search, ExternalLink, CheckCircle2, Copy, CheckCheck, AlertOctagon, Clock, Ban, Check, Zap, Globe, MessageSquare, Trash2, Palette, ShieldAlert, Crown, RotateCcw, Phone } from 'lucide-react';
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
  lifetimeClinics = 0,
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
  onDeleteClinic,
  onRefresh
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
            <option value="lifetime">تراخيص مدى الحياة ({lifetimeClinics})</option>
            <option value="pending_approval">قيد المراجعة والموافقة ({pendingClinics})</option>
            <option value="suspended">الموقوفة لعدم السداد ({suspendedClinics})</option>
          </select>

          {onRefresh && (
            <button 
              type="button" 
              onClick={onRefresh} 
              className="saas-refresh-btn"
              title="تحديث البيانات ومزامنة المستأجرين الآن"
              aria-label="تحديث ومزامنة المستأجرين"
            >
              <RotateCcw size={15} />
              <span>تحديث</span>
            </button>
          )}
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
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary, #0f172a)' }}>{t.doctorName}</strong>
                        <small style={{ color: 'var(--text-secondary, #64748b)', marginTop: '2px' }}>{t.specialty}</small>
                        {t.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                            <a 
                              href={`tel:${t.phone}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.74rem',
                                color: '#0284C7',
                                textDecoration: 'none',
                                fontWeight: 700,
                                background: 'rgba(2, 132, 199, 0.08)',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}
                              title="اتصال بالطبيب هاتفياً"
                            >
                              <Phone size={11} />
                              <span dir="ltr">{t.phone}</span>
                            </a>
                            <a
                              href={`https://wa.me/20${t.phone.replace(/^0/, '')}?text=${encodeURIComponent(`مرحباً د. ${t.doctorName || ''}، نتواصل معك من إدارة منصة ClinicFlow بخصوص عيادتكم (${t.name}).`)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.72rem',
                                color: '#16A34A',
                                textDecoration: 'none',
                                fontWeight: 700,
                                background: 'rgba(22, 163, 74, 0.08)',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}
                              title="محادثة واتساب مع الطبيب"
                            >
                              <MessageSquare size={11} />
                              <span>واتساب</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="tenant-cell-slug" dir="ltr" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-start', whiteSpace: 'nowrap' }}>
                        <code style={{ fontSize: '0.8rem', padding: '3px 8px', borderRadius: '6px', background: '#F1F5F9', color: '#0284C7', fontWeight: 600, whiteSpace: 'nowrap', fontFeatureSettings: '"tnum"' }}>
                          /c/{t.slug}
                        </code>
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
                      {t.senderId && (
                        <div style={{ marginTop: '6px' }} dir="ltr">
                          <span 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.72rem',
                              fontFamily: 'monospace',
                              background: '#F8FAFC',
                              color: '#475569',
                              padding: '2px 8px',
                              borderRadius: '5px',
                              border: '1px solid #E2E8F0',
                              whiteSpace: 'nowrap'
                            }}
                            title="معرّف مرسل الـ SMS الحصري للعيادة (Telecom Sender ID)"
                          >
                            <span>Sender: {t.senderId}</span>
                          </span>
                        </div>
                      )}
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
                              fontSize: '0.74rem',
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginBottom: '4px' }}>
                              <span dir="ltr" style={{ fontWeight: 600, color: '#334155' }}>
                                SMS: {usage.smsUsed} / {usage.totalSmsAllowed}
                              </span>
                              <span style={{ fontWeight: 700, color: usage.isSmsDepleted ? '#EF4444' : '#64748B' }}>
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
                      <div className="table-actions-container">
                        {isPending ? (
                          <button 
                            type="button"
                            onClick={() => onApproveClinic(t.slug)}
                            className="btn-table-primary"
                            title="الموافقة على تسجيل العيادة واعتماد الحساب وتفعيله فوراً"
                          >
                            <CheckCircle2 size={14} />
                            <span>تفعيل واعتماد</span>
                          </button>
                        ) : isSuspended ? (
                          <button 
                            type="button"
                            onClick={() => onReactivateClinic(t.slug)}
                            className="btn-table-primary"
                            title="إلغاء الإيقاف وإعادة تفعيل العيادة"
                          >
                            <CheckCircle2 size={14} />
                            <span>إلغاء الإيقاف</span>
                          </button>
                        ) : (
                          <button 
                            type="button"
                            className="btn-table-primary"
                            onClick={() => onSwitchAndVisit(t.slug)}
                            title="الانتقال إلى لوحة تحكم هذه العيادة"
                          >
                            <span>لوحة العيادة</span>
                            <ExternalLink size={12} />
                          </button>
                        )}

                        {/* Direct Subscription & Management Button */}
                        <button
                          type="button"
                          onClick={() => onManageSubscription && onManageSubscription(t)}
                          className="btn-table-secondary"
                          title="التحكم في الباقة، الحصص، الإيقاف، والترقية"
                        >
                          <ShieldAlert size={13} />
                          <span>إدارة الاشتراك</span>
                        </button>

                        {/* Top-up Icon Button */}
                        <button
                          type="button"
                          onClick={() => onTopUpClinic && onTopUpClinic(t)}
                          className="btn-table-icon warning"
                          title="شحن رصيد رسائل SMS أو ذكاء اصطناعي"
                          aria-label="شحن رصيد"
                        >
                          <Zap size={14} />
                        </button>

                        {/* Brand Customization Icon Button */}
                        <button
                          type="button"
                          onClick={() => onCustomizeBrand && onCustomizeBrand(t)}
                          className="btn-table-icon btn-brand-clinic"
                          title="تخصيص الشعار وألوان هوية العيادة"
                          aria-label="تخصيص الهوية"
                        >
                          <Palette size={14} />
                        </button>

                        {/* Suspend Toggle (If not already suspended/pending) */}
                        {!isSuspended && !isPending && (
                          <button 
                            type="button"
                            onClick={() => onSuspendClinic(t.slug)}
                            className="btn-table-icon danger"
                            title="إيقاف العيادة مؤقتاً لعدم سداد الاشتراك"
                            aria-label="إيقاف العيادة"
                          >
                            <Ban size={14} />
                          </button>
                        )}

                        {onDeleteClinic && (
                          <button
                            type="button"
                            onClick={() => onDeleteClinic(t.slug || t.id)}
                            className="btn-table-icon danger"
                            title="حذف العيادة نهائياً من المنصة"
                            aria-label="حذف العيادة"
                          >
                            <Trash2 size={14} />
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
