import React from 'react';
import WalkInRegistrationModal from '@/pages/dashboard/WalkInRegistrationModal';
import ConsultationModal from '@/pages/dashboard/ConsultationModal';
import PatientDossierDrawer from '@/pages/dashboard/PatientDossierDrawer';
import QuickPaymentModal from '@/pages/dashboard/QuickPaymentModal';
import ExpensesModal from '@/components/ExpensesModal';
import PatientRecallModal from '@/components/PatientRecallModal';
import ShiftHandoverModal from '@/components/ShiftHandoverModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import BookingShareModal from '@/components/BookingShareModal';

/**
 * DashboardModalsContainer - Encapsulates all dashboard modals, drawers, and overlay controls
 */
export default function DashboardModalsContainer({
  isWalkInModalOpen,
  setIsWalkInModalOpen,
  handleWalkInSubmit,
  currentClinic,
  finishExamAppt,
  setFinishExamAppt,
  handleFinishConsultation,
  dossierPatient,
  setDossierPatient,
  isExpensesModalOpen,
  setIsExpensesModalOpen,
  isRecallModalOpen,
  setIsRecallModalOpen,
  isShiftModalOpen,
  setIsShiftModalOpen,
  paymentModalAppt,
  setPaymentModalAppt,
  handleCollectPayment,
  roomWarningModal,
  setRoomWarningModal,
  isShareModalOpen,
  setIsShareModalOpen,
  tenant,
  onScheduleAppointment,
  doctors = [],
  defaultDoctorId = ''
}) {
  return (
    <>
      {/* Walk-in Registration Modal */}
      <WalkInRegistrationModal
        isOpen={isWalkInModalOpen}
        onClose={() => setIsWalkInModalOpen(false)}
        onSubmit={handleWalkInSubmit}
        regularFee={currentClinic.regularFee || ''}
        doctors={doctors}
        defaultDoctorId={defaultDoctorId || currentClinic?.doctorId || currentClinic?.doctor_id}
      />

      {/* Consultation Modal */}
      <ConsultationModal
        isOpen={!!finishExamAppt}
        appointment={finishExamAppt}
        onClose={() => setFinishExamAppt(null)}
        onComplete={handleFinishConsultation}
      />

      {/* Patient Dossier Drawer */}
      <PatientDossierDrawer
        patient={dossierPatient}
        onClose={() => setDossierPatient(null)}
        onOpenRecall={() => {
          setDossierPatient(null);
          setIsRecallModalOpen(true);
        }}
      />

      {/* Expenses Modal */}
      <ExpensesModal
        isOpen={isExpensesModalOpen}
        onClose={() => setIsExpensesModalOpen(false)}
      />

      {/* Patient Recall Modal */}
      <PatientRecallModal
        isOpen={isRecallModalOpen}
        onClose={() => setIsRecallModalOpen(false)}
        onScheduleAppointment={onScheduleAppointment}
      />

      {/* Shift Handover Modal */}
      <ShiftHandoverModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
      />

      {/* Quick Payment & Invoicing Modal */}
      <QuickPaymentModal
        isOpen={!!paymentModalAppt}
        appointment={paymentModalAppt}
        onClose={() => setPaymentModalAppt(null)}
        onConfirm={handleCollectPayment}
      />

      {/* Room Occupancy Guard Warning Modal */}
      <ConfirmationModal
        isOpen={!!roomWarningModal}
        onClose={() => setRoomWarningModal(null)}
        onConfirm={() => setRoomWarningModal(null)}
        title="غرفة الكشف مشغولة حالياً"
        message={`المريض (${roomWarningModal?.occupiedPatient?.patientName || ''}) متواجد حالياً داخل غرفة الكشف مع الطبيب. يرجى إنهاء الكشف الحالي قبل إدخال (${roomWarningModal?.nextPatient?.patientName || ''}).`}
        confirmText="حسناً، فهمت"
        cancelText=""
        isDestructive={false}
      />

      {/* Clinic Booking Share & Real Domain Modal */}
      <BookingShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        tenant={tenant || currentClinic}
      />
    </>
  );
}
