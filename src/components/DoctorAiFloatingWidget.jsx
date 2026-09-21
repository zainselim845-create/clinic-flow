import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Bot, Send, Sparkles, X, Maximize2, RotateCcw, 
  User, Calendar, Clock, AlertCircle, CheckCircle2, MessageSquare, 
  ChevronDown, ArrowUpRight, Phone, ShieldCheck, DollarSign
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { processDoctorIntent } from '../utils/clinicalAssistantActions';
import { askDoctorAiAssistant } from '../services/aiAssistantService';
import * as blockedSlotsService from '../services/blockedSlotsService';
import * as appointmentsService from '../services/appointmentsService';
import { safeGetJSON, safeSetJSON, safeRemoveItem } from '../utils/safeStorage';
import './DoctorAiFloatingWidget.css';

export default function DoctorAiFloatingWidget({ isOpen: controlledOpen, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch, useSupabase } = useApp();
  const { user, clinic } = useAuth();
  const { tenant } = useTenant();
  
  const activeClinic = tenant || state.clinicInfo || clinic;
  const currentClinic = activeClinic;
  const currentSlug = tenant?.slug || state.currentTenantSlug || state.clinicInfo?.slug || user?.clinicSlug || 'default';
  const chatStorageKey = `clinicflow_chat_${currentSlug}`;

  const rawDoctor = tenant?.doctorName || user?.name || activeClinic?.doctorName || tenant?.name || 'طبيب العيادة';
  const doctorName = rawDoctor.startsWith('د.') || rawDoctor.startsWith('د/') ? rawDoctor : `د. ${rawDoctor}`;

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (val) => {
    if (onToggle) onToggle(val);
    else setInternalOpen(val);
  };

  const [inputText, setInputText] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const getInitialWelcome = (slug, doc, clinicTitle) => [
    {
      id: `msg-welcome-${slug}`,
      sender: 'agent',
      text: `أهلاً بك ${doc}.\nأنا مساعدك الطبي الذكي لـ (${clinicTitle}). اسألني عن أي مريض، أو اطلب حجز موعد، أو استعلم عن كشوفات اليوم وصالة الانتظار، أو مديونيات العيادة وسأنفذ طلبك فوراً.`,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }
  ];

  const [messages, setMessages] = useState(() => {
    safeRemoveItem('clinicflow_doctor_chat_history'); // purge legacy leak
    const saved = safeGetJSON(chatStorageKey, null);
    if (Array.isArray(saved) && saved.length > 0) return saved;
    return getInitialWelcome(currentSlug, doctorName, tenant?.name || activeClinic?.name || 'العيادة');
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Re-sync messages when tenant/clinic changes
  useEffect(() => {
    safeRemoveItem('clinicflow_doctor_chat_history');
    const saved = safeGetJSON(chatStorageKey, null);
    if (Array.isArray(saved) && saved.length > 0) {
      setMessages(saved);
      return;
    }
    setMessages(getInitialWelcome(currentSlug, doctorName, tenant?.name || activeClinic?.name || 'العيادة'));
  }, [currentSlug, doctorName, chatStorageKey, tenant?.name, activeClinic?.name]);

  // Sync to scoped localStorage
  useEffect(() => {
    if (messages.length > 0) {
      safeSetJSON(chatStorageKey, messages);
    }
  }, [messages, chatStorageKey]);

  // Scroll on message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAiGenerating, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Global Keyboard Shortcut: Alt + A
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.altKey && (e.key === 'a' || e.key === 'A' || e.key === 'ش')) || (e.ctrlKey && e.code === 'Space')) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Execute clinical actions dispatched by agent
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
        setIsOpen(false);
      }
    }
  };

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputText).trim();
    if (!query || isAiGenerating) return;

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

    // Strict Tenant Scoping for AI and NLP Engine
    const activeClinicId = tenant?.id || activeClinic?.id;
    const scopedPatients = (state.patients || []).filter(p => !p.clinicId || p.clinicId === activeClinicId);
    const scopedAppointments = (state.appointments || []).filter(a => !a.clinicId || a.clinicId === activeClinicId);
    const scopedState = {
      ...state,
      clinicInfo: activeClinic,
      patients: scopedPatients,
      appointments: scopedAppointments
    };

    // 1. Direct Rule-based Clinical NLP Processing
    const actionResult = processDoctorIntent(query, scopedState);
    if (actionResult.isAction) {
      executeDoctorAction(actionResult);
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

    // 2. OpenRouter AI Fallback with live clinic context
    try {
      const aiRes = await askDoctorAiAssistant(newHistory, activeClinic, scopedPatients, scopedState);
      let replyText = '';
      if (aiRes.isQuotaExceeded) {
        replyText = `**تنبيه استهلاك الرصيد**: ${aiRes.error}`;
      } else if (aiRes.success && aiRes.content) {
        replyText = aiRes.content;
      } else {
        replyText = `أهلاً دكتور، تلقيت طلبك بخصوص: "${query}". يمكنك استعراض الملفات أو المواعيد عبر الأوامر السريعة.`;
      }

      const agentMsg = {
        id: 'agent-' + Date.now(),
        sender: 'agent',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch (_) {
      setMessages(prev => [
        ...prev,
        {
          id: 'agent-' + Date.now(),
          sender: 'agent',
          text: 'تم استلام طلبك. أنا جاهز لمساعدتك في أي استعلام سريري أو إداري بالعيادة.',
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('هل تريد مسح سجل المحادثة مع المساعد الذكي؟')) {
      const fresh = [
        {
          id: 'msg-welcome-' + Date.now(),
          sender: 'agent',
          text: `مرحباً ${doctorName}! تم بدء جلسة محادثة جديدة لـ (${tenant?.name || activeClinic?.name || 'العيادة'}). أنا رهن إشارتك لكافة ملفات ومهام العيادة.`,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ];
      setMessages(fresh);
      safeRemoveItem(chatStorageKey);
      safeRemoveItem('clinicflow_doctor_chat_history');
    }
  };

  // Hide the floating widget if user is already on full /doctor-agent screen
  if (location.pathname === '/doctor-agent') {
    return null;
  }

  return (
    <div className="doctor-ai-copilot-container" dir="rtl">
      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          className="ai-copilot-fab"
          onClick={() => setIsOpen(true)}
          title="المساعد الطبي الذكي (Alt + A)"
          aria-label="فتح المساعد الطبي الذكي"
        >
          <div className="fab-pulse-ring" />
          <div className="fab-icon-wrap">
            <Sparkles size={20} className="fab-sparkle-icon" />
            <Bot size={22} className="fab-bot-icon" />
          </div>
          <span className="fab-label">المساعد الذكي</span>
          <span className="fab-shortcut-badge">Alt+A</span>
        </button>
      )}

      {/* Slide-over Copilot Panel */}
      {isOpen && (
        <div className="ai-copilot-drawer">
          {/* Header */}
          <div className="copilot-header">
            <div className="copilot-header-info">
              <div className="copilot-avatar">
                <Bot size={20} />
                <span className="online-indicator-dot" />
              </div>
              <div>
                <div className="copilot-title-row">
                  <h3>مساعد العيادة الذكي</h3>
                  <span className="ai-model-tag">AI Copilot</span>
                </div>
                <p className="copilot-status-text">متصل لحظياً بكافة بيانات العيادة</p>
              </div>
            </div>

            <div className="copilot-header-actions">
              <button
                type="button"
                className="copilot-action-btn"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/doctor-agent');
                }}
                title="فتح في صفحة كاملة"
              >
                <Maximize2 size={16} />
              </button>
              <button
                type="button"
                className="copilot-action-btn"
                onClick={handleClearHistory}
                title="بدء محادثة جديدة"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                className="copilot-action-btn close-btn"
                onClick={() => setIsOpen(false)}
                title="إغلاق (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Essential Action Pills */}
          <div className="copilot-quick-pills">
            <button 
              type="button" 
              className="quick-pill" 
              onClick={() => handleSendMessage('مين عنده كشف النهاردة ومين في الانتظار؟')}
            >
              كشوفات اليوم وصالة الانتظار
            </button>
            <button 
              type="button" 
              className="quick-pill" 
              onClick={() => handleSendMessage('عايز احجز موعد جديد لمريض')}
            >
              حجز موعد
            </button>
            <button 
              type="button" 
              className="quick-pill" 
              onClick={() => handleSendMessage('مين عليه فلوس في العيادة؟')}
            >
              المديونيات المعلقة
            </button>
            <button 
              type="button" 
              className="quick-pill" 
              onClick={() => handleSendMessage('ايه الايام والمواعيد المقفولة؟')}
            >
              جدول الإجازات
            </button>
          </div>

          {/* Messages Area */}
          <div className="copilot-messages-area">
            {messages.map((m) => (
              <div 
                key={m.id} 
                className={`copilot-msg-row ${m.sender === 'doctor' ? 'from-doctor' : 'from-agent'}`}
              >
                {m.sender === 'agent' && (
                  <div className="msg-avatar">
                    <Bot size={16} />
                  </div>
                )}
                <div className="msg-content-bubble">
                  <div className="msg-text-body">
                    {m.text.split('\n').map((paragraph, pIdx) => (
                      <p key={pIdx}>{paragraph}</p>
                    ))}
                  </div>

                  {/* Interactive Action Card: Patient Found */}
                  {m.action?.actionType === 'SHOW_PATIENT' && m.action.payload && (
                    <div className="action-card patient-card">
                      <div className="action-card-header">
                        <User size={16} />
                        <strong>{m.action.payload.name}</strong>
                      </div>
                      <div className="action-card-body">
                        {m.action.payload.phone && <span>{m.action.payload.phone}</span>}
                        {m.action.payload.balance > 0 && <span className="debt-tag">مديونية: {m.action.payload.balance} ج.م</span>}
                      </div>
                      <div className="action-card-buttons">
                        <button
                          type="button"
                          className="btn-card-primary"
                          onClick={() => {
                            setIsOpen(false);
                            navigate(`/patients?search=${encodeURIComponent(m.action.payload.name)}`);
                          }}
                        >
                          <ArrowUpRight size={14} />
                          <span>فتح الملف الطبي</span>
                        </button>
                        {m.action.payload.phone && (
                          <a
                            href={`https://wa.me/20${m.action.payload.phone.replace(/\D/g, '').replace(/^0/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-card-secondary"
                          >
                            <MessageSquare size={14} />
                            <span>محادثة واتساب</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Interactive Action Card: Appointment Booked */}
                  {m.action?.actionType === 'BOOK_APPOINTMENT' && m.action.payload && (
                    <div className="action-card appointment-card">
                      <div className="action-card-header">
                        <Calendar size={16} />
                        <strong>تم تسجيل الموعد في السيستم</strong>
                      </div>
                      <div className="action-card-body">
                        <span>المريض: {m.action.payload.patientName}</span>
                        <span>الموعد: {m.action.payload.date} الساعة {m.action.payload.time}</span>
                        <span>نوع الكشف: {m.action.payload.type}</span>
                      </div>
                      <div className="action-card-buttons">
                        <button
                          type="button"
                          className="btn-card-primary"
                          onClick={() => {
                            setIsOpen(false);
                            navigate('/appointments');
                          }}
                        >
                          <Calendar size={14} />
                          <span>عرض في جدول المواعيد</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Interactive Action Card: Navigation */}
                  {m.action?.actionType === 'NAVIGATE' && m.action.payload && (
                    <div className="action-card nav-card">
                      <button
                        type="button"
                        className="btn-card-primary"
                        onClick={() => {
                          setIsOpen(false);
                          navigate(m.action.payload.path);
                        }}
                      >
                        <ArrowUpRight size={14} />
                        <span>فتح {m.action.payload.label} فوراً</span>
                      </button>
                    </div>
                  )}

                  <span className="msg-timestamp">{m.timestamp}</span>
                </div>
              </div>
            ))}

            {isAiGenerating && (
              <div className="copilot-msg-row from-agent">
                <div className="msg-avatar">
                  <Bot size={16} />
                </div>
                <div className="msg-content-bubble typing-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form 
            className="copilot-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اطلب أي شيء (مثال: احجز لمحمد بكرة 6 مساءً، أو ملف سارة)..."
              disabled={isAiGenerating}
              className="copilot-input"
            />
            <button 
              type="submit" 
              className="copilot-send-btn"
              disabled={!inputText.trim() || isAiGenerating}
              title="إرسال"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
