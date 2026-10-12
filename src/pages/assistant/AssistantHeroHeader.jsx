import React from 'react';
import { Bot, Users } from 'lucide-react';

/**
 * AssistantHeroHeader - Top banner for Doctor AI Assistant
 */
export default function AssistantHeroHeader({ patientsCount }) {
  return (
    <div className="assistant-hero-card glass-card">
      <div className="hero-content-row">
        <div className="hero-badge">
          <div className="bot-icon">
            <Bot size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              مساعد الطبيب
            </h1>
            <p>
              تحديد مجموعات المرضى وإرسال رسائل المتابعة والتذكير بنقرة واحدة
            </p>
          </div>
        </div>
        <div className="hero-stats-pill">
          <Users size={16} />
          <span>إجمالي المرضى بالسجل: <strong>{patientsCount || 0}</strong></span>
        </div>
      </div>
    </div>
  );
}
