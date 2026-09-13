/**
 * Domain: Clinical & Electronic Health Records (EMR / EHR)
 * Bounded Context: Clinical Decision Support (CDS), Prescriptions, Diagnoses, Treatments, Labs
 */

export * from '../../services/drugInteractionService';
export { checkPrescriptionSafety as checkDrugAllergyInteractions } from '../../services/drugInteractionService';
export * from '../../services/clinicalNotesService';
export * from '../../services/treatmentPlansService';
export * from '../../services/labsService';
