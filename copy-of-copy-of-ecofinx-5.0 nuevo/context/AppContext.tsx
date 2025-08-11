



import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { 
    AppContextType, AppState, Transaction, Credit, Receipt, Goal, ToxicityReport, 
    User, UserData, Group, ActiveView, Alert, TransactionType, InsurancePolicy, Budget,
    WidgetConfig, WidgetType, InsurancePolicyType, SavedTaxReturn, EducationProgress
} from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { INSURANCE_POLICY_TYPES } from '../constants.tsx';

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_WIDGETS: WidgetConfig[] = [
    { id: WidgetType.AI_SUMMARY, type: WidgetType.AI_SUMMARY },
    { id: WidgetType.SUMMARY_CARDS, type: WidgetType.SUMMARY_CARDS },
    { id: WidgetType.FINANCIAL_TRENDS, type: WidgetType.FINANCIAL_TRENDS },
    { id: WidgetType.BUDGET_STATUS, type: WidgetType.BUDGET_STATUS },
    { id: WidgetType.ALERTS, type: WidgetType.ALERTS },
    { id: WidgetType.GOALS, type: WidgetType.GOALS },
];

const defaultUser: User = { id: crypto.randomUUID(), name: 'Usuario Principal' };
const initialUserData: UserData = { 
    transactions: [], 
    credits: [], 
    receipts: [], 
    insurancePolicies: [],
    goals: [],
    budgets: [],
    dashboardWidgets: DEFAULT_WIDGETS,
    incomeCategories: [],
    expenseCategories: [],
    expenseSubcategories: {},
    invoiceCategories: [],
    insuranceSubcategories: {},
    savedTaxReturns: [],
    educationProgress: {
        completedLevel: 0,
        checklistStates: {},
        milestones: [],
    }
};

const initialAppState: AppState = {
    users: [defaultUser],
    groups: [],
    activeView: { type: 'user', id: defaultUser.id },
    userData: {
        [defaultUser.id]: initialUserData
    }
};

const DEFAULT_INCOME_CATEGORIES = ['Nómina', 'Freelance', 'Regalos', 'Otros'];
const DEFAULT_EXPENSE_CATEGORIES = ['Vivienda', 'Transporte', 'Alimentación', 'Ocio', 'Salud', 'Finanzas', 'Seguros', 'Otros'];
const DEFAULT_INVOICE_CATEGORIES = ['Trabajo', 'Material Oficina', 'Viajes', 'Otros'];

const DEFAULT_EXPENSE_SUBCATEGORIES: Record<string, string[]> = {
    'Vivienda': ['Hipoteca', 'Alquiler', 'Luz', 'Agua', 'Gas', 'ADSL / Fibra', 'Comunidad', 'Derrama', 'Alarma', 'Reparaciones'],
    'Transporte': ['Gasolina', 'Transporte Público', 'Mantenimiento Coche', 'Parking'],
    'Alimentación': ['Supermercado', 'Restaurantes'],
    'Ocio': ['Cine', 'Suscripciones', 'Deporte', 'Vacaciones'],
    'Salud': ['Farmacia', 'Médico'],
    'Finanzas': ['Crédito', 'Tarjeta', 'Comisiones', 'Financiación', 'Hipoteca', 'Préstamo'],
    'Seguros': ['Coche', 'Hogar', 'Vida', 'Salud', 'Otros'],
    'Otros': [],
};

type UserDataArrayKey = 'transactions' | 'credits' | 'receipts' | 'goals' | 'insurancePolicies' | 'budgets' | 'savedTaxReturns';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useLocalStorage<AppState>('finanzen-app-state-v3', initialAppState);

  const activeViewTarget = useMemo(() => {
    if (state.activeView.type === 'user') {
        return state.users.find(u => u.id === state.activeView.id) ?? null;
    }
    return state.groups.find(g => g.id === state.activeView.id) ?? null;
  }, [state.users, state.groups, state.activeView]);
  
  const groupMembers = useMemo(() => {
    if (state.activeView.type === 'group') {
        const group = state.groups.find(g => g.id === state.activeView.id);
        if (group) {
            return state.users.filter(u => group.userIds.includes(u.id));
        }
    }
    return [];
  }, [state.activeView, state.groups, state.users]);

  const activeUserForModification = useMemo(() => {
    if (state.activeView.type === 'user') {
        return state.users.find(u => u.id === state.activeView.id) ?? state.users[0];
    }
    // For groups, default to the first user in the app state for actions like adding categories
    // that are not assigned to a specific user.
    return state.users[0];
  }, [state.activeView, state.users]);


  const getDataForView = <T extends UserDataArrayKey>(dataType: T): UserData[T] => {
    if (state.activeView.type === 'user') {
        return (state.userData[state.activeView.id]?.[dataType] ?? []) as UserData[T];
    }
    const group = state.groups.find(g => g.id === state.activeView.id);
    if (!group) return [] as UserData[T];
    
    return group.userIds.flatMap(userId => (state.userData[userId]?.[dataType] ?? []) as any) as UserData[T];
  };
  
  const getCategoriesForView = (categoryType: 'incomeCategories' | 'expenseCategories' | 'invoiceCategories', defaultCategories: string[]): string[] => {
        let userIds: string[];
        if (state.activeView.type === 'user') {
            userIds = [state.activeView.id];
        } else {
            const group = state.groups.find(g => g.id === state.activeView.id);
            userIds = group ? group.userIds : [];
        }

        const customCategories = userIds.flatMap(id => state.userData[id]?.[categoryType] ?? []);
        return [...new Set([...defaultCategories, ...customCategories])];
    };
  
  const getExpenseSubcategoriesForView = (): Record<string, string[]> => {
    let userIds: string[];
    if (state.activeView.type === 'user') {
        userIds = [state.activeView.id];
    } else {
        const group = state.groups.find(g => g.id === state.activeView.id);
        userIds = group ? group.userIds : [];
    }

    const combined: Record<string, string[]> = JSON.parse(JSON.stringify(DEFAULT_EXPENSE_SUBCATEGORIES));
    
    userIds.forEach(id => {
        const userSubcategories = state.userData[id]?.expenseSubcategories;
        if (userSubcategories) {
            for (const category in userSubcategories) {
                if (!combined[category]) {
                    combined[category] = [];
                }
                combined[category] = [...new Set([...combined[category], ...userSubcategories[category]])];
            }
        }
    });

    return combined;
  };

  const getInsuranceSubcategoriesForView = (): Record<string, string[]> => {
    let userIds: string[];
    if (state.activeView.type === 'user') {
        userIds = [state.activeView.id];
    } else {
        const group = state.groups.find(g => g.id === state.activeView.id);
        userIds = group ? group.userIds : [];
    }

    const combined: Record<string, string[]> = {};
    INSURANCE_POLICY_TYPES.forEach(type => combined[type] = []);
    
    userIds.forEach(id => {
        const userSubcategories = state.userData[id]?.insuranceSubcategories;
        if (userSubcategories) {
            for (const category in userSubcategories) {
                if (!combined[category]) {
                    combined[category] = [];
                }
                combined[category] = [...new Set([...combined[category], ...userSubcategories[category]])];
            }
        }
    });

    return combined;
    };


  const transactions = useMemo(() => getDataForView('transactions'), [state.activeView, state.userData, state.groups]);
  const credits = useMemo(() => getDataForView('credits'), [state.activeView, state.userData, state.groups]);
  const receipts = useMemo(() => getDataForView('receipts'), [state.activeView, state.userData, state.groups]);
  const insurancePolicies = useMemo(() => getDataForView('insurancePolicies'), [state.activeView, state.userData, state.groups]);
  const goals = useMemo(() => getDataForView('goals'), [state.activeView, state.userData, state.groups]);
  const budgets = useMemo(() => getDataForView('budgets'), [state.activeView, state.userData, state.groups]);
  const savedTaxReturns = useMemo(() => getDataForView('savedTaxReturns'), [state.activeView, state.userData, state.groups]);
  
  const incomeCategories = useMemo(() => getCategoriesForView('incomeCategories', DEFAULT_INCOME_CATEGORIES), [state.activeView, state.userData, state.groups]);
  const expenseCategories = useMemo(() => getCategoriesForView('expenseCategories', DEFAULT_EXPENSE_CATEGORIES), [state.activeView, state.userData, state.groups]);
  const invoiceCategories = useMemo(() => getCategoriesForView('invoiceCategories', DEFAULT_INVOICE_CATEGORIES), [state.activeView, state.userData, state.groups]);
  const expenseSubcategories = useMemo(() => getExpenseSubcategoriesForView(), [state.activeView, state.userData, state.groups]);
  const insuranceSubcategories = useMemo(() => getInsuranceSubcategoriesForView(), [state.activeView, state.userData, state.groups]);

  const dashboardWidgets = useMemo(() => {
    if (state.activeView.type === 'user') {
        const userData = state.userData[state.activeView.id];
        return userData?.dashboardWidgets ?? DEFAULT_WIDGETS;
    }
    // Groups always see the default layout for simplicity
    return DEFAULT_WIDGETS;
  }, [state.activeView, state.userData]);

  const educationProgress = useMemo(() => {
    if (state.activeView.type === 'user') {
        const userData = state.userData[state.activeView.id];
        return userData?.educationProgress ?? initialUserData.educationProgress!;
    }
    // Return default for groups as it's a personal journey
    return initialUserData.educationProgress!;
  }, [state.activeView, state.userData]);

  const alerts = useMemo(() => {
    const generatedAlerts: Alert[] = [];
    
    receipts.forEach(receipt => {
        if (receipt.cancellationReminder && receipt.cancellationNoticeMonths && receipt.autoRenews) {
            const dueDate = new Date(receipt.date);
            const reminderDate = new Date(dueDate);
            reminderDate.setMonth(dueDate.getMonth() - receipt.cancellationNoticeMonths);
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (today >= reminderDate && today < dueDate) {
                generatedAlerts.push({
                    id: `alert-receipt-${receipt.id}`,
                    type: 'cancellation_reminder',
                    message: `Recordatorio para cancelar tu recibo '${receipt.title}'.`,
                    date: receipt.date,
                    sourceId: receipt.id,
                    title: receipt.title,
                });
            }
        }
    });

    insurancePolicies.forEach(policy => {
        if (policy.cancellationReminder && policy.cancellationNoticeMonths) {
            const renewalDate = new Date(policy.renewalDate);
            const reminderDate = new Date(renewalDate);
            reminderDate.setMonth(renewalDate.getMonth() - policy.cancellationNoticeMonths);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (today >= reminderDate && today < renewalDate) {
                generatedAlerts.push({
                    id: `alert-insurance-${policy.id}`,
                    type: 'insurance_reminder',
                    message: `Tu seguro '${policy.name}' está próximo a renovarse.`,
                    date: policy.renewalDate,
                    sourceId: policy.id,
                    title: policy.name,
                });
            }
        }
    });

    return generatedAlerts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [receipts, insurancePolicies]);


  const modifyUserData = (userId: string, updater: (currentUserData: UserData) => UserData) => {
    setState(prev => {
        let currentData = prev.userData[userId];
        if (!currentData) {
            currentData = JSON.parse(JSON.stringify(initialUserData));
        } else {
            currentData = { ...initialUserData, ...currentData };
        }
        
        // Ensure new users get default widgets and education progress if they don't have them
        if(!currentData.dashboardWidgets) {
            currentData.dashboardWidgets = DEFAULT_WIDGETS;
        }
        if(!currentData.educationProgress) {
            currentData.educationProgress = initialUserData.educationProgress;
        }

        return {
          ...prev,
          userData: {
            ...prev.userData,
            [userId]: updater(currentData)
          }
        }
    });
  };
  
  const findOwnerId = (arrayKey: UserDataArrayKey, itemId: string): string | null => {
      for (const userId in state.userData) {
          const items = state.userData[userId][arrayKey];
          if (items && items.some(item => (item as {id:string}).id === itemId)) {
              return userId;
          }
      }
      return null;
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>, ownerId?: string) => {
    const targetUserId = ownerId || activeUserForModification.id;
    modifyUserData(targetUserId, d => ({ ...d, transactions: [...d.transactions, { ...transaction, id: crypto.randomUUID() }] }));
  };
  
  const updateTransaction = (transaction: Transaction) => {
      const ownerId = findOwnerId('transactions', transaction.id);
      if (!ownerId) return;
      modifyUserData(ownerId, d => ({
          ...d,
          transactions: d.transactions.map(t => t.id === transaction.id ? transaction : t),
      }));
  };
  
  const deleteTransaction = (transactionId: string) => {
      const ownerId = findOwnerId('transactions', transactionId);
      if (!ownerId) return;
      modifyUserData(ownerId, d => ({
          ...d,
          transactions: d.transactions.filter(t => t.id !== transactionId),
      }));
  };

  const addCredit = (credit: Omit<Credit, 'id'>, ownerId?: string) => {
    const targetUserId = ownerId || activeUserForModification.id;
    const newCreditId = crypto.randomUUID();
    const newCredit = { ...credit, id: newCreditId };

    const linkedTransaction: Omit<Transaction, 'id'> = {
        type: TransactionType.EXPENSE,
        category: 'Finanzas',
        subcategory: credit.subcategory,
        amount: credit.monthlyPayment,
        date: credit.startDate,
        description: `Cuota mensual: ${credit.name}`,
        frequency: 'monthly',
        creditId: newCreditId,
    };
    
    modifyUserData(targetUserId, d => {
        const newTransactions = [...d.transactions, { ...linkedTransaction, id: crypto.randomUUID() }];
        return {
            ...d,
            credits: [...d.credits, newCredit],
            transactions: newTransactions
        }
    });
  };

  const updateCredit = (credit: Credit) => {
      const ownerId = findOwnerId('credits', credit.id);
      if (!ownerId) return;

      modifyUserData(ownerId, d => {
          const newCredits = d.credits.map(c => c.id === credit.id ? credit : c);
          const newTransactions = d.transactions.map(t => {
              if (t.creditId === credit.id) {
                  return {
                      ...t,
                      amount: credit.monthlyPayment,
                      description: `Cuota mensual: ${credit.name}`,
                      subcategory: credit.subcategory
                  };
              }
              return t;
          });
          return { ...d, credits: newCredits, transactions: newTransactions };
      });
  };

  const deleteCredit = (creditId: string) => {
      const ownerId = findOwnerId('credits', creditId);
      if (!ownerId) return;
      modifyUserData(ownerId, d => {
          const newCredits = d.credits.filter(c => c.id !== creditId);
          const newTransactions = d.transactions.filter(t => t.creditId !== creditId);
          return { ...d, credits: newCredits, transactions: newTransactions };
      });
  };

  const addReceipt = (receipt: Omit<Receipt, 'id'>, ownerId?: string) => {
    const targetUserId = ownerId || activeUserForModification.id;
    modifyUserData(targetUserId, d => ({ ...d, receipts: [...d.receipts, { ...receipt, id: crypto.randomUUID() }] }));
  }
  
  const updateReceipt = (receipt: Receipt) => {
      const ownerId = findOwnerId('receipts', receipt.id);
      if (!ownerId) return;
      modifyUserData(ownerId, d => ({...d, receipts: d.receipts.map(r => r.id === receipt.id ? receipt : r)}));
  };

  const deleteReceipt = (receiptId: string) => {
      const ownerId = findOwnerId('receipts', receiptId);
      if (!ownerId) return;
      modifyUserData(ownerId, d => ({...d, receipts: d.receipts.filter(r => r.id !== receiptId)}));
  };

  const addInsurancePolicy = (policy: Omit<InsurancePolicy, 'id'>, ownerId?: string) => {
    const targetUserId = ownerId || activeUserForModification.id;
    const newPolicyId = crypto.randomUUID();
    const newPolicy = { ...policy, id: newPolicyId };

    const linkedTransaction: Omit<Transaction, 'id'> = {
        type: TransactionType.EXPENSE,
        category: 'Seguros',
        subcategory: policy.policyType,
        amount: policy.premium,
        date: policy.renewalDate,
        description: `Cuota seguro: ${policy.name}`,
        frequency: policy.paymentFrequency,
        insuranceId: newPolicyId,
    };
    
    modifyUserData(targetUserId, d => {
        const newTransactions = [...d.transactions, { ...linkedTransaction, id: crypto.randomUUID() }];
        return {
            ...d,
            insurancePolicies: [...d.insurancePolicies, newPolicy],
            transactions: newTransactions
        }
    });
  };
  
  const updateInsurancePolicy = (policy: InsurancePolicy) => {
      const ownerId = findOwnerId('insurancePolicies', policy.id);
      if (!ownerId) return;
      modifyUserData(ownerId, d => {
          const newPolicies = d.insurancePolicies.map(p => p.id === policy.id ? policy : p);
          const newTransactions = d.transactions.map(t => {
              if (t.insuranceId === policy.id) {
                  return {
                      ...t,
                      amount: policy.premium,
                      description: `Cuota seguro: ${policy.name}`,
                      subcategory: policy.policyType,
                      frequency: policy.paymentFrequency
                  };
              }
              return t;
          });
          return { ...d, insurancePolicies: newPolicies, transactions: newTransactions };
      });
  };

  const deleteInsurancePolicy = (policyId: string) => {
      const ownerId = findOwnerId('insurancePolicies', policyId);
      if (!ownerId) return;
      modifyUserData(ownerId, d => {
          const newPolicies = d.insurancePolicies.filter(p => p.id !== policyId);
          const newTransactions = d.transactions.filter(t => t.insuranceId !== policyId);
          return { ...d, insurancePolicies: newPolicies, transactions: newTransactions };
      });
  };

  const addGoal = (goal: Omit<Goal, 'id'>, ownerId?: string) => {
      const targetUserId = ownerId || activeUserForModification.id;
      modifyUserData(targetUserId, d => ({...d, goals: [...d.goals, {...goal, id: crypto.randomUUID() }]}));
  };
  
  const updateGoal = (goal: Goal) => {
      const ownerId = findOwnerId('goals', goal.id);
      if (!ownerId) return;
      modifyUserData(ownerId, d => ({...d, goals: d.goals.map(g => g.id === goal.id ? goal : g)}));
  };
  
  const deleteGoal = (goalId: string) => {
      const ownerId = findOwnerId('goals', goalId);
      if (!ownerId) return;
      modifyUserData(ownerId, d => ({...d, goals: d.goals.filter(g => g.id !== goalId)}));
  };

  const addFundsToGoal = (goalId: string, amount: number) => {
       const ownerId = findOwnerId('goals', goalId);
       if (!ownerId) return;
       modifyUserData(ownerId, d => {
           const newGoals = d.goals.map(g => {
               if (g.id === goalId) {
                   const newCurrentAmount = Math.min(g.currentAmount + amount, g.targetAmount);
                   return { ...g, currentAmount: newCurrentAmount };
               }
               return g;
           });
           return { ...d, goals: newGoals };
       });
  };
  
  const addBudget = (budget: Omit<Budget, 'id'>, ownerId?: string) => {
      const targetUserId = ownerId || activeUserForModification.id;
      modifyUserData(targetUserId, d => {
          const existingBudgetIndex = d.budgets.findIndex(b => b.category === budget.category);
          if (existingBudgetIndex > -1) {
              const newBudgets = [...d.budgets];
              newBudgets[existingBudgetIndex] = { ...newBudgets[existingBudgetIndex], amount: budget.amount };
              return { ...d, budgets: newBudgets };
          }
          return { ...d, budgets: [...d.budgets, { ...budget, id: crypto.randomUUID() }] };
      });
  };

  const updateBudget = (budget: Budget) => {
      const ownerId = findOwnerId('budgets', budget.id);
      if (!ownerId) return;
      modifyUserData(ownerId, d => ({ ...d, budgets: d.budgets.map(b => b.id === budget.id ? budget : b) }));
  };

  const deleteBudget = (budgetId: string) => {
      const ownerId = findOwnerId('budgets', budgetId);
      if (!ownerId) return;
      modifyUserData(ownerId, d => ({ ...d, budgets: d.budgets.filter(b => b.id !== budgetId) }));
  };

  const updateDashboardWidgets = (widgets: WidgetConfig[]) => {
      if (state.activeView.type !== 'user') return;
      const userId = state.activeView.id;
      modifyUserData(userId, d => ({ ...d, dashboardWidgets: widgets }));
  };

  const updateCreditToxicity = (creditId: string, report: ToxicityReport) => {
      const ownerId = findOwnerId('credits', creditId);
      if(!ownerId) return;
      modifyUserData(ownerId, d => {
        const newCredits = d.credits.map(c => {
          if (c.id === creditId) {
            return { ...c, toxicityReport: report };
          }
          return c;
        });
        return { ...d, credits: newCredits };
      });
  };
  
  const deleteCreditToxicity = (creditId: string) => {
      const ownerId = findOwnerId('credits', creditId);
      if(!ownerId) return;
      modifyUserData(ownerId, d => {
        const newCredits = d.credits.map(c => {
          if (c.id === creditId) {
            const { toxicityReport, ...restOfCredit } = c;
            return restOfCredit;
          }
          return c;
        });
        return { ...d, credits: newCredits };
      });
  };

  const addUser = (name: string) => {
    const newUser: User = { id: crypto.randomUUID(), name };
    setState(prev => ({
      ...prev,
      users: [...prev.users, newUser],
      userData: {
        ...prev.userData,
        [newUser.id]: JSON.parse(JSON.stringify(initialUserData))
      },
      activeView: { type: 'user', id: newUser.id },
    }));
  };
  
  const switchView = (view: ActiveView) => {
    setState(prev => ({ ...prev, activeView: view }));
  };

  const updateUser = (userId: string, name: string) => {
      setState(prev => ({
          ...prev,
          users: prev.users.map(u => u.id === userId ? { ...u, name } : u)
      }));
  };
  
  const addGroup = (name: string, userIds: string[]) => {
      const newGroup: Group = { id: crypto.randomUUID(), name, userIds };
      setState(prev => ({
          ...prev,
          groups: [...prev.groups, newGroup]
      }));
  };

  const updateGroup = (groupId: string, name: string, userIds: string[]) => {
      setState(prev => ({
          ...prev,
          groups: prev.groups.map(g => g.id === groupId ? { ...g, name, userIds } : g)
      }));
  };
  
  const deleteGroup = (groupId: string) => {
      setState(prev => {
          const newGroups = prev.groups.filter(g => g.id !== groupId);
          let newActiveView = prev.activeView;
          if (prev.activeView.type === 'group' && prev.activeView.id === groupId) {
              newActiveView = { type: 'user', id: prev.users[0]?.id };
          }
          return { ...prev, groups: newGroups, activeView: newActiveView };
      });
  };

  const addIncomeCategory = (category: string) => {
      modifyUserData(activeUserForModification.id, d => ({
          ...d,
          incomeCategories: [...new Set([...(d.incomeCategories ?? []), category])]
      }));
  };

  const addExpenseCategory = (category: string) => {
      modifyUserData(activeUserForModification.id, d => ({
          ...d,
          expenseCategories: [...new Set([...(d.expenseCategories ?? []), category])]
      }));
  };
  
  const addExpenseSubcategory = (category: string, subcategory: string) => {
      modifyUserData(activeUserForModification.id, d => {
          const existingSubcategories = d.expenseSubcategories?.[category] ?? [];
          const newSubcategories = {
              ...d.expenseSubcategories,
              [category]: [...new Set([...existingSubcategories, subcategory])]
          };
          return { ...d, expenseSubcategories: newSubcategories };
      });
  };

  const addInvoiceCategory = (category: string, ownerId: string) => {
        modifyUserData(ownerId, d => ({
            ...d,
            invoiceCategories: [...new Set([...(d.invoiceCategories ?? []), category])]
        }));
    };

    const addInsuranceSubcategory = (policyType: InsurancePolicyType, subcategory: string) => {
        modifyUserData(activeUserForModification.id, d => {
            const existing = d.insuranceSubcategories?.[policyType] ?? [];
            const updated = { ...d.insuranceSubcategories, [policyType]: [...new Set([...existing, subcategory])] };
            return { ...d, insuranceSubcategories: updated };
        });
    };

    const updateInsuranceSubcategory = (policyType: InsurancePolicyType, oldName: string, newName: string) => {
        modifyUserData(activeUserForModification.id, d => {
            const list = (d.insuranceSubcategories?.[policyType] ?? []).map(s => s === oldName ? newName : s);
            const subcats = { ...d.insuranceSubcategories, [policyType]: [...new Set(list)] };
            const policies = d.insurancePolicies.map(p => (p.policyType === policyType && p.subcategory === oldName) ? { ...p, subcategory: newName } : p);
            return { ...d, insuranceSubcategories: subcats, insurancePolicies: policies };
        });
    };

    const deleteInsuranceSubcategory = (policyType: InsurancePolicyType, subcategory: string) => {
        modifyUserData(activeUserForModification.id, d => {
            const list = (d.insuranceSubcategories?.[policyType] ?? []).filter(s => s !== subcategory);
            const subcats = { ...d.insuranceSubcategories, [policyType]: list };
            const policies = d.insurancePolicies.map(p => {
                if (p.policyType === policyType && p.subcategory === subcategory) {
                    const { subcategory: _, ...rest } = p;
                    return rest;
                }
                return p;
            });
            return { ...d, insuranceSubcategories: subcats, insurancePolicies: policies };
        });
    };
    
    const addSavedTaxReturn = (returnData: Omit<SavedTaxReturn, 'id' | 'dateSaved'>) => {
        const newReturn: SavedTaxReturn = {
            ...returnData,
            id: crypto.randomUUID(),
            dateSaved: new Date().toISOString(),
        };
        modifyUserData(activeUserForModification.id, d => ({
            ...d,
            savedTaxReturns: [...(d.savedTaxReturns ?? []), newReturn]
        }));
    };
    
    const deleteSavedTaxReturn = (returnId: string) => {
        const ownerId = findOwnerId('savedTaxReturns', returnId);
        if (!ownerId) return;
        modifyUserData(ownerId, d => ({
            ...d,
            savedTaxReturns: d.savedTaxReturns?.filter(r => r.id !== returnId) ?? [],
        }));
    };

    const updateEducationProgress = (progressUpdate: Partial<EducationProgress>) => {
        if (state.activeView.type !== 'user') return;
        const userId = state.activeView.id;
        modifyUserData(userId, d => {
            const currentProgress = d.educationProgress ?? initialUserData.educationProgress!;
            const newProgress = { ...currentProgress, ...progressUpdate };
            // Deep merge for checklistStates if needed
            if (progressUpdate.checklistStates) {
                newProgress.checklistStates = { ...currentProgress.checklistStates, ...progressUpdate.checklistStates };
            }
            return { ...d, educationProgress: newProgress };
        });
    };


  const contextValue: AppContextType = {
    users: state.users,
    groups: state.groups,
    activeView: state.activeView,
    activeViewTarget,
    groupMembers,
    transactions,
    credits,
    receipts,
    insurancePolicies,
    goals,
    budgets,
    dashboardWidgets,
    alerts,
    incomeCategories,
    expenseCategories,
    expenseSubcategories,
    invoiceCategories,
    insuranceSubcategories,
    savedTaxReturns,
    educationProgress,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCredit,
    updateCredit,
    deleteCredit,
    addReceipt,
    updateReceipt,
    deleteReceipt,
    addInsurancePolicy,
    updateInsurancePolicy,
    deleteInsurancePolicy,
    addGoal,
    updateGoal,
    deleteGoal,
    addFundsToGoal,
    addBudget,
    updateBudget,
    deleteBudget,
    updateDashboardWidgets,
    updateCreditToxicity,
    deleteCreditToxicity,
    addUser,
    updateUser,
    switchView,
    addGroup,
    updateGroup,
    deleteGroup,
    addIncomeCategory,
    addExpenseCategory,
    addExpenseSubcategory,
    addInvoiceCategory,
    addInsuranceSubcategory,
    updateInsuranceSubcategory,
    deleteInsuranceSubcategory,
    addSavedTaxReturn,
    deleteSavedTaxReturn,
    updateEducationProgress,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
