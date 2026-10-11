import React from 'react';
import { 
  Bot, Send, Sparkles, Stethoscope, CheckCircle2, Trash2 
} from 'lucide-react';

/**
 * AssistantChatConsole - Interactive AI conversation interface for the doctor
 */
export default function AssistantChatConsole({
  messages,
  messagesEndRef,
  isAiGenerating,
  doctorTitle,
  handleClearChat,
  handleQuickPrompt,
  inputText,
  setInputText,
  handleSendMessage,
  activeFilter
}) {
  return (
    <div className="chat-console-card glass-card">
      <div className="console-header">
        <div className="console-title">
          <Sparkles size={18} className="text-primary" />
          <span>محادثة الوكيل السريري الذكي</span>
        </div>

        <div className="console-header-actions">
          <span className="live-status-dot ai-online" title="محرك الذكاء الاصطناعي السريري نشط ومُهيأ تلقائياً">
            الذكاء الاصطناعي نشط
          </span>
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
                {msg.action && (
                  <div 
                    className="action-pill-executed" 
                    style={{ 
                      marginTop: '0.5rem', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.35rem', 
                      padding: '0.2rem 0.5rem', 
                      background: 'rgba(16,185,129,0.1)', 
                      color: '#059669', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600 
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>تم تنفيذ الإجراء في النظام تلقائياً</span>
                  </div>
                )}
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
        <div className="prompts-label">⚡ أوامر واستفسارات سريعة:</div>
        <div className="prompts-chips-grid">
          <button 
            type="button" 
            className="prompt-chip"
            onClick={() => handleQuickPrompt('اقفل يوم الأحد القادم')}
            style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)', color: '#DC2626' }}
          >
            🚫 إغلاق الأحد القادم
          </button>
          <button 
            type="button" 
            className="prompt-chip"
            onClick={() => handleQuickPrompt('ايه الأيام والمواعيد المقفولة في العيادة؟')}
            style={{ borderColor: 'rgba(24, 96, 236, 0.3)', background: 'rgba(24, 96, 236, 0.08)', color: 'var(--primary)' }}
          >
            📅 الأيام المقفولة
          </button>
          <button 
            type="button" 
            className="prompt-chip"
            onClick={() => handleQuickPrompt('ملخص أداء وإحصائيات اليوم')}
            style={{ borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.08)', color: '#059669' }}
          >
            📊 ملخص اليوم
          </button>
          <button 
            type="button" 
            className={`prompt-chip ${activeFilter === 'regular' ? 'active' : ''}`}
            onClick={() => handleQuickPrompt('مرضى الكشف العادي', 'regular')}
          >
            🩺 مرضى الكشف
          </button>
          <button 
            type="button" 
            className={`prompt-chip ${activeFilter === 'consultation' ? 'active' : ''}`}
            onClick={() => handleQuickPrompt('مرضى الاستشارات والمتابعة', 'consultation')}
          >
            📋 مرضى الاستشارات
          </button>
          <button 
            type="button" 
            className="prompt-chip"
            onClick={() => handleQuickPrompt('مرضى السكر')}
          >
            🩸 مرضى السكر
          </button>
          <button 
            type="button" 
            className="prompt-chip"
            onClick={() => handleQuickPrompt('مرضى الضغط')}
          >
            💓 مرضى الضغط
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
        <button 
          type="submit" 
          className="btn-send-chat" 
          disabled={!inputText.trim() || isAiGenerating} 
          title="إرسال للوكيل" 
          aria-label="إرسال الرسالة"
        >
          <Send size={16} />
          <span>إرسال</span>
        </button>
      </form>
    </div>
  );
}
