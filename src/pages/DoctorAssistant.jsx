import React, { useEffect, useMemo, useState } from 'react';
import { 
  Bot, Send, Sparkles, Users, MessageSquare, CheckSquare, 
  Square, Stethoscope, RefreshCw, CheckCircle2, MessageCircle, Filter, Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { sendSMS } from '../services/smsService';
import { askDoctorAiAssistant } from '../services/aiAssistantService';
import * as blockedSlotsService from '../services/blockedSlotsService';
import { processDoctorIntent } from '../utils/clinicalAssistantActions';
import './DoctorAssistant.css';

// Pre-defined Clinical Campaign Templates
export const CAMPAIGN_TEMPLATES = [
  {
    id: 'post_care',
    title: ' نصائح وإرشادات ما بعد الكشف',
    description: 'إرسال تعليمات العناية والاطمئنان بعد زيارة العيادة',
    template: 'مرحباً أ/ {اسم_المريض}، نتمنى لك دوام الصحة والعافية بعد زيارتك لـ {اسم_العيادة}. نذكرك بالالتزام بتعليمات العلاج الموصوفة، ونحن دائماً في خدمتك للاستفسار. نتمنى لك الشفاء العاجل! '
  },
  {
    id: 'followup_reminder',
    title: ' تذكير بموعد الاستشارة الدورية',
    description: 'تنبيه المرضى بقرب موعد الاستشارة ومراجعة التحاليل',
    template: 'مرحباً أ/ {اسم_المريض}، من {اسم_العيادة}. نود تذكيرك بموعد الاستشارة ومتابعة نتائج التحاليل للاطمئنان التام على صحتك. يمكنك حجز موعدك بسهولة عبر الرابط: {رابط_الحجز}'
  },
  {
    id: 'medication_check',
    title: ' متابعة الالتزام بالخطة العلاجية',
    description: 'الاطمئنان على انتظام المريض في أخذ الأدوية والجرعات',
    template: 'عزيزي أ/ {اسم_المريض}، متابعة لصحتك من عيادة {اسم_العيادة}، نرجو التأكد من تناول الأدوية في مواعيدها المحددة من {اسم_الطبيب}. مع تمنياتنا لك بتمام العافية! '
  },
  {
    id: 'routine_invitation',
    title: ' دعوة للفحص الدوري السنوي/الشهري',
    description: 'تشجيع المرضى على إجراء الفحوصات والتحاليل الوقائية',
    template: 'مرحباً أ/ {اسم_المريض}، حرصاً من {اسم_العيادة} على صحتك ووقايتك، نذكرك بأهمية إجراء الفحص والمتابعة الدورية. يسعدنا استقبالك في أي وقت: {رابط_الحجز}'
  }
];

export const formatDoctorName = (name) => {
  if (!name) return 'د. أحمد الشريف';
  const trimmed = name.trim();
  if (trimmed.startsWith('د.') || trimmed.startsWith('د/')) return trimmed;
  return `د. ${trimmed}`;
};

export const personalizeMessage = (templateText, patient, clinicInfo) => {
  if (!templateText) return '';
  const clinicName = clinicInfo?.name || 'عيادة كلينك فلو';
  const doctorName = formatDoctorName(clinicInfo?.doctorName);
  const bookingLink = typeof window !== 'undefined' ? `${window.location.origin}/booking` : 'https://clinic-flow-ten-sigma.vercel.app/booking';

  return templateText
    .replace(/{اسم_المريض}/g, patient.name || 'المريض')
    .replace(/{اسم_العيادة}/g, clinicName)
    .replace(/{اسم_الطبيب}/g, doctorName)
    .replace(/{تاريخ_الزيارة}/g, patient.lastVisit || 'سابقاً')
    .replace(/{رابط_الحجز}/g, bookingLink);
};

export const filterTargetPatients = (patients, appointments, queryFilter) => {
  if (!patients || patients.length === 0) return [];
  const normalizedQuery = (queryFilter || '').trim().toLowerCase();

  return patients.filter(patient => {
    const patientAppts = (appointments || []).filter(a => a.patientId === patient.id || a.patientPhone === patient.phone);

    if (!normalizedQuery || normalizedQuery === 'all') return true;

    // Filter by Service / Visit Type
    if (normalizedQuery === 'consultation' || normalizedQuery.includes('استشارة')) {
      return patientAppts.some(a => (a.type || '').includes('استشارة'));
    }
    if (normalizedQuery === 'regular' || normalizedQuery.includes('كشف عادي')) {
      return patientAppts.some(a => (a.type || '').includes('كشف عادي') || (a.type || '').includes('عادي'));
    }
    if (normalizedQuery === 'followup' || normalizedQuery.includes('متابعة')) {
      return (patient.visitsCount > 1) || patientAppts.some(a => (a.type || '').includes('متابعة') || (a.type || '').includes('استشارة'));
    }
    if (normalizedQuery === 'urgent' || normalizedQuery.includes('طوارئ')) {
      return patientAppts.some(a => (a.type || '').includes('طوارئ'));
    }

    // Keyword match on diagnosis, notes, service
    const matchDiagnosis = (patient.diagnosis || '').toLowerCase().includes(normalizedQuery);
    const matchNotes = (patient.notes || '').toLowerCase().includes(normalizedQuery);
    const matchApptType = patientAppts.some(a => (a.type || '').toLowerCase().includes(normalizedQuery) || (a.notes || '').toLowerCase().includes(normalizedQuery));

    return matchDiagnosis || matchNotes || matchApptType;
  });
};

const CHAT_HISTORY_STORAGE_KEY = 'clinicflow_doctor_chat_history';

const DoctorAssistant = () => {
  const { state, dispatch } = useApp();
  const { clinic } = useAuth();
  const currentClinic = state.clinicInfo || clinic;
  const patients = state.patients || [];
  const doctorTitle = formatDoctorName(currentClinic?.doctorName);


  // Load Conversation State from localStorage if present
  const [messages, setMessages] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Failed to load chat history from localStorage', e);
      }
    }
    return [
      {
        id: 'msg-welcome',
        sender: 'agent',
        text: `مرحباً ${doctorTitle}! \nأنا مساعدك السريري الذكي المدعوم بنماذج OpenRouter. يمكنك التحدث معي مباشرة وطلب البحث عن المرضى الذين أجروا خدمة معينة (مثل: كشف عادي، استشارة، أو متابعات)، واقتراح رسائل الرعاية وإرسالها فوراً عبر واتساب و SMS! `,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  // Automatically save chat history across tab switches & page navigation
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(messages));
      } catch (e) {
        console.error('Failed to save chat history to localStorage', e);
      }
    }
  }, [messages]);

  // Clear chat handler
  const handleClearChat = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح سجل المحادثة بالكامل والبدء من جديد؟')) {
      const freshWelcome = [
        {
          id: 'msg-welcome-' + Date.now(),
          sender: 'agent',
          text: `مرحباً ${doctorTitle}! \nتم مسح المحادثة السابقة. أنا جاهز لمساعدتك في أي استفسار جديد حول رعاية المرضى أو استخراج السجلات! `,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ];
      setMessages(freshWelcome);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
      }
    }
  };
  const [inputText, setInputText] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedPatientIds, setSelectedPatientIds] = useState(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState('post_care');
  const [customMessage, setCustomMessage] = useState(CAMPAIGN_TEMPLATES[0].template);
  const [isBroadcastingSms, setIsBroadcastingSms] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [broadcastResults, setBroadcastResults] = useState(null);

  // Target Patients List
  const targetPatients = useMemo(() => {
    return filterTargetPatients(state.patients || [], state.appointments || [], activeFilter);
  }, [state.patients, state.appointments, activeFilter]);

  // Execute Clinical Action helper
  const executeDoctorAction = (actionResult) => {
    if (actionResult.actionType === 'BLOCK_FULL_DAY') {
      dispatch({ type: 'BLOCK_FULL_DAY', payload: actionResult.payload });
      if (useSupabase) {
        blockedSlotsService.blockSlotInDb(actionResult.payload.date, 'FULL_DAY', actionResult.payload.reason || 'إجازة الطبيب', true).catch(console.error);
      }
    } else if (actionResult.actionType === 'UNBLOCK_FULL_DAY') {
      dispatch({ type: 'UNBLOCK_FULL_DAY', payload: actionResult.payload });
      if (useSupabase) {
        blockedSlotsService.unblockFullDayInDb(actionResult.payload.date).catch(console.error);
      }
    } else if (actionResult.actionType === 'BLOCK_SLOT') {
      dispatch({ type: 'TOGGLE_BLOCK_SLOT', payload: actionResult.payload });
      if (useSupabase) {
        blockedSlotsService.blockSlotInDb(actionResult.payload.date, actionResult.payload.time, actionResult.payload.reason || 'حظر مخصص', false).catch(console.error);
      }
    } else if (actionResult.actionType === 'UNBLOCK_SLOT') {
      dispatch({ type: 'TOGGLE_BLOCK_SLOT', payload: actionResult.payload });
      if (useSupabase) {
        blockedSlotsService.unblockSlotInDb(actionResult.payload.date, actionResult.payload.time).catch(console.error);
      }
    }
  };

  // Handle Quick Prompts from Doctor
  const handleQuickPrompt = async (promptText, filterKey) => {
    const doctorMsg = {
      id: 'doc-' + Date.now(),
      sender: 'doctor',
      text: promptText,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, doctorMsg];
    setMessages(newHistory);
    setIsAiGenerating(true);

    // 1. Check if quick prompt is an administrative action
    const actionResult = processDoctorIntent(promptText, state);
    if (actionResult.isAction) {
      executeDoctorAction(actionResult);
      const agentMsg = {
        id: 'agent-' + Date.now(),
        sender: 'agent',
        text: actionResult.replyText,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, agentMsg]);
      setIsAiGenerating(false);
      return;
    }

    setActiveFilter(filterKey);
    const matched = filterTargetPatients(state.patients || [], state.appointments || [], filterKey);
    setSelectedPatientIds(new Set(matched.map(p => p.id)));

    try {
      const aiRes = await askDoctorAiAssistant(newHistory, currentClinic, matched, state);
      let agentReply = '';
      if (aiRes.success && aiRes.content) {
        agentReply = aiRes.content;
      } else {
        const count = matched.length;
        agentReply = count > 0 
          ? `${doctorTitle}، قمت بمسح السجلات السريرية ووجدت **${count} مريضاً** مطابقين لمعايير (${promptText}). يمكنك استعراضهم بالأسفل وتخصيص رسالة الرعاية! `
          : `${doctorTitle}، لم أجد حالياً مرضى مطابقين لمعايير (${promptText}) بالسجل.`;
      }

      const agentMsg = {
        id: 'agent-' + Date.now(),
        sender: 'agent',
        text: agentReply,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch {
      const agentMsg = {
        id: 'agent-' + Date.now(),
        sender: 'agent',
        text: `تم العثور على ${matched.length} مريض مطابق للطلب.`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, agentMsg]);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Handle Custom Text Message Input
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isAiGenerating) return;

    const query = inputText.trim();
    setInputText('');

    const doctorMsg = {
      id: 'doc-' + Date.now(),
      sender: 'doctor',
      text: query,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, doctorMsg];
    setMessages(newHistory);
    setIsAiGenerating(true);

    // 1. Process Intent / Action (Blocking days, slots, summaries, list queries)
    const actionResult = processDoctorIntent(query, state);
    if (actionResult.isAction) {
      executeDoctorAction(actionResult);
      const agentMsg = {
        id: 'agent-' + Date.now(),
        sender: 'agent',
        text: actionResult.replyText,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, agentMsg]);
      setIsAiGenerating(false);
      return;
    }

    let detectedFilter = query;
    if (query.includes('استشارة') || query.includes('استشارات')) detectedFilter = 'consultation';
    else if (query.includes('كشف') || query.includes('عادي')) detectedFilter = 'regular';
    else if (query.includes('متابعة') || query.includes('متابعات')) detectedFilter = 'followup';
    else if (query.includes('طوارئ')) detectedFilter = 'urgent';

    setActiveFilter(detectedFilter);
    const matched = filterTargetPatients(state.patients || [], state.appointments || [], detectedFilter);
    setSelectedPatientIds(new Set(matched.map(p => p.id)));

    try {
      const aiRes = await askDoctorAiAssistant(newHistory, currentClinic, matched, state);
      let replyText = '';
      if (aiRes.success && aiRes.content) {
        replyText = aiRes.content;
      } else {
        const count = matched.length;
        replyText = count > 0 
          ? `${doctorTitle}، قمت بتحليل السجلات ووجدت **${count} مريضاً** مطابقين لطلبك (${query}). يمكنك استعراضهم بالأسفل واختيار القالب المناسب لإرسال الرسائل! `
          : `${doctorTitle}، لم أجد حالياً مرضى مطابقين لهذا الفلتر في سجل العيادة.`;
      }

      const agentMsg = {
        id: 'agent-' + Date.now(),
        sender: 'agent',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch {
      const agentMsg = {
        id: 'agent-' + Date.now(),
        sender: 'agent',
        text: `تم فرز السجلات وإيجاد ${matched.length} مريض مطابق للطلب.`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, agentMsg]);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Toggle Single Patient Selection
  const togglePatientSelection = (id) => {
    setSelectedPatientIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select / Deselect All
  const handleToggleSelectAll = () => {
    if (selectedPatientIds.size === targetPatients.length) {
      setSelectedPatientIds(new Set());
    } else {
      setSelectedPatientIds(new Set(targetPatients.map(p => p.id)));
    }
  };

  // Select Template
  const handleSelectTemplate = (templateObj) => {
    setSelectedTemplateId(templateObj.id);
    setCustomMessage(templateObj.template);
  };

  // Selected Patients Array
  const selectedPatientsList = useMemo(() => {
    return targetPatients.filter(p => selectedPatientIds.has(p.id));
  }, [targetPatients, selectedPatientIds]);

  // Trigger Bulk SMS Broadcast
  const handleBulkSmsBroadcast = async () => {
    if (selectedPatientsList.length === 0) {
      setBroadcastResults({ success: false, error: 'يرجى تحديد مريض واحد على الأقل لإرسال الحملة.' });
      return;
    }

    if (!window.confirm(`هل أنت متأكد من رغبتك في إرسال رسائل SMS إلى ${selectedPatientsList.length} مريض؟`)) {
      return;
    }

    setIsBroadcastingSms(true);
    setBroadcastResults(null);
    let sentCount = 0;
    let failedCount = 0;

    for (const patient of selectedPatientsList) {
      if (!patient.phone) {
        failedCount++;
        continue;
      }
      const personalized = personalizeMessage(customMessage, patient, currentClinic);
      try {
        const res = await sendSMS(patient.phone, personalized);
        if (res.success) sentCount++;
        else failedCount++;
      } catch {
        failedCount++;
      }
    }

    setIsBroadcastingSms(false);
    setBroadcastResults({ sent: sentCount, failed: failedCount, total: selectedPatientsList.length });

    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        id: 'notif-' + Date.now(),
        type: 'campaign',
        title: 'إرسال حملة متابعة ورعاية مرضى ',
        message: `تم إرسال حملة رسائل إلى ${sentCount} مريض بنجاح (فشل: ${failedCount}).`,
        timestamp: new Date().toISOString(),
        read: false
      }
    });
  };

  // First selected patient sample for live preview
  const samplePatient = selectedPatientsList.length > 0 ? selectedPatientsList[0] : (targetPatients[0] || { name: 'محمد سعيد', lastVisit: '2026-08-24' });
  const previewText = personalizeMessage(customMessage, samplePatient, currentClinic);

  return (
    <div className="doctor-assistant-page">
      
      {/* 1. Header Banner */}
      <div className="assistant-hero-card glass-card">
        <div className="hero-content-row">
          <div className="hero-badge">
            <div className="bot-icon">
              <Bot size={24} />
            </div>
            <div>
              <h2>مساعد الطبيب السريري الذكي (AI Patient Care Agent)</h2>
              <p>تواصل مع وكيلك الذكي لتحديد شرائح المرضى وإرسال رسائل الرعاية والمتابعة الطبية المخصصة بنقرة واحدة</p>
            </div>
          </div>
          <div className="hero-stats-pill">
            <Users size={16} />
            <span>إجمالي المرضى بالسجل: <strong>{patients.length}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Layout: Chat Console & Action Hub */}
      <div className="assistant-split-layout">
        
        {/* Left Column: Interactive Chat Console */}
        <div className="chat-console-card glass-card">
          <div className="console-header">
            <div className="console-title">
              <Sparkles size={18} className="text-primary" />
              <span>محادثة الوكيل السريري الذكي</span>
            </div>
            <div className="console-header-actions">
              <span className="live-status-dot">متصل بالعيادة </span>
              <button 
                type="button" 
                onClick={handleClearChat}
                className="btn-clear-chat"
                title="مسح المحادثة والبدء من جديد"
              >
                <Trash2 size={13} />
                <span>مسح المحادثة</span>
              </button>
            </div>
          </div>

          {/* Messages Thread */}
          <div className="messages-thread-container">
            {messages.map(msg => (
              <div key={msg.id} className={`chat-bubble-row ${msg.sender}`}>
                <div className="bubble-avatar">
                  {msg.sender === 'agent' ? <Bot size={18} /> : <Stethoscope size={18} />}
                </div>
                <div className="bubble-content">
                  <div className="bubble-sender-name">
                    {msg.sender === 'agent' ? 'مساعد العيادة الذكي' : doctorTitle}
                    <span className="bubble-time">{msg.timestamp}</span>
                  </div>
                  <div className="bubble-text">
                    {msg.text.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {isAiGenerating && (
              <div className="chat-bubble-row agent">
                <div className="bubble-avatar">
                  <Bot size={18} />
                </div>
                <div className="bubble-content">
                  <div className="bubble-sender-name">
                    مساعد العيادة الذكي (OpenRouter AI)
                  </div>
                  <div className="bubble-text generating-state">
                    <div className="typing-dots">
                      <span></span><span></span><span></span>
                    </div>
                    <span>جاري تحليل السجلات وصياغة الرد السريري الذكي...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Doctor Prompts Chips */}
          <div className="quick-prompts-bar">
            <div className="prompts-label"> أوامر واستفسارات سريعة:</div>
            <div className="prompts-chips-grid">
              <button 
                type="button" 
                className="prompt-chip"
                onClick={() => handleQuickPrompt('اقفل يوم الأحد القادم')}
                style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)', color: '#DC2626' }}
              >
                 إغلاق الأحد القادم
              </button>
              <button 
                type="button" 
                className="prompt-chip"
                onClick={() => handleQuickPrompt('ايه الأيام والمواعيد المقفولة في العيادة؟')}
                style={{ borderColor: 'rgba(24, 96, 236, 0.3)', background: 'rgba(24, 96, 236, 0.08)', color: 'var(--primary)' }}
              >
                 الأيام المقفولة
              </button>
              <button 
                type="button" 
                className="prompt-chip"
                onClick={() => handleQuickPrompt('ملخص أداء وإحصائيات اليوم')}
                style={{ borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.08)', color: '#059669' }}
              >
                 ملخص اليوم
              </button>
              <button 
                type="button" 
                className={`prompt-chip ${activeFilter === 'regular' ? 'active' : ''}`}
                onClick={() => handleQuickPrompt('مرضى الكشف العادي', 'regular')}
              >
                 مرضى الكشف
              </button>
              <button 
                type="button" 
                className={`prompt-chip ${activeFilter === 'consultation' ? 'active' : ''}`}
                onClick={() => handleQuickPrompt('مرضى الاستشارات والمتابعة', 'consultation')}
              >
                 مرضى الاستشارات
              </button>
              <button 
                type="button" 
                className="prompt-chip"
                onClick={() => handleQuickPrompt('مرضى السكر')}
              >
                 مرضى السكر
              </button>
              <button 
                type="button" 
                className={`prompt-chip ${activeFilter === 'urgent' ? 'active' : ''}`}
                onClick={() => handleQuickPrompt('مرضى الطوارئ والحالات العاجلة', 'urgent')}
              >
                 حالات الطوارئ
              </button>
            </div>
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="console-input-form">
            <input 
              type="text" 
              placeholder="اطلب من مساعدك الذكي (مثال: اقفل يوم الأحد، أو افتح يوم 30، أو اعرض مرضى السكر)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="chat-input-field"
            />
            <button type="submit" className="btn-send-chat" disabled={!inputText.trim() || isAiGenerating} title="إرسال للوكيل">
              <Send size={16} />
              <span>إرسال</span>
            </button>
          </form>
        </div>

        {/* Right Column: Targeted Patients List & Campaign Customizer */}
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
                  const waUrl = patient.phone 
                    ? `https://wa.me/${patient.phone.replace(/\D/g, '').replace(/^0/, '20')}?text=${encodeURIComponent(patientMsg)}`
                    : null;

                  return (
                    <div key={patient.id} className={`target-patient-row ${isSelected ? 'selected' : ''}`}>
                      <div className="check-box-wrapper" onClick={() => togglePatientSelection(patient.id)}>
                        {isSelected ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} className="text-muted" />}
                      </div>

                      <div className="patient-main-details" onClick={() => togglePatientSelection(patient.id)}>
                        <div className="name-line">
                          <strong>{patient.name}</strong>
                          {patient.bloodType && <span className="tag-blood">{patient.bloodType}</span>}
                        </div>
                        <span className="phone-line"> {patient.phone || 'بدون هاتف'} • آخر زيارة: {patient.lastVisit || 'غير مسجل'}</span>
                        {patient.diagnosis && <p className="diag-line"> {patient.diagnosis}</p>}
                      </div>

                      {/* Direct WhatsApp 1-Click Action */}
                      <div className="patient-direct-actions">
                        {waUrl ? (
                          <a 
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-single-wa"
                            title="إرسال رسالة رعاية عبر واتساب مباشرة لهذا المريض"
                          >
                            <MessageCircle size={15} />
                            <span>واتساب </span>
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
              {CAMPAIGN_TEMPLATES.map(tmpl => (
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
              <span className="preview-label"> معاينة شكل الرسالة للمريض ({samplePatient.name}):</span>
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
                    : `إرسال رسائل SMS للحملة (${selectedPatientsList.length} مريض) `}
                </span>
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default DoctorAssistant;
