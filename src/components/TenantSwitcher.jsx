import React, { useState, useRef, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { Building2, ChevronDown, Check, ExternalLink, ShieldCheck, Sparkles, Copy, CheckCheck } from 'lucide-react';
import './TenantSwitcher.css';

export default function TenantSwitcher() {
  const { tenant, allTenants, switchTenant, tenantSlug } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  return (
    <div className="tenant-switcher-container" ref={dropdownRef}>
      <button 
        type="button"
        className="tenant-switcher-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="التبديل بين العيادات المشتركة"
      >
        <div className="tenant-avatar-badge" style={{ backgroundColor: tenant?.branding?.primaryColor || 'var(--primary)' }}>
          <Building2 size={15} color="#FFFFFF" />
        </div>
        <div className="tenant-btn-info">
          <span className="tenant-name-label">{tenant?.name || 'العيادة النشطة'}</span>
          <span className="tenant-slug-label">/{tenantSlug}</span>
        </div>
        <ChevronDown size={14} className={`tenant-arrow ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="tenant-dropdown-menu">
          <div className="tenant-dropdown-header">
            <span>العيادات والمراكز المسجلة ({allTenants.length})</span>
            <span className="saas-badge">Multi-Tenant SaaS</span>
          </div>

          <div className="tenant-list">
            {allTenants.map((item) => {
              const isSelected = item.slug === tenantSlug;
              return (
                <div 
                  key={item.slug || item.id}
                  className={`tenant-item ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    switchTenant(item.slug);
                    setIsOpen(false);
                  }}
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
              );
            })}
          </div>

          <div className="tenant-dropdown-footer">
            <a href="/super-admin" className="super-admin-link">
              <ShieldCheck size={14} />
              <span>لوحة مالك المنصة (Super Admin Portal)</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
