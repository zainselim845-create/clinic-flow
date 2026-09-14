import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, Send, Sparkles, Users, MessageSquare, CheckSquare, 
  Square, Stethoscope, RefreshCw, CheckCircle2, MessageCircle, Filter, Trash2, Settings
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { sendSMS } from '../services/smsService';
import { askDoctorAiAssistant, getAiConfig } from '../services/aiAssistantService';
import * as blockedSlotsService from '../services/blockedSlotsService';
import * as appointmentsService from '../services/appointmentsService';
import { processDoctorIntent } from '../utils/clinicalAssistantActions';
import { 
  CAMPAIGN_TEMPLATES, 
  formatDoctorName, 
  personalizeMessage, 
  filterTargetPatients 
} from '../utils/doctorAgentHelpers';
import MarketingCrmHub from './marketing/MarketingCrmHub';
import './DoctorAssistant.css';

const DoctorAssistant = () => {
  const navigate = useNavigate();
  const { state, dispatch, useSupabase } = useApp();
  const { clinic, user } = useAuth();
  const { tenant } = useTenant();

  const activeClinic = tenant || state.clinicInfo || clinic;
  const currentSlug = tenant?.slug || state.currentTenantSlug || state.clinicInfo?.slug || 'default';
  const chatStorageKey = `clinicflow_chat_${currentSlug}`;

  const rawDoctor = tenant?.doctorName || user?.name || state.clinicInfo?.doctorName || clinic?.doctorName || tenant?.name || 'طبيب العيادة';
  const doctorTitle = formatDoctorName(rawDoctor);
  const activeClinicId = tenant?.id || activeClinic?.id;

  const scopedPatients = useMemo(() => {
    return (state.patients || []).filter(p => !p.clinicId || p.clinicId === activeClinicId);
  }, [state.patients, activeClinicId]);

  const scopedAppointments = useMemo(() => {
    return (state.appointments || []).filter(a => !a.clinicId || a.clinicId === activeClinicId);
  }, [state.appointments, activeClinicId]);

  const scopedState = useMemo(() => ({
    ...state,
    clinicInfo: activeClinic,
    patients: scopedPatients,
    appointments: scopedAppointments
  }), [state, activeClinic, scopedPatients, scopedAppointments]);

  const [aiConfig, setAiConfig] = useState(() => getAiConfig());

  const getInitialWelcome = (slug, title, clinicTitle) => [
    {
      id: `msg-welcome-${slug}`,
      sender: 'agent',
      text: `مرحباً ${title}! \nأنا مساعدك السريري الذكي لـ (${clinicTitle}) المدعوم بنماذج OpenRouter. يمكنك التحدث معي مباشرة وطلب البحث عن المرضى الذين أجروا خدمة معينة (مثل: كشف عادي، استشارة، أو متابعات)، واقتراح رسائل الرعاية وإرسالها فوراً عبر رسائل SMS! `,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }
  ];

  // Load Conversation State from scoped localStorage
  const [messages, setMessages] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('clinicflow_doctor_chat_history'); // purge legacy leak
        const saved = localStorage.getItem(chatStorageKey);
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
    return getInitialWelcome(currentSlug, doctorTitle, tenant?.name || activeClinic?.name || 'العيادة');
  });

  const [viewMode, setViewMode] = useState('crm'); // 'crm' | 'chat'
  const [inputText, setInputText] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedPatientIds, setSelectedPatientIds] = useState(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState('post_care');
  const [customMessage, setCustomMessage] = useState(CAMPAIGN_TEMPLATES[0].template);
  const [isBroadcastingSms, setIsBroadcastingSms] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [broadcastResults, setBroadcastResults] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiGenerating]);

  // Re-sync messages when clinic/tenant changes
  useEffect(() => {
    try {
      localStorage.removeItem('clinicflow_doctor_chat_history');
      const saved = localStorage.getItem(chatStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch (_) {}
    setMessages(getInitialWelcome(currentSlug, doctorTitle, tenant?.name || activeClinic?.name || 'العيادة'));
  }, [currentSlug, doctorTitle, chatStorageKey, tenant?.name, activeClinic?.name]);

  // Automatically save chat history scoped per clinic
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        localStorage.setItem(chatStorageKey, JSON.stringify(messages));
      } catch (e) {
        console.error('Failed to save chat history to localStorage', e);
      }
    }
  }, [messages, chatStorageKey]);

  // Clear chat handler
  const handleClearChat = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح سجل المحادثة بالكامل والبدء من جديد؟')) {
      const freshWelcome = [
        {
          id: 'msg-welcome-' + Date.now(),
          sender: 'agent',
          text: `مرحباً ${doctorTitle}! \nتم مسح المحادثة السابقة لـ (${tenant?.name || activeClinic?.name || 'العيادة'}). أنا جاهز لمساعدتك في أي استفسار جديد حول رعاية المرضى أو استخراج السجلات! `,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ];
      setMessages(freshWelcome);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(chatStorageKey);
        localStorage.removeItem('clinicflow_doctor_chat_history');
      }
    }
  };

  // Target Patients List strictly scoped to this clinic
  const targetPatients = useMemo(() => {
    return filterTargetPatients(scopedPatients, scopedAppointments, activeFilter);
  }, [scopedPatients, scopedAppointments, activeFilter]);

  // Execute Clinical Action helper
  const executeDoctorAction = (actionResult) => {
    const activeClinicId = currentClinic?.id || null;
    if (actionResult.actionType === 'BLOCK_FULL_DAY') {
      dispatch({ type: 'BLOCK_FULL_DAY', payload: actionResult.payload });
      if (useSupabase) {
        blockedSlotsService.blockSlotInDb(actionResult.payload.date, 'FULL_DAY', actionResult.payload.reason || 'إجازة الطبيب', true, activeClinicId).catch(console.error);
      }
    } else if (actionResult.actionType === 'UNBLOCK_FULL_DAY') {
      dispatch({ type: 'UNBLOCK_FULL_DAY', payload: actionResult.payload });
      if (useSupabase) {
        blockedSlotsService.unblockFullDayInDb(actionResult.payload.date, activeClinicId).catch(console.error);
      }
    } else if (actionResult.actionType === 'BLOCK_SLOT') {
      dispatch({ type: 'TOGGLE_BLOCK_SLOT', payload: actionResult.payload });
      if (useSupabase) {
        blockedSlotsService.blockSlotInDb(actionResult.payload.date, actionResult.payload.time, actionResult.payload.reason || 'حظر مخصص', false, activeClinicId).catch(console.error);
      }
    } else if (actionResult.actionType === 'UNBLOCK_SLOT') {
      dispatch({ type: 'TOGGLE_BLOCK_SLOT', payload: actionResult.payload });
      if (useSupabase) {
        blockedSlotsService.unblockSlotInDb(actionResult.payload.date, actionResult.payload.time, activeClinicId).catch(console.error);
      }
    } else if (actionResult.actionType === 'BOOK_APPOINTMENT') {
      dispatch({ type: 'ADD_APPOINTMENT', payload: actionResult.payload });
      if (useSupabase) {
        appointmentsService.addAppointment({ ...actionResult.payload, clinicId: activeClinicId }).catch(console.error);
      }
    } else if (actionResult.actionType === 'NAVIGATE') {
      if (actionResult.payload?.path) {
        navigate(actionResult.payload.path);
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
    const actionResult = processDoctorIntent(promptText, scopedState);
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
    const matched = filterTargetPatients(scopedPatients, scopedAppointments, filterKey);
    setSelectedPatientIds(new Set(matched.map(p => p.id)));

    try {
      const aiRes = await askDoctorAiAssistant(newHistory, activeClinic, matched, scopedState);
      let agentReply = '';
      if (aiRes.isQuotaExceeded) {
        agentReply = `⚠️ **تنبيه استهلاك الرصيد**: ${aiRes.error}`;
      } else if (aiRes.success && aiRes.content) {
        agentReply = aiRes.content;
      } else {
        const count = matched.length;
        agentReply = count > 0 
          ? `${doctorTitle}، قمت بمسح السجلات السريرية لـ (${tenant?.name || activeClinic?.name || 'العيادة'}) ووجدت **${count} مريضاً** مطابقين لمعايير (${promptText}). يمكنك استعراضهم بالأسفل وتخصيص رسالة الرعاية! `
          : `${doctorTitle}، لم أجد حالياً مرضى مطابقين لمعايير (${promptText}) بسجل العيادة.`;
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
    const actionResult = processDoctorIntent(query, scopedState);
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
    const matched = filterTargetPatients(scopedPatients, scopedAppointments, detectedFilter);
    setSelectedPatientIds(new Set(matched.map(p => p.id)));

    try {
      const aiRes = await askDoctorAiAssistant(newHistory, activeClinic, matched, scopedState);
      let replyText = '';
      if (aiRes.isQuotaExceeded) {
        replyText = `⚠️ **تنبيه استهلاك الرصيد**: ${aiRes.error}`;
      } else if (aiRes.success && aiRes.content) {
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
    let quotaDepleted = false;
    let quotaErrorMsg = '';

    for (const patient of selectedPatientsList) {
      if (!patient.phone) {
        failedCount++;
        continue;
      }
      const personalized = personalizeMessage(customMessage, patient, currentClinic);
      const targetClinicId = patient.clinicId || currentClinic?.id || 'default';

      try {
        const res = await sendSMS(patient.phone, personalized, targetClinicId);
        if (res.success) {
          sentCount++;
        } else {
          failedCount++;
          if (res.isQuotaExceeded) {
            quotaDepleted = true;
            quotaErrorMsg = res.error;
            // Stop sending remaining batch since credit is depleted
            const remainingInBatch = selectedPatientsList.length - (sentCount + failedCount);
            failedCount += remainingInBatch;
            break;
          }
        }
      } catch {
        failedCount++;
      }
    }

    setIsBroadcastingSms(false);
    setBroadcastResults({ 
      sent: sentCount, 
      failed: failedCount, 
      total: selectedPatientsList.length,
      quotaExceeded: quotaDepleted,
      error: quotaErrorMsg 
    });

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
      
      {/* Mode Switcher */}
      <div className="segmented-control" role="tablist" aria-label="أوضاع المساعد ومحرك التسويق" style={{ marginBottom: '1rem', width: 'fit-content' }}>
        <button 
          type="button"
          role="tab"
          aria-selected={viewMode === 'crm'}
          className={`segmented-control-item ${viewMode === 'crm' ? 'active' : ''}`}
          onClick={() => setViewMode('crm')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', border: 'none' }}
        >
          <Sparkles size={16} />
          <span>مركز التسويق ونمو العيادة (CRM Engine)</span>
        </button>
        <button 
          type="button"
          role="tab"
          aria-selected={viewMode === 'chat'}
          className={`segmented-control-item ${viewMode === 'chat' ? 'active' : ''}`}
          onClick={() => setViewMode('chat')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', border: 'none' }}
        >
          <Bot size={16} />
          <span>المساعد السريري الذكي (AI Agent)</span>
        </button>
      </div>

      {viewMode === 'crm' ? (
        <MarketingCrmHub />
      ) : (
        <>
          {/* 1. Header Banner */}
          <div className="assistant-hero-card glass-card">
            <div className="hero-content-row">
              <div className="hero-badge">
                <div className="bot-icon">
                  <Bot size={24} />
                </div>
                <div>
                  <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>مساعد الطبيب السريري الذكي (AI Patient Care Agent)</h1>
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
              {aiConfig?.apiKey ? (
                <span className="live-status-dot ai-online" title={`متصل بـ OpenRouter (${aiConfig.model})`}>
                  AI سحابي نشط
                </span>
              ) : (
                <span 
                  className="live-status-dot ai-local" 
                  onClick={() => navigate('/settings?tab=aiAssistant')}
                  style={{ cursor: 'pointer' }}
                  title="يعمل بالمحرك السريري المحلي الذكي. اضغط لضبط مفتاح OpenRouter AI"
                >
                  محرك سريري محلي
                </span>
              )}
              <button 
                type="button" 
                onClick={() => navigate('/settings?tab=aiAssistant')}
                className="btn-ai-settings"
                title="إعدادات ونماذج الذكاء الاصطناعي"
              >
                <Settings size={13} />
                <span>إعدادات AI</span>
              </button>
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
            <div ref={messagesEndRef} />
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
                className="prompt-chip"
                onClick={() => handleQuickPrompt('مرضى الضغط')}
              >
                 مرضى الضغط
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
              aria-label="نص الرسالة أو الأمر السريري للمساعد الذكي"
            />
            <button type="submit" className="btn-send-chat" disabled={!inputText.trim() || isAiGenerating} title="إرسال للوكيل" aria-label="إرسال الرسالة">
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
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePatientSelection(patient.id); } }}
                        aria-label={`بيانات المريض ${patient.name}`}
                      >
                        <div className="name-line">
                          <strong>{patient.name}</strong>
                          {patient.bloodType && <span className="tag-blood">{patient.bloodType}</span>}
                        </div>
                        <span className="phone-line"> {patient.phone || 'بدون هاتف'} • آخر زيارة: {patient.lastVisit || 'غير مسجل'}</span>
                        {patient.diagnosis && <p className="diag-line"> {patient.diagnosis}</p>}
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
                            <span>SMS </span>
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
      </>
      )}

    </div>
  );
};


export default DoctorAssistant;
