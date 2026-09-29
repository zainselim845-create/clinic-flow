/**
 * Feature Slice: Clinical Decision Support & EMR (الملف الإكلينيكي والروشتات)
 * Encapsulates prescriptions, drug interaction checks, lab investigations, treatment plans, and AI assistant.
 */

export * from '../../services/drugInteractionService';
export { checkPrescriptionSafety as checkDrugAllergyInteractions } from '../../services/drugInteractionService';
export * from '../../services/clinicalNotesService';
export * from '../../services/treatmentPlansService';
export * from '../../services/labsService';
export * from '../../services/aiAssistantService';
