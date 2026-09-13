/**
 * Double-Entry General Ledger Service (دفتر الأستاذ العام ذو القيد المزدوج)
 * Provides enterprise-grade GAAP/IFRS compliant financial journalizing.
 * Enforces fundamental accounting invariant: Sum(Debits) === Sum(Credits).
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const CHART_OF_ACCOUNTS = {
  // 1xxx Assets (أصول)
  CASH_ON_HAND: { code: '1010', nameAr: 'الخزينة النقدية (كاش)', type: 'asset' },
  BANK_INSTAPAY: { code: '1020', nameAr: 'البنك والمدفوعات الإلكترونية (إنستاباي/فيزا)', type: 'asset' },
  ACCOUNTS_RECEIVABLE: { code: '1050', nameAr: 'ذمم المرضى / حسابات مدينة', type: 'asset' },
  MEDICAL_INVENTORY: { code: '1060', nameAr: 'مخزون المستلزمات والمواد الطبية', type: 'asset' },

  // 2xxx Liabilities (خصوم)
  ACCOUNTS_PAYABLE: { code: '2010', nameAr: 'مستحقات الموردين والمعامل', type: 'liability' },
  PATIENT_ADVANCE_DEPOSITS: { code: '2030', nameAr: 'أرصدة ودفعات مقدمة للمرضى', type: 'liability' },

  // 4xxx Revenue (إيرادات)
  CONSULTATION_REVENUE: { code: '4010', nameAr: 'إيرادات الكشوفات والاستشارات الطبية', type: 'revenue' },
  PROCEDURES_REVENUE: { code: '4020', nameAr: 'إيرادات العمليات والإجراءات العلاجية', type: 'revenue' },

  // 5xxx Expenses (مصروفات)
  MEDICAL_SUPPLIES_EXPENSE: { code: '5010', nameAr: 'تكلفة المواد والمستهلكات الطبية', type: 'expense' },
  LAB_FEES_EXPENSE: { code: '5020', nameAr: 'مصروفات المعامل والتركيبات', type: 'expense' },
  OPERATING_EXPENSE: { code: '5030', nameAr: 'مصروفات تشغيلية وعمومية', type: 'expense' }
};

let inMemoryJournalEntries = [];

const round2 = (val) => Math.round((Number(val) || 0) * 100) / 100;

/**
 * Generates a monotonic journal entry number per clinic
 */
export function getNextJournalEntryNumber(clinicId, year = new Date().getFullYear()) {
  const prefix = `JRN-${year}-`;
  let entries = inMemoryJournalEntries;

  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(`clinicflow_journal_${clinicId}`);
      if (stored) entries = JSON.parse(stored);
    } catch (_) {}
  }

  let maxSeq = 0;
  const regex = new RegExp(`^JRN-${year}-(\\d+)$`);
  entries.forEach(e => {
    const match = (e.entryNumber || '').match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  });

  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

/**
 * Records a balanced double-entry journal entry.
 * Strictly verifies Sum(Debits) === Sum(Credits).
 * 
 * @param {Object} params
 * @param {string} params.clinicId
 * @param {string} params.referenceType - 'invoice' | 'payment' | 'expense' | 'manual'
 * @param {string} params.referenceId
 * @param {string} params.description
 * @param {Array} params.lines - [{ accountCode, accountName, debit, credit }]
 * @param {string} [params.date]
 * @returns {Object} Recorded journal entry
 */
export function recordJournalEntry({
  clinicId = 'default',
  referenceType = 'manual',
  referenceId = '',
  description = '',
  lines = [],
  date = new Date().toISOString().split('T')[0]
}) {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new Error('A valid double-entry transaction requires at least two lines (Debit and Credit)');
  }

  const cleanLines = lines.map(line => ({
    accountCode: line.accountCode,
    accountName: line.accountName || line.accountCode,
    debit: Math.max(0, round2(line.debit || 0)),
    credit: Math.max(0, round2(line.credit || 0))
  }));

  const totalDebits = round2(cleanLines.reduce((sum, l) => sum + l.debit, 0));
  const totalCredits = round2(cleanLines.reduce((sum, l) => sum + l.credit, 0));

  // Invariant verification: Debits must balance Credits within 1 cent
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(`Unbalanced journal entry: Total Debits (${totalDebits}) must equal Total Credits (${totalCredits})`);
  }

  const entryNumber = getNextJournalEntryNumber(clinicId);
  const entry = {
    id: 'jrn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    clinicId,
    entryNumber,
    entryDate: date,
    referenceType,
    referenceId: String(referenceId),
    description,
    totalAmount: totalDebits,
    lines: cleanLines,
    createdAt: new Date().toISOString()
  };

  inMemoryJournalEntries.unshift(entry);

  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(`clinicflow_journal_${clinicId}`);
      const list = stored ? JSON.parse(stored) : [];
      localStorage.setItem(`clinicflow_journal_${clinicId}`, JSON.stringify([entry, ...list].slice(0, 5000)));
    } catch (_) {}
  }

  if (isSupabaseConfigured()) {
    supabase.from('journal_entries').insert({
      clinic_id: clinicId,
      entry_number: entryNumber,
      entry_date: date,
      reference_type: referenceType,
      reference_id: String(referenceId),
      description,
      total_amount: totalDebits
    }).then(({ data }) => {
      if (data?.id) {
        const lineRows = cleanLines.map(l => ({
          journal_entry_id: data.id,
          clinic_id: clinicId,
          account_code: l.accountCode,
          account_name: l.accountName,
          debit_amount: l.debit,
          credit_amount: l.credit
        }));
        supabase.from('journal_lines').insert(lineRows).catch(() => {});
      }
    }).catch(() => {});
  }

  return entry;
}

/**
 * Automates double-entry recording when an invoice is issued
 */
export function recordInvoiceJournalEntry(invoice) {
  const clinicId = invoice.clinicId || invoice.clinic_id || 'default';
  const total = round2(invoice.total || invoice.patientShare || 0);
  if (total <= 0) return null;

  const isPaidDirectly = invoice.paymentStatus === 'paid' && Number(invoice.paidAmount) >= total;
  const debitAccount = isPaidDirectly
    ? (invoice.paymentMethod === 'card' || invoice.paymentMethod === 'instapay'
        ? CHART_OF_ACCOUNTS.BANK_INSTAPAY
        : CHART_OF_ACCOUNTS.CASH_ON_HAND)
    : CHART_OF_ACCOUNTS.ACCOUNTS_RECEIVABLE;

  return recordJournalEntry({
    clinicId,
    referenceType: 'invoice',
    referenceId: invoice.invoiceNumber || invoice.id,
    description: `إصدار فاتورة علاجية رقم ${invoice.invoiceNumber || ''} للمريض ${invoice.patientName || ''}`,
    lines: [
      {
        accountCode: debitAccount.code,
        accountName: debitAccount.nameAr,
        debit: total,
        credit: 0
      },
      {
        accountCode: CHART_OF_ACCOUNTS.CONSULTATION_REVENUE.code,
        accountName: CHART_OF_ACCOUNTS.CONSULTATION_REVENUE.nameAr,
        debit: 0,
        credit: total
      }
    ]
  });
}

/**
 * Automates double-entry recording when a payment is collected
 */
export function recordPaymentJournalEntry(payment) {
  const clinicId = payment.clinicId || payment.clinic_id || 'default';
  const amount = round2(payment.amount || 0);
  if (amount <= 0) return null;

  const isBank = payment.paymentMethod === 'card' || payment.paymentMethod === 'instapay';
  const debitAccount = isBank ? CHART_OF_ACCOUNTS.BANK_INSTAPAY : CHART_OF_ACCOUNTS.CASH_ON_HAND;

  return recordJournalEntry({
    clinicId,
    referenceType: 'payment',
    referenceId: payment.id || payment.transactionRef || '',
    description: `تحصيل دفعة مالية عبر (${isBank ? 'إلكتروني/إنستاباي' : 'نقداً'}) للمريض`,
    lines: [
      {
        accountCode: debitAccount.code,
        accountName: debitAccount.nameAr,
        debit: amount,
        credit: 0
      },
      {
        accountCode: CHART_OF_ACCOUNTS.ACCOUNTS_RECEIVABLE.code,
        accountName: CHART_OF_ACCOUNTS.ACCOUNTS_RECEIVABLE.nameAr,
        debit: 0,
        credit: amount
      }
    ]
  });
}

/**
 * Calculates trial balance (ميزان المراجعة) verifying total debits match total credits
 */
export function getClinicTrialBalance(clinicId = 'default') {
  let entries = inMemoryJournalEntries.filter(e => e.clinicId === clinicId);

  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(`clinicflow_journal_${clinicId}`);
      if (stored) entries = JSON.parse(stored);
    } catch (_) {}
  }

  const accountBalances = {};

  entries.forEach(entry => {
    (entry.lines || []).forEach(line => {
      if (!accountBalances[line.accountCode]) {
        accountBalances[line.accountCode] = {
          code: line.accountCode,
          name: line.accountName,
          totalDebit: 0,
          totalCredit: 0,
          netBalance: 0
        };
      }
      accountBalances[line.accountCode].totalDebit += line.debit;
      accountBalances[line.accountCode].totalCredit += line.credit;
    });
  });

  let grandDebit = 0;
  let grandCredit = 0;

  const accounts = Object.values(accountBalances).map(acc => {
    acc.totalDebit = round2(acc.totalDebit);
    acc.totalCredit = round2(acc.totalCredit);
    acc.netBalance = round2(acc.totalDebit - acc.totalCredit);
    grandDebit += acc.totalDebit;
    grandCredit += acc.totalCredit;
    return acc;
  });

  grandDebit = round2(grandDebit);
  const difference = round2(Math.abs(grandDebit - grandCredit));

  return {
    clinicId,
    accounts,
    grandTotalDebit: grandDebit,
    grandTotalCredit: grandCredit,
    totalDebits: grandDebit,
    totalCredits: grandCredit,
    difference,
    isBalanced: difference < 0.01,
    generatedAt: new Date().toISOString()
  };
}
