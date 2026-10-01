import React, { createContext, useContext, useMemo } from 'react';
import { useApp } from '../AppContext';

const FinancialContext = createContext(null);

export const FinancialProvider = ({ children }) => {
  const { state, dispatch } = useApp();

  const financialSummary = useMemo(() => {
    const expenses = state.expenses || [];
    const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    return {
      expensesCount: expenses.length,
      totalExpenses
    };
  }, [state.expenses]);

  const value = useMemo(() => ({
    expenses: state.expenses || [],
    totalExpenses: financialSummary.totalExpenses,
    expensesCount: financialSummary.expensesCount,
    dispatch
  }), [state.expenses, financialSummary, dispatch]);

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
  const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  return {
    expenses,
    totalExpenses,
    expensesCount: expenses.length,
    dispatch: app.dispatch
  };
};

export default FinancialContext;
