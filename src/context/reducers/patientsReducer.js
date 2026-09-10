export function patientsReducer(state, action) {
  switch (action.type) {
    case 'ADD_PATIENT':
      return { ...state, patients: [action.payload, ...state.patients] };

    case 'UPDATE_PATIENT':
      return { 
        ...state, 
        patients: state.patients.map(p => p.id === action.payload.id ? action.payload : p) 
      };

    case 'UPDATE_PATIENT_MEDICAL_HISTORY': {
      const { patientId, diagnosis, notes, lastVisit } = action.payload;
      return {
        ...state,
        patients: state.patients.map(p => {
          if (p.id === patientId) {
            return {
              ...p,
              ...(diagnosis !== undefined ? { diagnosis } : {}),
              ...(notes !== undefined ? { notes } : {}),
              ...(lastVisit !== undefined ? { lastVisit } : {})
            };
          }
          return p;
        })
      };
    }

    case 'DELETE_PATIENT':
      return {
        ...state,
        patients: state.patients.filter(p => p.id !== action.payload),
        appointments: state.appointments.filter(a => a.patientId !== action.payload),
        recalls: (state.recalls || []).filter(r => r.patientId !== action.payload),
        invoices: (state.invoices || []).filter(inv => inv.patientId !== action.payload)
      };

    case 'SET_PATIENTS':
      return { ...state, patients: action.payload };

    default:
      return state;
  }
}
