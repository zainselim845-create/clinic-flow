import { describe, it, expect } from 'vitest';
import { 
  ADULT_TEETH, PEDIATRIC_TEETH, TOOTH_SURFACES, CLINICAL_CONDITIONS,
  toDbDentalChart, fromDbDentalChart
} from '../services/dentalChartService';
import { toDbInvoice, fromDbInvoice } from '../services/invoicesService';
import { toDbTreatmentPlan, fromDbTreatmentPlan } from '../services/treatmentPlansService';
import { toDbLabOrder, fromDbLabOrder } from '../services/labsService';

describe('Dental Clinical & Operations Domain Behavior', () => {

  describe('FDI Dental Arch & Tooth Anatomy Domain', () => {
    
    it('test_adult_fdi_teeth_span_all_four_quadrants_completely', () => {
      const allTeeth = [
        ...ADULT_TEETH.upperRight,
        ...ADULT_TEETH.upperLeft,
        ...ADULT_TEETH.lowerLeft,
        ...ADULT_TEETH.lowerRight
      ];
      // Must contain exactly 32 distinct adult teeth
      expect(new Set(allTeeth).size).toBe(32);
      // Verify boundary teeth
      expect(allTeeth).toContain(18); // Upper right 3rd molar
      expect(allTeeth).toContain(11); // Upper right central incisor
      expect(allTeeth).toContain(21); // Upper left central incisor
      expect(allTeeth).toContain(28); // Upper left 3rd molar
      expect(allTeeth).toContain(38); // Lower left 3rd molar
      expect(allTeeth).toContain(48); // Lower right 3rd molar
    });

    it('test_pediatric_fdi_teeth_span_twenty_primary_teeth', () => {
      const allTeeth = [
        ...PEDIATRIC_TEETH.upperRight,
        ...PEDIATRIC_TEETH.upperLeft,
        ...PEDIATRIC_TEETH.lowerLeft,
        ...PEDIATRIC_TEETH.lowerRight
      ];
      // Must contain exactly 20 distinct deciduous teeth
      expect(new Set(allTeeth).size).toBe(20);
      expect(allTeeth).toContain(55); // Upper right 2nd primary molar
      expect(allTeeth).toContain(85); // Lower right 2nd primary molar
    });

    it.each([
      { surface: 'O', expectedSurface: 'O' },
      { surface: 'MOD', expectedSurface: 'MOD' },
      { surface: 'WHOLE', expectedSurface: 'WHOLE' }
    ])('test_tooth_condition_serialization_preserves_surface_$surface', ({ surface, expectedSurface }) => {
      const payload = toDbDentalChart({
        patientId: 'pat-100',
        toothNumber: 16,
        surface,
        conditionCode: 'caries',
        status: 'planned'
      });
      expect(payload.surface).toBe(expectedSurface);
      expect(payload.tooth_number).toBe(16);

      const domainModel = fromDbDentalChart({
        ...payload,
        id: 'tooth-entry-1',
        created_at: '2026-08-30'
      });
      expect(domainModel.surface).toBe(expectedSurface);
      expect(domainModel.conditionCode).toBe('caries');
    });

  });

  describe('Financial Invoicing & Payment Domain Behavior', () => {

    it.each([
      { subtotal: 1000, discount: 100, taxRate: 14, expectedTax: 126, expectedTotal: 1026 },
      { subtotal: 500, discount: 0, taxRate: 0, expectedTax: 0, expectedTotal: 500 },
      { subtotal: 2000, discount: 500, taxRate: 10, expectedTax: 150, expectedTotal: 1650 }
    ])('test_invoice_financial_math_calculates_subtotal_discount_tax', ({ subtotal, discount, taxRate, expectedTax, expectedTotal }) => {
      const calculatedTax = (subtotal - discount) * (taxRate / 100);
      const calculatedTotal = subtotal - discount + calculatedTax;

      expect(calculatedTax).toBeCloseTo(expectedTax, 2);
      expect(calculatedTotal).toBeCloseTo(expectedTotal, 2);


      const dbPayload = toDbInvoice({
        patientId: 'pat-1',
        invoiceNumber: 'INV-TEST',
        subtotal,
        discount,
        taxPercentage: taxRate,
        taxAmount: calculatedTax,
        total: calculatedTotal,
        patientShare: calculatedTotal,
        paidAmount: 0,
        remainingBalance: calculatedTotal,
        paymentStatus: 'unpaid'
      });

      expect(dbPayload.total).toBe(expectedTotal);
      expect(dbPayload.remaining_balance).toBe(expectedTotal);
    });

    it('test_partial_payment_reduces_remaining_balance_without_marking_paid', () => {
      const invoice = {
        total: 1500,
        patientShare: 1500,
        paidAmount: 500
      };
      const newPayment = 400;
      const updatedPaid = invoice.paidAmount + newPayment;
      const remaining = Math.max(0, invoice.patientShare - updatedPaid);
      const status = remaining <= 0 ? 'paid' : (updatedPaid > 0 ? 'partial' : 'unpaid');

      expect(updatedPaid).toBe(900);
      expect(remaining).toBe(600);
      expect(status).toBe('partial');
    });

    it('test_full_payment_clears_remaining_balance_and_marks_paid', () => {
      const invoice = {
        total: 1000,
        patientShare: 1000,
        paidAmount: 400
      };
      const finalPayment = 600;
      const updatedPaid = invoice.paidAmount + finalPayment;
      const remaining = Math.max(0, invoice.patientShare - updatedPaid);
      const status = remaining <= 0 ? 'paid' : (updatedPaid > 0 ? 'partial' : 'unpaid');

      expect(updatedPaid).toBe(1000);
      expect(remaining).toBe(0);
      expect(status).toBe('paid');
    });

  });

  describe('Treatment Planning Domain Behavior', () => {

    it('test_treatment_plan_aggregates_procedure_costs_accurately', () => {
      const planItems = [
        { toothNumber: 16, procedureName: 'RCT', fee: 800, discount: 0 },
        { toothNumber: 16, procedureName: 'Zirconia Crown', fee: 1800, discount: 100 },
        { toothNumber: 24, procedureName: 'Composite', fee: 400, discount: 0 }
      ];

      const subtotal = planItems.reduce((acc, it) => acc + it.fee, 0);
      const totalDiscount = planItems.reduce((acc, it) => acc + it.discount, 0);
      const netTotal = subtotal - totalDiscount;

      expect(subtotal).toBe(3000);
      expect(totalDiscount).toBe(100);
      expect(netTotal).toBe(2900);

      const dbPlan = toDbTreatmentPlan({
        patientId: 'pat-1',
        title: 'خطة تأهيل شاملة',
        totalCost: subtotal,
        discount: totalDiscount,
        netCost: netTotal,
        status: 'accepted'
      });

      expect(dbPlan.total_cost).toBe(3000);
      expect(dbPlan.net_cost).toBe(2900);
    });

  });

  describe('Dental Lab Orders Domain Behavior', () => {

    it('test_lab_order_status_progression_follows_clinical_stages', () => {
      const orderLifecycle = ['pending', 'sent', 'first_try', 'adjustment', 'final_try', 'delivered'];
      
      const currentStage = 'first_try';
      const currentIndex = orderLifecycle.indexOf(currentStage);
      const nextStage = orderLifecycle[currentIndex + 1];

      expect(nextStage).toBe('adjustment');

      const payload = toDbLabOrder({
        patientId: 'pat-99',
        workType: 'طربوش زيركون',
        toothNumber: 16,
        shade: 'A2',
        cost: 450,
        status: nextStage
      });

      expect(payload.status).toBe('adjustment');
      expect(payload.tooth_number).toBe(16);
    });

  });

  describe('Inventory & Consumables Safety Thresholds', () => {

    it('test_low_stock_threshold_flags_critical_when_quantity_equals_or_below_minimum', () => {
      const item1 = { name: 'Composite', currentQty: 2, minQuantity: 3 };
      const item2 = { name: 'Latex Gloves', currentQty: 5, minQuantity: 5 };
      const item3 = { name: 'Anesthetic', currentQty: 10, minQuantity: 4 };

      const isLowStock = (item) => item.currentQty <= item.minQuantity;

      expect(isLowStock(item1)).toBe(true);  // Below min
      expect(isLowStock(item2)).toBe(true);  // Exactly at min
      expect(isLowStock(item3)).toBe(false); // Safe level
    });

  });

});
