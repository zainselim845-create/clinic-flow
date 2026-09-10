import React from 'react';
import { Send } from 'lucide-react';
import { 
  OCCASIONS, 
  generatePersonalizedOccasionMessage 
} from '../../../services/occasionCampaignService';

export function OccasionsTab({
  selectedOccasion,
  setSelectedOccasion,
  customOccasionOffer,
  setCustomOccasionOffer,
  occasionCandidates,
  currentClinic
}) {
  return (
    <div className="crm-tab-content">
      <div className="occasions-select-row">
        {OCCASIONS.map((occ) => (
          <button
            key={occ.id}
            className={`occasion-card-btn ${selectedOccasion === occ.id ? 'active' : ''}`}
            onClick={() => setSelectedOccasion(occ.id)}
          >
            <span className="occ-icon">{occ.icon}</span>
            <strong>{occ.name}</strong>
            <small>{occ.description}</small>
          </button>
        ))}
      </div>

      <div className="occasion-offer-customizer">
        <label>هدية / عرض المناسبة المخصص:</label>
        <input 
          type="text" 
          value={customOccasionOffer}
          onChange={(e) => setCustomOccasionOffer(e.target.value)}
          placeholder="مثال: خصم 20% على جلسات تبييض الأسنان أو باقات النضارة"
        />
      </div>

      <div className="candidates-grid">
        {(occasionCandidates || []).map((c) => {
          const msg = generatePersonalizedOccasionMessage(c, selectedOccasion, currentClinic, customOccasionOffer);
          const cleanPhone = (c.patientPhone || '').replace(/^0/, '20');
          const smsUrl = `sms:+${cleanPhone}?body=${encodeURIComponent(msg)}`;

          return (
            <div key={c.patientId} className="candidate-card">
              <div className="c-meta">
                <strong>{c.patientName}</strong>
                <span>الخدمة المفضلة له: <strong className="text-primary">{c.favoriteService}</strong></span>
              </div>
              <div className="c-msg-preview">
                <p>{msg}</p>
              </div>
              <a href={smsUrl} className="btn-action-primary full-width">
                <Send size={15} />
                <span>إرسال التهنئة والعرض عبر SMS</span>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
