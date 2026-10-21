import React, { createContext, useContext, useMemo } from 'react';
import { useApp } from '@/context/AppContext';

const FinancialContext = createContext(null);

export const FinancialProvider = ({ children }) => {
  const { state, dispatch } = useApp();

  const financialSummary = useMemo(() => {
    const expenses = state.expenses || [];
    const invoices = state.invoices || [];
    const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.paidAmount ?? inv.total) || 0), 0);
    return {
      expensesCount: expenses.length,
      invoicesCount: invoices.length,
      totalExpenses,
      totalRevenue
    };
  }, [state.expenses, state.invoices]);

  const value = useMemo(() => ({
    expenses: state.expenses || [],
    invoices: state.invoices || [],
    totalExpenses: financialSummary.totalExpenses,
    totalRevenue: financialSummary.totalRevenue,
    expensesCount: financialSummary.expensesCount,
    invoicesCount: financialSummary.invoicesCount,
    dispatch
  }), [state.expenses, state.invoices, financialSummary, dispatch]);

  return (
    <FinancialContext.Provider value={value}>
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  const app = useApp();
  if (context) return context;

  const expenses = app.state.expenses || [];
  const invoices = app.state.invoices || [];
  const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.paidAmount ?? inv.total) || 0), 0);
  return {
    expenses,
    invoices,
    totalExpenses,
    totalRevenue,
    expensesCount: expenses.length,
    invoicesCount: invoices.length,
    dispatch: app.dispatch
  };
};

export default FinancialContext;
