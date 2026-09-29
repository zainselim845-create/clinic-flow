import { describe, it, expect } from 'vitest';
import { processDoctorIntent } from '../utils/clinicalAssistantActions';
import { appointmentsReducer } from '../context/reducers/appointmentsReducer';
import { patientsReducer } from '../context/reducers/patientsReducer';
import { financeReducer } from '../context/reducers/financeReducer';
import { settingsReducer } from '../context/reducers/settingsReducer';

describe('Doctor AI Autonomous Execution & Project-Wide Authority', () => {
  const mockState = {
    clinicInfo: {
      name: 'عيادة النخبة التخصصية',
      doctorName: 'د. خالد عبد الرحمن',
      consultationFee: 250,
      services: [{ id: 'srv-1', name: 'كشف عام', price: 250 }]
    },
    patients: [
      { id: 'pat-1', name: 'سارة إبراهيم', phone: '01011112222', allergies: 'بنسلين', balance: 300 },
      { id: 'pat-2', name: 'عمر شريف', phone: '01122223333', allergies: 'لا يوجد', balance: 0 }
    ],
    appointments: [
      { id: 'apt-1', patientName: 'سارة إبراهيم', patientPhone: '01011112222', date: '2026-10-01', time: '14:00', status: 'waiting', cost: 250 },
      { id: 'apt-2', patientName: 'عمر شريف', patientPhone: '01122223333', date: '2026-10-01', time: '15:00', status: 'confirmed', cost: 250 }
    ],
    blockedSlots: [],
    expenses: [
      { id: 'exp-1', title: 'شاش ومطهرات', amount: 150, date: '2026-10-01' }
    ],
    staffMembers: [
      { id: 'stf-1', name: 'مروة الشربيني', role: 'تمريض', shift: 'صباحي' }
    ]
  };

  const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

  describe('1. Natural Language Intent Extraction & Payload Generation', () => {
    it('handles CANCEL_APPOINTMENT intent accurately', () => {
      const result = processDoctorIntent('الغي ميعاد المريض سارة إبراهيم', mockState);
      expect(result.isAction).toBe(true);
      expect(result.actionType).toBe('CANCEL_APPOINTMENT');
      expect(result.payload.id).toBe('apt-1');
      expect(result.payload.patientName).toBe('سارة إبراهيم');
      expect(result.replyText).toContain('إلغاء');
      expect(EMOJI_REGEX.test(result.replyText)).toBe(false);
    });

    it('handles RESCHEDULE_APPOINTMENT intent accurately', () => {
      const result = processDoctorIntent('أجل ميعاد سارة إبراهيم للساعة 5 المغرب', mockState);
      expect(result.isAction).toBe(true);
      expect(result.actionType).toBe('RESCHEDULE_APPOINTMENT');
      expect(result.payload.id).toBe('apt-1');
      expect(result.payload.time).toBe('05:00 م');
      expect(EMOJI_REGEX.test(result.replyText)).toBe(false);
    });

    it('handles UPDATE_APPOINTMENT_STATUS for in_progress', () => {
      const result = processDoctorIntent('المريض سارة إبراهيم دخلت تكشف دلوقتي', mockState);
      expect(result.isAction).toBe(true);
      expect(result.actionType).toBe('UPDATE_APPOINTMENT_STATUS');
      expect(result.payload.id).toBe('apt-1');
      expect(result.payload.status).toBe('in_progress');
      expect(EMOJI_REGEX.test(result.replyText)).toBe(false);
    });

    it('handles UPDATE_APPOINTMENT_STATUS for completed / pending_payment', () => {
      const result = processDoctorIntent('سارة إبراهيم خلصت كشفها', mockState);
      expect(result.isAction).toBe(true);
      expect(result.actionType).toBe('UPDATE_APPOINTMENT_STATUS');
      expect(result.payload.id).toBe('apt-1');
      expect(['completed', 'pending_payment']).toContain(result.payload.status);
      expect(EMOJI_REGEX.test(result.replyText)).toBe(false);
    });

    it('handles ADD_PATIENT intent with demographics and allergies', () => {
      const query = 'سجل مريض جديد اسمه طارق مصطفى وتليفونه 01234567890 وعنده حساسية من السلفا';
      const result = processDoctorIntent(query, mockState);
      expect(result.isAction).toBe(true);
      expect(result.actionType).toBe('ADD_PATIENT');
      expect(result.payload.name).toBe('طارق مصطفى');
      expect(result.payload.phone).toBe('01234567890');
      expect(result.payload.allergies).toContain('السلفا');
      expect(EMOJI_REGEX.test(result.replyText)).toBe(false);
    });

    it('handles UPDATE_PATIENT intent for medical records', () => {
      const query = 'سجل حساسية أسبرين للمريضة سارة إبراهيم';
      const result = processDoctorIntent(query, mockState);
      expect(result.isAction).toBe(true);
      expect(result.actionType).toBe('UPDATE_PATIENT');
      expect(result.payload.id).toBe('pat-1');
      expect(result.payload.allergies).toContain('أسبرين');
      expect(EMOJI_REGEX.test(result.replyText)).toBe(false);
    });

    it('handles ADD_EXPENSE intent accurately', () => {
      const query = 'سجل مصروف 350 جنيه صيانة التكييف';
      const result = processDoctorIntent(query, mockState);
      expect(result.isAction).toBe(true);
      expect(result.actionType).toBe('ADD_EXPENSE');
      expect(result.payload.amount).toBe(350);
      expect(result.payload.title).toContain('صيانة التكييف');
      expect(EMOJI_REGEX.test(result.replyText)).toBe(false);
    });

    it('handles RECORD_PAYMENT intent and patient identification', () => {
      const query = 'حصل 200 جنيه من مديونية سارة إبراهيم';
      const result = processDoctorIntent(query, mockState);
      expect(result.isAction).toBe(true);
      expect(result.actionType).toBe('RECORD_PAYMENT');
      expect(result.payload.patientId).toBe('pat-1');
      expect(result.payload.amount).toBe(200);
      expect(EMOJI_REGEX.test(result.replyText)).toBe(false);
    });

    it('handles UPDATE_CLINIC_FEE intent', () => {
      const query = 'خلي سعر الكشف 400 جنيه';
      const result = processDoctorIntent(query, mockState);
      expect(result.isAction).toBe(true);
      expect(result.actionType).toBe('UPDATE_CLINIC_FEE');
      expect(result.payload.fee).toBe(400);
      expect(EMOJI_REGEX.test(result.replyText)).toBe(false);
    });

    it('handles ADD_SERVICE intent', () => {
      const query = 'ضيف خدمة تنظيف جير وسعرها 300 جنيه';
      const result = processDoctorIntent(query, mockState);
      expect(result.isAction).toBe(true);
      expect(result.actionType).toBe('ADD_SERVICE');
      expect(result.payload.name).toContain('تنظيف جير');
      expect(result.payload.price).toBe(300);
      expect(EMOJI_REGEX.test(result.replyText)).toBe(false);
    });

    it('handles Treasury and Cash Flow live calculation inquiry', () => {
      const query = 'احسبلي صافي الخزينة والسيولة النقدية اليوم';
      const result = processDoctorIntent(query, mockState);
      expect(result.actionType).toBe('INFO');
      expect(result.replyText).toContain('الخزنة');
      expect(result.replyText).toContain('صافي السيولة النقدية');
      expect(EMOJI_REGEX.test(result.replyText)).toBe(false);
    });

    it('handles Staff inquiry accurately', () => {
      const query = 'مين شغال النهاردة من التمريض';
      const result = processDoctorIntent(query, mockState);
      expect(result.replyText).toContain('مروة الشربيني');
      expect(EMOJI_REGEX.test(result.replyText)).toBe(false);
    });
  });

  describe('2. Reducer State Transitions for Dispatched Actions', () => {
    it('appointmentsReducer updates status to cancelled on cancel action', () => {
      const action = {
        type: 'UPDATE_APPOINTMENT_STATUS',
        payload: { id: 'apt-1', status: 'cancelled' }
      };
      const nextState = appointmentsReducer(mockState, action);
      const target = nextState.appointments.find(a => a.id === 'apt-1');
      expect(target.status).toBe('cancelled');
    });

    it('appointmentsReducer updates date and time on reschedule action', () => {
      const updatedAppt = { ...mockState.appointments[0], date: '2026-10-05', time: '17:00' };
      const action = {
        type: 'UPDATE_APPOINTMENT',
        payload: updatedAppt
      };
      const nextState = appointmentsReducer(mockState, action);
      const target = nextState.appointments.find(a => a.id === 'apt-1');
      expect(target.date).toBe('2026-10-05');
      expect(target.time).toBe('17:00');
    });

    it('patientsReducer adds new patient on ADD_PATIENT action', () => {
      const newPatient = {
        id: 'pat-new-1',
        name: 'طارق مصطفى',
        phone: '01234567890',
        allergies: 'السلفا',
        balance: 0
      };
      const action = {
        type: 'ADD_PATIENT',
        payload: newPatient
      };
      const nextState = patientsReducer(mockState, action);
      expect(nextState.patients.length).toBe(mockState.patients.length + 1);
      expect(nextState.patients.some(p => p.id === 'pat-new-1')).toBe(true);
    });

    it('patientsReducer updates patient dossier on UPDATE_PATIENT action', () => {
      const updatedPatient = {
        ...mockState.patients[0],
        allergies: 'بنسلين، أسبرين'
      };
      const action = {
        type: 'UPDATE_PATIENT',
        payload: updatedPatient
      };
      const nextState = patientsReducer(mockState, action);
      const target = nextState.patients.find(p => p.id === 'pat-1');
      expect(target.allergies).toBe('بنسلين، أسبرين');
    });

    it('financeReducer records new expense on ADD_EXPENSE action', () => {
      const newExpense = {
        id: 'exp-2',
        title: 'صيانة التكييف',
        amount: 350,
        category: 'صيانة',
        date: '2026-10-01'
      };
      const action = {
        type: 'ADD_EXPENSE',
        payload: newExpense
      };
      const nextState = financeReducer(mockState, action);
      expect(nextState.expenses.length).toBe(mockState.expenses.length + 1);
      expect(nextState.expenses.some(e => e.id === 'exp-2')).toBe(true);
      expect(nextState.notifications.some(n => n.type === 'expense')).toBe(true);
    });

    it('settingsReducer updates consultation fee on UPDATE_CLINIC_INFO', () => {
      const action = {
        type: 'UPDATE_CLINIC_INFO',
        payload: { consultationFee: 400 }
      };
      const nextState = settingsReducer(mockState, action);
      expect(nextState.clinicInfo.consultationFee).toBe(400);
    });

    it('settingsReducer adds new service to clinicInfo on ADD_SERVICE', () => {
      const newService = {
        id: 'srv-2',
        name: 'تنظيف جير وتلميع',
        price: 300
      };
      const action = {
        type: 'ADD_SERVICE',
        payload: newService
      };
      const nextState = settingsReducer(mockState, action);
      expect(nextState.clinicInfo.services.length).toBe(mockState.clinicInfo.services.length + 1);
      expect(nextState.clinicInfo.services.some(s => s.name === 'تنظيف جير وتلميع')).toBe(true);
    });

    it('settingsReducer blocks full day on BLOCK_FULL_DAY', () => {
      const action = {
        type: 'BLOCK_FULL_DAY',
        payload: { date: '2026-10-15', reason: 'مؤتمر طبي' }
      };
      const nextState = settingsReducer(mockState, action);
      const target = nextState.blockedSlots.find(b => b.date === '2026-10-15');
      expect(target).toBeDefined();
      expect(target.isFullDay).toBe(true);
      expect(target.reason).toBe('مؤتمر طبي');
    });
  });

  describe('3. LLM Action Parser and Protocol Execution', () => {
    it('correctly parses structured action block generated by LLM and executes it', () => {
      const llmOutput = `تم استلام طلبك يا دكتور وسيتم إلغاء الموعد فوراً من السجلات.
\`\`\`action
{
  "actionType": "CANCEL_APPOINTMENT",
  "payload": {
    "id": "apt-1"
  }
}
\`\`\``;

      const actionMatch = llmOutput.match(/\`\`\`(?:action|json)?\s*(\{[\s\S]*?"actionType"[\s\S]*?\})\s*\`\`\`/);
      expect(actionMatch).not.toBeNull();
      const detectedAction = JSON.parse(actionMatch[1]);
      expect(detectedAction.actionType).toBe('CANCEL_APPOINTMENT');
      expect(detectedAction.payload.id).toBe('apt-1');

      const cleanText = llmOutput.replace(/\`\`\`(?:action|json)?\s*\{[\s\S]*?"actionType"[\s\S]*?\}\s*\`\`\`/, '').trim();
      expect(cleanText).toBe('تم استلام طلبك يا دكتور وسيتم إلغاء الموعد فوراً من السجلات.');
      expect(EMOJI_REGEX.test(cleanText)).toBe(false);
    });
  });
});
