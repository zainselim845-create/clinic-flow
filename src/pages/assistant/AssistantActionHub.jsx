import React from 'react';
import { 
  CheckSquare, Square, MessageCircle, Filter, 
  MessageSquare, RefreshCw, Send, CheckCircle2 
} from 'lucide-react';
import { personalizeMessage } from '../../utils/doctorAgentHelpers';

/**
 * AssistantActionHub - Targeted Patient Campaign Dispatch & SMS Broadcast Controller
 */
export default function AssistantActionHub({
  targetPatients,
  selectedPatientIds,
  selectedPatientsList,
  handleToggleSelectAll,
  togglePatientSelection,
  customMessage,
  setCustomMessage,
  selectedTemplateId,
  handleSelectTemplate,
  samplePatient,
  previewText,
  currentClinic,
  isBroadcastingSms,
  handleBulkSmsBroadcast,
  broadcastResults,
  campaignTemplates
}) {
  return (
    <div className="action-hub-column">
      
      {/* Targeted Patients Selection List */}
      <div className="target-patients-card glass-card">
        <div className="target-header-row">
          <div>
            <h3>قائمة المرضى المستهدفين ({targetPatients.length})</h3>
            <span className="sub-hint">المحدد للإرسال: {selectedPatientsList.length} مريض</span>
          </div>
          {targetPatients.length > 0 && (
            <button 
              type="button" 
              className="btn-select-all" 
              onClick={handleToggleSelectAll}
            >
              {selectedPatientIds.size === targetPatients.length ? <CheckSquare size={16} /> : <Square size={16} />}
              <span>{selectedPatientIds.size === targetPatients.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}</span>
            </button>
          )}
        </div>

        {targetPatients.length > 0 ? (
          <div className="target-patients-list">
            {targetPatients.map(patient => {
              const isSelected = selectedPatientIds.has(patient.id);
              const patientMsg = personalizeMessage(customMessage, patient, currentClinic);
              const smsUrl = patient.phone 
                ? `sms:+${patient.phone.replace(/\D/g, '').replace(/^0/, '20')}?body=${encodeURIComponent(patientMsg)}`
                : null;

              return (
                <div 
                  key={patient.id} 
                  className={`target-patient-row ${isSelected ? 'selected' : ''}`}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label={`تحديد المريض ${patient.name}`}
                    className="check-box-wrapper"
                    onClick={() => togglePatientSelection(patient.id)}
                    style={{ background: 'transparent', border: 'none', padding: 0 }}
                  >
                    {isSelected ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} className="text-muted" />}
                  </button>

                  <div 
                    className="patient-main-details" 
                    onClick={() => togglePatientSelection(patient.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter' || e.key === ' ') { 
                        e.preventDefault(); 
                        togglePatientSelection(patient.id); 
                      } 
                    }}
                    aria-label={`بيانات المريض ${patient.name}`}
                  >
                    <div className="name-line">
                      <strong>{patient.name}</strong>
                      {patient.bloodType && <span className="tag-blood">{patient.bloodType}</span>}
                    </div>
                    <span className="phone-line">
                      {patient.phone || 'بدون هاتف'} • آخر زيارة: {patient.lastVisit || 'غير مسجل'}
                    </span>
                    {patient.diagnosis && <p className="diag-line">{patient.diagnosis}</p>}
                  </div>

                  {/* Direct SMS 1-Click Action */}
                  <div className="patient-direct-actions">
                    {smsUrl ? (
                      <a 
                        href={smsUrl}
                        className="btn-single-wa"
                        title="إرسال رسالة رعاية عبر SMS مباشرة لهذا المريض"
                      >
                        <MessageCircle size={15} />
                        <span>SMS</span>
                      </a>
                    ) : (
                      <span className="no-phone-tag">لا يوجد هاتف</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-target-state">
            <Filter size={36} className="text-muted" />
            <p>لا يوجد مرضى مطابقين لهذا الفلتر حالياً في سجل العيادة.</p>
          </div>
        )}
      </div>

      {/* Campaign Message Composer & Templates */}
      <div className="campaign-composer-card glass-card">
        <div className="composer-header">
          <h3>
            <MessageSquare size={18} className="text-emerald" />
            <span>صياغة رسالة الرعاية والمتابعة</span>
          </h3>
        </div>

        {/* Template Selector Chips */}
        <div className="templates-selector-grid">
          {campaignTemplates.map(tmpl => (
            <button
              key={tmpl.id}
              type="button"
              className={`template-chip-card ${selectedTemplateId === tmpl.id ? 'active' : ''}`}
              onClick={() => handleSelectTemplate(tmpl)}
            >
              <strong>{tmpl.title}</strong>
              <p>{tmpl.description}</p>
            </button>
          ))}
        </div>

        {/* Custom Message Editor */}
        <div className="editor-group">
          <label>نص الرسالة المخصصة (يدعم استبدال المتغيرات تلقائياً):</label>
          <textarea 
            rows={4}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="message-textarea"
            placeholder="اكتب نص الرسالة هنا..."
          />
          <span className="variables-hint">
            المتغيرات المدعومة: <code>{'{اسم_المريض}'}</code> ، <code>{'{اسم_العيادة}'}</code> ، <code>{'{اسم_الطبيب}'}</code> ، <code>{'{رابط_الحجز}'}</code>
          </span>
        </div>

        {/* Live Message Preview Card */}
        <div className="message-live-preview-card">
          <span className="preview-label">معاينة شكل الرسالة للمريض ({samplePatient.name}):</span>
          <div className="preview-bubble">
            <p>{previewText}</p>
          </div>
        </div>

        {/* Broadcast Results Feedback */}
        {broadcastResults && (
          <div className="broadcast-feedback-alert">
            <CheckCircle2 size={20} color="#10B981" />
            <div>
              <strong>تم الانتهاء من إرسال الحملة:</strong>
              <span> تم إرسال {broadcastResults.sent} رسالة بنجاح (فشل: {broadcastResults.failed}) من إجمالي {broadcastResults.total} مريض.</span>
            </div>
          </div>
        )}

        {/* Campaign Dispatch Action Bar */}
        <div className="campaign-actions-bar">
          <button 
            type="button"
            className="btn-broadcast-sms"
            onClick={handleBulkSmsBroadcast}
            disabled={isBroadcastingSms || selectedPatientsList.length === 0}
          >
            {isBroadcastingSms ? <RefreshCw size={17} className="spin-animation" /> : <Send size={17} />}
            <span>
              {isBroadcastingSms 
                ? 'جاري إرسال الرسائل...' 
                : `إرسال رسائل SMS للحملة (${selectedPatientsList.length} مريض)`}
            </span>
          </button>
        </div>

      </div>

    </div>
  );
}
