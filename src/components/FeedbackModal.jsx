import React, { useState } from 'react';
import { Star, X, CheckCircle2 } from 'lucide-react';
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

  if (!isOpen) return null;

  return (
    <div className="feedback-modal-overlay">
      <div className="feedback-modal-card">
        
        <div className="feedback-modal-header">
          <div className="hdr-flex">
            <Star size={20} className="text-nebras-orange" fill="#F7931E" />
            <div>
              <h4>تقييم زيارة المريض (Patient Experience)</h4>
              <p>قياس جودة الخدمة السريرية ورضا المريض بعد انتهاء الجلسة</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-close-sm">
            <X size={16} />
          </button>
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
              <button type="button" onClick={onClose} className="btn-cancel">
                إلغاء
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-save">
                <span>{isSubmitting ? 'جاري الإرسال...' : 'حفظ التقييم'}</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};

export default FeedbackModal;
