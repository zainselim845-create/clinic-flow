import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bot, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { askDoctorAiAssistant } from '../services/aiAssistantService';
import { sendSMS } from '../services/smsService';
import { processDoctorIntent } from '../utils/clinicalAssistantActions';
import { 
  CAMPAIGN_TEMPLATES, 
  formatDoctorName, 
  personalizeMessage, 
  filterTargetPatients 
} from '../utils/doctorAgentHelpers';
import MarketingCrmHub from './marketing/MarketingCrmHub';
import { safeGetJSON, safeSetJSON, safeRemoveItem } from '../utils/safeStorage';
import { AssistantHeroHeader, AssistantChatConsole, AssistantActionHub } from './assistant';
import { executeDoctorAction } from './assistant/useClinicalActionExecutor';
import './DoctorAssistant.css';

/**
 * DoctorAssistant - AI Patient Care Agent & Clinical Operations Orchestrator
 */
const DoctorAssistant = ({ initialMode }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, dispatch, useSupabase } = useApp();
  const { clinic, user } = useAuth();
  const { tenant, allTenants, switchTenant } = useTenant();

  const activeClinic = tenant || state.clinicInfo || clinic;
  const currentClinic = activeClinic;
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
    appointments: scopedAppointments,
    allClinics: allTenants || []
  }), [state, activeClinic, scopedPatients, scopedAppointments, allTenants]);

  const getInitialWelcome = (slug, title, clinicTitle) => [
    {
      id: `msg-welcome-${slug}`,
      sender: 'agent',
      text: `مرحباً ${title}! \nأنا مساعدك السريري الذكي لـ (${clinicTitle}) المدعوم بنماذج OpenRouter. يمكنك التحدث معي مباشرة وطلب البحث عن المرضى الذين أجروا خدمة معينة (مثل: كشف عادي، استشارة، أو متابعات)، واقتراح رسائل الرعاية وإرسالها فوراً عبر رسائل SMS! `,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }
  ];

  // Load Conversation State from scoped safeStorage
  const [messages, setMessages] = useState(() => {
    safeRemoveItem('clinicflow_doctor_chat_history');
    const saved = safeGetJSON(chatStorageKey, null);
    if (Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    return getInitialWelcome(currentSlug, doctorTitle, tenant?.name || activeClinic?.name || 'العيادة');
  });

  const [viewMode, setViewMode] = useState(() => initialMode || searchParams.get('mode') || 'crm');
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
    safeRemoveItem('clinicflow_doctor_chat_history');
    const saved = safeGetJSON(chatStorageKey, null);
    if (Array.isArray(saved) && saved.length > 0) {
      setMessages(saved);
      return;
    }
    setMessages(getInitialWelcome(currentSlug, doctorTitle, tenant?.name || activeClinic?.name || 'العيادة'));
  }, [currentSlug, doctorTitle, chatStorageKey, tenant?.name, activeClinic?.name]);

  // Automatically save chat history scoped per clinic
  useEffect(() => {
    if (messages.length > 0) {
      safeSetJSON(chatStorageKey, messages);
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
      safeRemoveItem(chatStorageKey);
      safeRemoveItem('clinicflow_doctor_chat_history');
    }
  };

  // Target Patients List strictly scoped to this clinic
  const targetPatients = useMemo(() => {
    return filterTargetPatients(scopedPatients, scopedAppointments, activeFilter);
  }, [scopedPatients, scopedAppointments, activeFilter]);

  const dispatchAction = (actionResult) => {
    executeDoctorAction(actionResult, {
      currentClinic,
      state,
      dispatch,
      useSupabase,
      switchTenant,
      navigate
    });
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

    const actionResult = processDoctorIntent(promptText, scopedState);
    if (actionResult.isAction) {
      dispatchAction(actionResult);
      const agentMsg = {
        id: 'agent-' + Date.now(),
        sender: 'agent',
        text: actionResult.replyText,
        action: actionResult,
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
      let detectedAction = null;

      if (aiRes.isQuotaExceeded) {
        agentReply = `**تنبيه استهلاك الرصيد**: ${aiRes.error}`;
      } else if (aiRes.success && aiRes.content) {
        const contentStr = aiRes.content;
        const actionMatch = contentStr.match(/```(?:action|json)?\s*(\{[\s\S]*?"actionType"[\s\S]*?\})\s*```/);
        if (actionMatch) {
          try {
            detectedAction = JSON.parse(actionMatch[1]);
            dispatchAction(detectedAction);
            agentReply = contentStr.replace(/```(?:action|json)?\s*\{[\s\S]*?"actionType"[\s\S]*?\}\s*```/, '').trim();
            if (!agentReply) {
              agentReply = 'تم تنفيذ طلبك بنجاح في سيستم العيادة.';
            }
          } catch (parseErr) {
            console.warn('[DoctorAssistant] Action JSON parsing failed:', parseErr);
            agentReply = contentStr;
          }
        } else {
          agentReply = contentStr;
        }
      } else {
        const count = matched.length;
        agentReply = count > 0 
          ? `${doctorTitle}، قمت بمسح السجلات السريرية لـ (${tenant?.name || activeClinic?.name || 'العيادة'}) ووجدت **${count} مريضاً** مطابقين لمعايير (${promptText}). يمكنك استعراضهم بالأسفل وتخصيص رسالة الرعاية!` 
          : `${doctorTitle}، لم أجد حالياً مرضى مطابقين لمعايير (${promptText}) بسجل العيادة.`;
      }

      const agentMsg = {
        id: 'agent-' + Date.now(),
        sender: 'agent',
        text: agentReply,
        action: detectedAction,
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

    const actionResult = processDoctorIntent(query, scopedState);
    if (actionResult.isAction) {
      dispatchAction(actionResult);
      const agentMsg = {
        id: 'agent-' + Date.now(),
        sender: 'agent',
        text: actionResult.replyText,
        action: actionResult,
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
      let detectedAction = null;
      if (aiRes.isQuotaExceeded) {
        replyText = `**تنبيه استهلاك الرصيد**: ${aiRes.error}`;
      } else if (aiRes.success && aiRes.content) {
        const contentStr = aiRes.content;
        const actionMatch = contentStr.match(/```(?:action|json)?\s*(\{[\s\S]*?"actionType"[\s\S]*?\})\s*```/);
        if (actionMatch) {
          try {
            detectedAction = JSON.parse(actionMatch[1]);
            dispatchAction(detectedAction);
            replyText = contentStr.replace(/```(?:action|json)?\s*\{[\s\S]*?"actionType"[\s\S]*?\}\s*```/, '').trim();
            if (!replyText) {
              replyText = 'تم تنفيذ طلبك بنجاح في سيستم العيادة.';
            }
          } catch (parseErr) {
            console.warn('[DoctorAssistant] Action JSON parsing failed:', parseErr);
            replyText = contentStr;
          }
        } else {
          replyText = contentStr;
        }
      } else {
        const count = matched.length;
        replyText = count > 0 
          ? `${doctorTitle}، قمت بتحليل السجلات ووجدت **${count} مريضاً** مطابقين لطلبك (${query}). يمكنك استعراضهم بالأسفل واختيار القالب المناسب لإرسال الرسائل!` 
          : `${doctorTitle}، لم أجد حالياً مرضى مطابقين لهذا الفلتر في سجل العيادة.`;
      }

      const agentMsg = {
        id: 'agent-' + Date.now(),
        sender: 'agent',
        text: replyText,
        action: detectedAction,
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

  const togglePatientSelection = (id) => {
    setSelectedPatientIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedPatientIds.size === targetPatients.length) {
      setSelectedPatientIds(new Set());
    } else {
      setSelectedPatientIds(new Set(targetPatients.map(p => p.id)));
    }
  };

  const handleSelectTemplate = (templateObj) => {
    setSelectedTemplateId(templateObj.id);
    setCustomMessage(templateObj.template);
  };

  const selectedPatientsList = useMemo(() => {
    return targetPatients.filter(p => selectedPatientIds.has(p.id));
  }, [targetPatients, selectedPatientIds]);

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
        title: 'إرسال حملة متابعة ورعاية مرضى',
        message: `تم إرسال حملة رسائل إلى ${sentCount} مريض بنجاح (فشل: ${failedCount}).`,
        timestamp: new Date().toISOString(),
        read: false
      }
    });
  };

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
          <Activity size={16} />
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
          <AssistantHeroHeader patientsCount={scopedPatients?.length || 0} />

          {/* 2. Main Two-Column Layout */}
          <div className="assistant-split-layout">
            <AssistantChatConsole 
              messages={messages}
              messagesEndRef={messagesEndRef}
              isAiGenerating={isAiGenerating}
              doctorTitle={doctorTitle}
              handleClearChat={handleClearChat}
              handleQuickPrompt={handleQuickPrompt}
              inputText={inputText}
              setInputText={setInputText}
              handleSendMessage={handleSendMessage}
              activeFilter={activeFilter}
            />

            <AssistantActionHub 
              targetPatients={targetPatients}
              selectedPatientIds={selectedPatientIds}
              selectedPatientsList={selectedPatientsList}
              handleToggleSelectAll={handleToggleSelectAll}
              togglePatientSelection={togglePatientSelection}
              customMessage={customMessage}
              setCustomMessage={setCustomMessage}
              selectedTemplateId={selectedTemplateId}
              handleSelectTemplate={handleSelectTemplate}
              samplePatient={samplePatient}
              previewText={previewText}
              currentClinic={currentClinic}
              isBroadcastingSms={isBroadcastingSms}
              handleBulkSmsBroadcast={handleBulkSmsBroadcast}
              broadcastResults={broadcastResults}
              campaignTemplates={CAMPAIGN_TEMPLATES}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default DoctorAssistant;
