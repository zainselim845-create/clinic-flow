import React from 'react';
import { X, Lock, Unlock } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Portal } from '@ark-ui/react/portal';

/**
 * SlotBlockerModal
 * Interactive controls for doctor and reception staff to close an entire clinic day
 * or selectively lock individual time slots from public booking.
 */
const SlotBlockerModal = ({
  isOpen = false,
  onClose = () => {},
  blockerDate = '',
  setBlockerDate = () => {},
  isBlockerDateFullDayBlocked = false,
  onBlockFullDay = () => {},
  onUnblockFullDay = () => {},
  availableSlots = [],
  getSlotInfoForBlocker = () => ({ isBooked: false, isBlocked: false }),
  onToggleBlockSlot = () => {},
  onUnblockFullDaySlot = () => {}
}) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="modal-overlay" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Dialog.Content className="modal-content glass-card blocker-modal" style={{ maxWidth: '680px', width: '100%' }}>
            <div className="modal-header">
              <Dialog.Title asChild>
                <h3>إغلاق / حظر مواعيد العيادة (للسكرتارية)</h3>
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <button className="close-btn" type="button" aria-label="إغلاق" onClick={onClose}>
                  <X size={24} />
                </button>
              </Dialog.CloseTrigger>
            </div>
            
            <div className="blocker-body">
              <p className="blocker-desc">
                يمكن للطبيب والسكرتارية إغلاق يوم كامل كإجازة/عطلة طارئة، أو حظر أوقات معينة لمنع حجزها إلكترونياً.
              </p>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>
                  اختر اليوم للتعديل والإغلاق:
                </label>
                <input 
                  type="date" 
                  className="input-field"
                  value={blockerDate}
                  onChange={(e) => setBlockerDate(e.target.value)}
                />
              </div>

              {/* Full Day Off Control Banner */}
              <div style={{
                background: isBlockerDateFullDayBlocked ? 'rgba(239, 68, 68, 0.08)' : 'rgba(37, 99, 235, 0.06)',
                border: `1px solid ${isBlockerDateFullDayBlocked ? 'rgba(239, 68, 68, 0.25)' : 'rgba(37, 99, 235, 0.2)'}`,
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div>
                  <strong style={{ display: 'block', color: isBlockerDateFullDayBlocked ? '#DC2626' : 'var(--text-primary)', fontSize: '0.95rem' }}>
                    {isBlockerDateFullDayBlocked ? 'هذا اليوم مغلق بالكامل (إجازة للعيادة)' : 'العيادة مفتوحة وتستقبل الحجز في هذا اليوم'}
                  </strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {isBlockerDateFullDayBlocked 
                      ? 'لا يمكن لأي مريض حجز أي موعد في هذا اليوم من صفحة الحجز العامة.' 
                      : 'يمكنك إغلاق اليوم كاملاً بضغطة زر واحدة إذا كان الطبيب في إجازة أو مؤتمر.'}
                  </span>
                </div>

                {isBlockerDateFullDayBlocked ? (
                  <button 
                    type="button"
                    className="btn-unlock" 
                    onClick={() => onUnblockFullDay(blockerDate)}
                    style={{ background: '#10B981', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Unlock size={16} />
                    <span>فتح اليوم واستقبال الحجوزات</span>
                  </button>
                ) : (
                  <button 
                    type="button"
                    className="btn-lock" 
                    onClick={() => onBlockFullDay(blockerDate, 'إجازة الطبيب')}
                    style={{ background: '#DC2626', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Lock size={16} />
                    <span>إغلاق اليوم بالكامل (إجازة)</span>
                  </button>
                )}
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                أو تحكم في كل موعد على حدة ({blockerDate}):
              </h4>

              <div className="blocker-slots-list">
                {availableSlots.map(slot => {
                  const info = getSlotInfoForBlocker(slot);
                  const isBlockedByFullDay = isBlockerDateFullDayBlocked;

                  return (
                    <div key={slot} className={`blocker-slot-item ${info.isBooked ? 'is-booked' : (info.isBlocked || isBlockedByFullDay) ? 'is-blocked' : 'is-available'}`}>
                      <div className="slot-item-info">
                        <span className="slot-time-badge">{slot}</span>
                        {info.isBooked && (
                          <span className="slot-patient-note">
                            محجوز للمريض: <strong>{info.appointment?.patientName || 'مريض عيادة'}</strong>
                          </span>
                        )}
                        {!info.isBooked && (info.isBlocked || isBlockedByFullDay) && (
                          <span className="slot-blocked-note">مغلق من العيادة</span>
                        )}
                        {!info.isBooked && !info.isBlocked && !isBlockedByFullDay && (
                          <span className="slot-available-note">متاح للحجز الإلكتروني</span>
                        )}
                      </div>

                      <div className="slot-item-action">
                        {info.isBooked ? (
                          <span className="badge-booked">حجز قائم</span>
                        ) : (info.isBlocked || isBlockedByFullDay) ? (
                          <button 
                            type="button"
                            className="btn-unlock" 
                            onClick={() => {
                              if (isBlockedByFullDay) {
                                onUnblockFullDaySlot(blockerDate);
                              } else {
                                onToggleBlockSlot(blockerDate, slot);
                              }
                            }}
                          >
                            <Unlock size={16} /> فتح الموعد
                          </button>
                        ) : (
                          <button 
                            type="button"
                            className="btn-lock" 
                            onClick={() => onToggleBlockSlot(blockerDate, slot)}
                          >
                            <Lock size={16} /> إغلاق الموعد
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-primary" onClick={onClose}>تم الانتهاء</button>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default SlotBlockerModal;
