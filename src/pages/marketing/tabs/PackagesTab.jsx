import React from 'react';
import { UserPlus, MessageCircle } from 'lucide-react';

export function PackagesTab({ 
  packagesList, 
  currentClinic, 
  setIsAddPackageModalOpen 
}) {
  return (
    <div className="crm-tab-content">
      <div className="packages-toolbar">
        <div>
          <h4>📦 متابعة باقات وجلسات الجلدية والليزر</h4>
          <p>تتبع عدد الجلسات المنجزة والمتبقية وتنبيه المرضى المتوقفين.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddPackageModalOpen(true)}>
          <UserPlus size={16} />
          <span>إضافة باقة لمريض</span>
        </button>
      </div>

      <div className="packages-cards-grid">
        {(packagesList || []).map((pkg) => {
          const progress = Math.round((pkg.completedSessions / pkg.totalSessions) * 100);
          const isStalled = pkg.completedSessions < pkg.totalSessions;

          return (
            <div key={pkg.id} className="package-crm-card">
              <div className="pkg-top">
                <div>
                  <strong>{pkg.patientName}</strong>
                  <h5>{pkg.packageName}</h5>
                </div>
                <span className="pkg-price-badge">{pkg.price}</span>
              </div>

              <div className="pkg-progress-container">
                <div className="pkg-progress-bar">
                  <div className="pkg-progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="pkg-progress-labels">
                  <span>أنجز {pkg.completedSessions} من {pkg.totalSessions} جلسات</span>
                  <span>{progress}%</span>
                </div>
              </div>

              <div className="pkg-footer-actions">
                <span className="pkg-remaining">المتبقي: <strong>{pkg.totalSessions - pkg.completedSessions} جلسات</strong></span>
                {isStalled && (
                  <a 
                    href={`sms:+${(pkg.patientPhone || '').replace(/^0/, '20')}?body=${encodeURIComponent(`مرحباً يا ${pkg.patientName.split(' ')[0]} 🌸\nنود تذكيرك من ${currentClinic?.name || 'العيادة'} بموعد جلستك القادمة في ${pkg.packageName}. متبقي لك (${pkg.totalSessions - pkg.completedSessions}) جلسات.`)}`}
                    className="btn-action-primary"
                  >
                    <MessageCircle size={14} />
                    <span>تذكير بالجلسة عبر SMS</span>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
