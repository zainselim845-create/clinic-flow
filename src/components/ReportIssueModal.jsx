import React, { useState } from 'react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { reportUserBug } from '../services/systemErrorService';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, X, Send, CheckCircle2, Bug, Zap, Layout, HelpCircle } from 'lucide-react';

const ReportIssueModal = ({ isOpen, onClose }) => {
  const { tenant } = useTenant();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('bug');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg('يرجى ملء عنوان المشكلة ووصفها.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      reportUserBug({
        title,
        description,
        category,
        clinicId: tenant?.id || 'unknown',
        clinicName: tenant?.name || 'غير محدد',
        doctorEmail: user?.email || 'unknown',
        path: typeof window !== 'undefined' ? window.location.pathname : ''
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setTitle('');
        setDescription('');
        onClose();
      }, 2000);
    } catch (err) {
      setErrorMsg(err.message || 'حدث خطأ أثناء إرسال البلاغ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => !details.open && onClose()} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)'
          }}
        />
        <Dialog.Positioner
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            direction: 'rtl'
          }}
        >
          <Dialog.Content
            style={{
              maxWidth: '520px',
              width: '100%',
              background: 'var(--bg-secondary, #1e293b)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AlertCircle size={18} />
                </div>
                <div>
                  <Dialog.Title asChild>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                      مركز بلاغات وأعطال النظام
                    </h3>
                  </Dialog.Title>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    أرسل ملاحظتك أو مشكلتك مباشرة لمهندسي المنصة
                  </span>
                </div>
              </div>
              <Dialog.CloseTrigger asChild>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="إغلاق النافذة"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '0.25rem'
                  }}
                >
                  <X size={20} />
                </button>
              </Dialog.CloseTrigger>
            </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <CheckCircle2 size={48} style={{ color: '#10b981', margin: '0 auto 1rem' }} />
              <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                تم استلام بلاغك بنجاح!
              </h4>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                يقوم مهندسونا بمتابعة المشكلة وحلها فورياً. شكراً لتعاونك في تحسين المنظومة.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {errorMsg && (
                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#f87171',
                  fontSize: '0.88rem',
                  marginBottom: '1rem'
                }}>
                  {errorMsg}
                </div>
              )}

              {/* Category Selector */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.5rem' }}>
                  تصنيف البلاغ:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {[
                    { id: 'bug', label: 'عطل برمجي / خطأ', icon: Bug },
                    { id: 'performance', label: 'بطء في الاستجابة', icon: Zap },
                    { id: 'ui', label: 'مشكلة في الواجهة والتصميم', icon: Layout },
                    { id: 'feature_request', label: 'اقتراح ميزة جديدة', icon: HelpCircle }
                  ].map(cat => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: isSelected ? 'rgba(56, 189, 248, 0.12)' : '#0f172a',
                          color: isSelected ? '#38bdf8' : '#94a3b8',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'right'
                        }}
                      >
                        <Icon size={16} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                  عنوان مختصر للمشكلة:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثلاً: زر الحجز لا يستجيب في شاشة الموبايل"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                  تفاصيل المشكلة والخطوات:
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ما الذي حدث بالضبط؟ وأي شاشة كنت تستخدمها؟"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.65rem 1.25rem',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.5rem',
                    background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Send size={15} />
                  <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال البلاغ الآن'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default ReportIssueModal;
