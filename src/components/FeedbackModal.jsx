import React, { useState } from 'react';
import { Star, X, CheckCircle2 } from 'lucide-react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { addPatientFeedback } from '../services/feedbackService';

import './FeedbackModal.css';

const FeedbackModal = ({ isOpen, onClose, appointment, patient }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await addPatientFeedback({
        patientId: patient?.id,
        appointmentId: appointment?.id,
        rating,
        comment
      });
      setIsDone(true);
      setTimeout(() => {
        setIsDone(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => { if (!details.open && onClose) onClose(); }}>
      <Portal>
        <Dialog.Backdrop className="feedback-modal-overlay" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="feedback-modal-card">
            
            <div className="feedback-modal-header">
              <div className="hdr-flex">
                <Star size={20} className="text-nebras-orange" fill="#F7931E" />
                <div>
                  <Dialog.Title asChild>
                    <h4>تقييم زيارة المريض (Patient Experience)</h4>
                  </Dialog.Title>
                  <Dialog.Description asChild>
                    <p>قياس جودة الخدمة السريرية ورضا المريض بعد انتهاء الجلسة</p>
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.CloseTrigger asChild>
                <button onClick={onClose} className="btn-close-sm" aria-label="إغلاق النافذة" type="button">
                  <X size={16} />
                </button>
              </Dialog.CloseTrigger>
            </div>

            {isDone ? (
              <div className="feedback-done-view">
                <CheckCircle2 size={48} className="text-success" />
                <h4>شكراً جزيلاً!</h4>
                <p>تم تسجيل تقييم المريض بنجاح في مؤشرات جودة العيادة.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="feedback-modal-body">
                
                <div className="star-rating-selector">
                  <label>تقييم الجلسة:</label>
                  <div className="stars-row">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        className={`star-btn ${rating >= star ? 'active' : ''}`}
                        onClick={() => setRating(star)}
                      >
                        <Star size={32} fill={rating >= star ? '#F7931E' : 'none'} color="#F7931E" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field-block">
                  <label>ملاحظات وتعليقات المريض:</label>
                  <textarea
                    rows="3"
                    className="input-field"
                    placeholder="ملاحظات المريض حول وقت الانتظار، معاملة الفريق، أو التخدير..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>

                <div className="feedback-modal-footer">
                  <Dialog.CloseTrigger asChild>
                    <button type="button" onClick={onClose} className="btn-cancel">
                      إلغاء
                    </button>
                  </Dialog.CloseTrigger>
                  <button type="submit" disabled={isSubmitting} className="btn-save">
                    <span>{isSubmitting ? 'جاري الإرسال...' : 'حفظ التقييم'}</span>
                  </button>
                </div>

              </form>
            )}

          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default FeedbackModal;
