import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from '@ark-ui/react/menu';
import { Portal } from '@ark-ui/react/portal';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { canSwitchTenants, getUserAllowedClinics } from '../utils/permissions';
import { Building2, ChevronDown, Check, ShieldCheck, Copy, CheckCheck, Lock } from 'lucide-react';
import './TenantSwitcher.css';

export default function TenantSwitcher({ renderLockedOnDedicated = false }) {
  const { tenant, allTenants, switchTenant, tenantSlug, isDedicatedDomain } = useTenant();
  const { user } = useAuth();
  const location = useLocation();
  const [copiedSlug, setCopiedSlug] = useState(null);

  const isSuperAdmin = (user?.role === 'super_admin' || user?.isSuperAdmin === true || location.pathname.startsWith('/super-admin')) && (!isDedicatedDomain || location.pathname.startsWith('/super-admin'));
  const canSwitch = canSwitchTenants(user, location.pathname, isDedicatedDomain);
  const allowedTenants = (isDedicatedDomain && !location.pathname.startsWith('/super-admin'))
    ? (tenant ? [tenant] : [])
    : getUserAllowedClinics(user, allTenants, isDedicatedDomain);

  const handleCopyBookingLink = (e, slug) => {
    e.stopPropagation();
    const link = `${window.location.origin}/c/${slug}/booking`;
    navigator.clipboard.writeText(link);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'enterprise':
        return <span className="tenant-tier-badge enterprise">مؤسسي Enterprise</span>;
      case 'pro':
        return <span className="tenant-tier-badge pro">عيادة ذكية Pro</span>;
      default:
        return <span className="tenant-tier-badge starter">أساسي Starter</span>;
    }
  };

  // 1. Dedicated domain mode: locked to tenant, switcher is completely hidden / disabled
  if (isDedicatedDomain && !isSuperAdmin) {
    if (renderLockedOnDedicated) {
      return (
        <div className="tenant-switcher-container" data-testid="tenant-switcher-locked">
          <div 
            className="tenant-switcher-btn tenant-locked" 
            title="نطاق مخصص مقفل — هذه العيادة مقفلة ومحمية بالكامل"
          >
            <div className="tenant-avatar-badge" style={{ backgroundColor: tenant?.branding?.primaryColor || 'var(--primary)' }}>
              <Building2 size={15} color="#FFFFFF" />
            </div>
            <div className="tenant-btn-info">
              <span className="tenant-name-label">{tenant?.name || 'العيادة النشطة'}</span>
              <span className="tenant-slug-label">/{tenantSlug}</span>
            </div>
            <div className="tenant-locked-tag" title="نطاق مخصص مقفل">
              <Lock size={13} />
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  // 2. Single-clinic lock: Regular doctors and receptionists cannot switch or see other clinics
  if (!canSwitch || allowedTenants.length <= 1) {
    return (
      <div className="tenant-switcher-container">
        <div 
          className="tenant-switcher-btn tenant-locked" 
          title="العيادة المصرح بها فقط — حساب أحادي العيادة مقفل أمنياً"
        >
          <div className="tenant-avatar-badge" style={{ backgroundColor: tenant?.branding?.primaryColor || 'var(--primary)' }}>
            <Building2 size={15} color="#FFFFFF" />
          </div>
          <div className="tenant-btn-info">
            <span className="tenant-name-label">{tenant?.name || 'العيادة النشطة'}</span>
            <span className="tenant-slug-label">/{tenantSlug}</span>
          </div>
          <div className="tenant-locked-tag" title="مقفل — حساب عيادة وحيدة">
            <Lock size={13} />
          </div>
        </div>
      </div>
    );
  }

  // 2. Multi-Clinic Owner / Super Admin Interactive Switcher
  return (
    <div className="tenant-switcher-container">
      <Menu.Root
        positioning={{ placement: 'bottom-start', gutter: 6 }}
        onSelect={(details) => {
          if (details.value && details.value !== 'copy' && details.value !== 'super-admin') {
            switchTenant(details.value);
          }
        }}
      >
        <Menu.Trigger asChild>
          <button 
            type="button"
            className="tenant-switcher-btn"
            title="التبديل بين العيادات المشتركة المصرح بها"
          >
            <div className="tenant-avatar-badge" style={{ backgroundColor: tenant?.branding?.primaryColor || 'var(--primary)' }}>
              <Building2 size={15} color="#FFFFFF" />
            </div>
            <div className="tenant-btn-info">
              <span className="tenant-name-label">{tenant?.name || 'العيادة النشطة'}</span>
              <span className="tenant-slug-label">/{tenantSlug}</span>
            </div>
            <ChevronDown size={14} className="tenant-arrow" />
          </button>
        </Menu.Trigger>

        <Portal>
          <Menu.Positioner style={{ zIndex: 1050 }}>
            <Menu.Content className="tenant-dropdown-menu">
              <div className="tenant-dropdown-header">
                <span>العيادات المصرح بها ({allowedTenants.length})</span>
                <span className="saas-badge">{isSuperAdmin ? 'Super Admin Control' : 'Multi-Clinic Owner'}</span>
              </div>

              <div className="tenant-list">
                {allowedTenants.map((item) => {
                  const isSelected = item.slug === tenantSlug;
                  return (
                    <Menu.Item 
                      key={item.slug || item.id}
                      value={item.slug}
                      asChild
                    >
                      <div 
                        className={`tenant-item ${isSelected ? 'active' : ''}`}
                        onClick={() => switchTenant(item.slug)}
                      >
                        <div className="tenant-item-color-bar" style={{ backgroundColor: item.branding?.primaryColor || '#0071E3' }} />
                        
                        <div className="tenant-item-main">
                          <div className="tenant-item-top">
                            <strong className="tenant-item-title">{item.name}</strong>
                            {getTierBadge(item.subscriptionTier)}
                          </div>
                          
                          <p className="tenant-item-doctor">{item.doctorName} • {item.specialty}</p>
                          
                          <div className="tenant-item-actions">
                            <button 
                              type="button" 
                              className="tenant-copy-btn"
                              onClick={(e) => handleCopyBookingLink(e, item.slug)}
                              title="نسخ رابط حجز المرضى الخاص بهذه العيادة"
                            >
                              {copiedSlug === item.slug ? (
                                <>
                                  <CheckCheck size={12} color="#10B981" />
                                  <span>تم نسخ رابط الحجز</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>رابط الحجز: /c/{item.slug}/booking</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="tenant-selected-check">
                            <Check size={16} />
                          </div>
                        )}
                      </div>
                    </Menu.Item>
                  );
                })}
              </div>

              {isSuperAdmin && (
                <div className="tenant-dropdown-footer">
                  <a href="/super-admin" className="super-admin-link">
                    <ShieldCheck size={14} />
                    <span>لوحة مالك المنصة (Super Admin Portal)</span>
                  </a>
                </div>
              )}
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </div>
  );
}

