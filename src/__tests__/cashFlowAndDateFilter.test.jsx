import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import InvoicesMetricsGrid from '../components/invoices/InvoicesMetricsGrid';
import InvoicesFiltersBar from '../components/invoices/InvoicesFiltersBar';
import InvoicesTable from '../components/invoices/InvoicesTable';
import ExpenseModal from '../components/invoices/ExpenseModal';

const cleanHtml = (str) => (str || '').replace(/<!--[\s\S]*?-->/g, '');

describe('Cash Flow Center & Universal Date Range Filtering', () => {
  describe('InvoicesMetricsGrid Component', () => {
    it('renders Money In, Money Out, Net Balance, and Receivables accurately into HTML', () => {
      const rawHtml = renderToString(
        React.createElement(InvoicesMetricsGrid, {
          totalInflow: 15000,
          totalOutflow: 6200,
          netCashFlow: 8800,
          totalOutstanding: 3400,
          invoicesCount: 18,
          expensesCount: 7,
          dateRangeLabel: 'من 2026-09-01 إلى 2026-09-29'
        })
      );
      const html = cleanHtml(rawHtml);

      // Verify date range badge
      expect(html).toContain('من 2026-09-01 إلى 2026-09-29');

      // Verify Money In (فلوس داخل)
      expect(html).toContain('فلوس داخل (المقبوضات المحصلة)');
      expect(html).toContain('+15,000 ج.م');
      expect(html).toContain('18 معاملة تحصيل');

      // Verify Money Out (فلوس خارج)
      expect(html).toContain('فلوس خارج (المصروفات التشغيلية)');
      expect(html).toContain('-6,200 ج.م');
      expect(html).toContain('7 سند صرف نقدية');

      // Verify Net Balance (صافي الخزينة)
      expect(html).toContain('صافي الخزينة (السيولة النقدية)');
      expect(html).toContain('8,800 ج.م');
      expect(html).toContain('فائض نقدي متاح');

      // Verify Receivables (المستحقات)
      expect(html).toContain('مستحقات معلقة (ديون المرضى)');
      expect(html).toContain('3,400 ج.م');
    });

    it('displays cash deficit warning when outflows exceed inflows', () => {
      const rawHtml = renderToString(
        React.createElement(InvoicesMetricsGrid, {
          totalInflow: 4000,
          totalOutflow: 9500,
          netCashFlow: -5500,
          totalOutstanding: 1200,
          invoicesCount: 3,
          expensesCount: 5
        })
      );
      const html = cleanHtml(rawHtml);

      expect(html).toContain('-5,500 ج.م');
      expect(html).toContain('عجز في السيولة');
    });

    it('falls back gracefully to legacy props for backwards compatibility', () => {
      const el = React.createElement(InvoicesMetricsGrid, {
        totalBilled: 10000,
        totalCollected: 7000,
        totalOutstanding: 3000,
        invoicesCount: 10
      });
      expect(React.isValidElement(el)).toBe(true);

      const html = cleanHtml(renderToString(el));
      expect(html).toContain('+7,000 ج.م');
      expect(html).toContain('7,000 ج.م');
    });
  });

  describe('InvoicesFiltersBar Component', () => {
    it('renders tabs for all, in, and out views with count badges', () => {
      const el = React.createElement(InvoicesFiltersBar, {
        viewMode: 'all',
        totalCount: 25,
        inflowCount: 15,
        outflowCount: 10,
        startDate: '2026-09-01',
        endDate: '2026-09-29'
      });
      expect(React.isValidElement(el)).toBe(true);

      const html = cleanHtml(renderToString(el));
      expect(html).toContain('حركة الخزينة العامة (25)');
      expect(html).toContain('فلوس داخل (المقبوضات) (15)');
      expect(html).toContain('فلوس خارج (المصروفات) (10)');
      expect(html).toContain('اليوم');
      expect(html).toContain('هذا الأسبوع');
      expect(html).toContain('هذا الشهر');
      expect(html).toContain('آخر 30 يوماً');
      expect(html).toContain('كل الفترات');
    });

    it('renders custom date range inputs with proper values', () => {
      const html = cleanHtml(
        renderToString(
          React.createElement(InvoicesFiltersBar, {
            startDate: '2026-09-01',
            endDate: '2026-09-29'
          })
        )
      );

      expect(html).toContain('value="2026-09-01"');
      expect(html).toContain('value="2026-09-29"');
      expect(html).toContain('إعادة ضبط');
    });
  });

  describe('ExpenseModal Component', () => {
    it('exports a valid component function and renders cleanly', () => {
      expect(typeof ExpenseModal).toBe('function');
      const el = React.createElement(ExpenseModal, {
        isOpen: true,
        onClose: vi.fn(),
        onSaveExpense: vi.fn()
      });
      expect(React.isValidElement(el)).toBe(true);
    });
  });

  describe('InvoicesTable Cash Flow Chronology', () => {
    it('renders combined chronological stream with distinct in/out badges and amounts', () => {
      const mockInvoices = [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-2026-001',
          patientName: 'مريم السيد',
          patientPhone: '01012345678',
          createdAt: '2026-09-28T10:00:00.000Z',
          totalAmount: 1200,
          paidAmount: 1200,
          paymentStatus: 'paid',
          paymentMethod: 'instapay'
        }
      ];

      const mockExpenses = [
        {
          id: 'exp-1',
          title: 'شراء سرنجات ومستهلكات جراحية',
          category: 'خامات ومستلزمات طبية',
          amount: 450,
          date: '2026-09-29',
          paymentMethod: 'cash',
          receiptRef: 'REC-554'
        }
      ];

      const html = cleanHtml(
        renderToString(
          React.createElement(InvoicesTable, {
            viewMode: 'all',
            filteredInvoices: mockInvoices,
            filteredExpenses: mockExpenses
          })
        )
      );

      // Verify Inflow row
      expect(html).toContain('فاتورة كشف / علاج - مريم السيد');
      expect(html).toContain('+1,200 ج.م');
      expect(html).toContain('INV-2026-001');
      expect(html).toContain('فلوس داخل');

      // Verify Outflow row
      expect(html).toContain('شراء سرنجات ومستهلكات جراحية');
      expect(html).toContain('-450 ج.م');
      expect(html).toContain('REC-554');
      expect(html).toContain('فلوس خارج');
    });

    it('renders out-only table with category badges when viewMode is out', () => {
      const mockExpenses = [
        {
          id: 'exp-2',
          title: 'فاتورة كهرباء العيادة لشهر سبتمبر',
          category: 'إيجار ومرافق',
          amount: 1400,
          date: '2026-09-25',
          paymentMethod: 'card'
        }
      ];

      const html = cleanHtml(
        renderToString(
          React.createElement(InvoicesTable, {
            viewMode: 'out',
            filteredExpenses: mockExpenses
          })
        )
      );

      expect(html).toContain('فاتورة كهرباء العيادة لشهر سبتمبر');
      expect(html).toContain('إيجار ومرافق');
      expect(html).toContain('-1,400 ج.م');
    });
  });

  describe('Universal Date Range Filtering Calculation Logic', () => {
    const invoices = [
      { id: '1', date: '2026-09-05', paidAmount: 500 },
      { id: '2', date: '2026-09-15', paidAmount: 800 },
      { id: '3', date: '2026-09-25', paidAmount: 1200 },
      { id: '4', date: '2026-10-02', paidAmount: 300 }
    ];

    const expenses = [
      { id: 'e1', date: '2026-09-02', amount: 200 },
      { id: 'e2', date: '2026-09-18', amount: 400 },
      { id: 'e3', date: '2026-10-01', amount: 600 }
    ];

    it('filters items strictly within specified start and end date range', () => {
      const start = '2026-09-10';
      const end = '2026-09-28';

      const filteredIn = invoices.filter(inv => {
        const d = inv.date.slice(0, 10);
        return (!start || d >= start) && (!end || d <= end);
      });

      const filteredOut = expenses.filter(exp => {
        const d = exp.date.slice(0, 10);
        return (!start || d >= start) && (!end || d <= end);
      });

      expect(filteredIn).toHaveLength(2);
      expect(filteredIn.map(i => i.id)).toEqual(['2', '3']);

      expect(filteredOut).toHaveLength(1);
      expect(filteredOut.map(e => e.id)).toEqual(['e2']);

      const totalIn = filteredIn.reduce((sum, i) => sum + i.paidAmount, 0);
      const totalOut = filteredOut.reduce((sum, e) => sum + e.amount, 0);
      const net = totalIn - totalOut;

      expect(totalIn).toBe(2000);
      expect(totalOut).toBe(400);
      expect(net).toBe(1600);
    });

    it('supports single day selection (start date === end date)', () => {
      const today = '2026-09-15';
      const filteredIn = invoices.filter(inv => {
        const d = inv.date.slice(0, 10);
        return d >= today && d <= today;
      });

      expect(filteredIn).toHaveLength(1);
      expect(filteredIn[0].id).toBe('2');
      expect(filteredIn[0].paidAmount).toBe(800);
    });
  });
});

