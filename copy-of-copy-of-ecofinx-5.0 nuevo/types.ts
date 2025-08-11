


export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  SAVING = 'saving',
}

export type CreditSubcategory = 'Financiación' | 'Tarjeta' | 'Hipoteca' | 'Préstamo';

export type InsurancePolicyType = 'Coche' | 'Hogar' | 'Vida' | 'Salud' | 'Otros';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  subcategory?: string;
  amount: number;
  date: string;
  description: string;
  frequency?: ReceiptFrequency;
  creditId?: string;
  insuranceId?: string;
}

export interface Credit {
  id: string;
  name: string;
  totalAmount: number;
  monthlyPayment: number;
  tin: number; // Tipo de Interés Nominal
  tae: number; // Tasa Anual Equivalente
  startDate: string;
  endDate: string;
  subcategory: CreditSubcategory;
  toxicityReport?: ToxicityReport;
}

export interface ToxicityReport {
  score: number;
  explanation: string;
}

export enum ReceiptType {
  RECEIPT = 'receipt', // For recurring payments like insurance, subscriptions
  INVOICE = 'invoice', // For one-time bills to be saved for taxes etc.
}

export type ReceiptFrequency = 'monthly' | 'quarterly' | 'semiannually' | 'annually';

export interface Receipt {
  id: string;
  type: ReceiptType;
  title: string;
  amount: number;
  date: string; // For INVOICE: issue date. For RECEIPT: next due date.
  description: string;
  contractFile?: string;
  contractFileData?: string;
  invoiceCategory?: string;
  isTaxDeductible?: boolean;

  // Fields for recurring receipts
  frequency?: ReceiptFrequency;
  autoRenews?: boolean;
  prorateOverMonths?: number; // For annual receipts to be budgeted monthly
  cancellationReminder?: boolean;
  cancellationNoticeMonths?: number;
}

export interface InsurancePolicy {
  id: string;
  name: string;
  policyType: InsurancePolicyType;
  subcategory?: string;
  premium: number;
  paymentFrequency: ReceiptFrequency;
  renewalDate: string;
  cancellationReminder: boolean;
  cancellationNoticeMonths?: number;
  contractFile?: string;
  contractFileData?: string;
}

export interface Alert {
    id: string;
    type: 'cancellation_reminder' | 'insurance_reminder';
    message: string;
    date: string; // due date of the receipt/policy
    sourceId: string; // receipt or insurance id
    title: string;
}


export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

export interface Budget {
    id: string;
    category: string;
    amount: number;
    period: 'monthly'; // For now, only monthly budgets are supported
}

export enum WidgetType {
    AI_SUMMARY = 'AI_SUMMARY',
    SUMMARY_CARDS = 'SUMMARY_CARDS',
    FINANCIAL_TRENDS = 'FINANCIAL_TRENDS',
    BUDGET_STATUS = 'BUDGET_STATUS',
    ALERTS = 'ALERTS',
    GOALS = 'GOALS',
    ANNUAL_RECEIPTS = 'ANNUAL_RECEIPTS',
}

export interface WidgetConfig {
    id: WidgetType;
    type: WidgetType;
}

export interface User {
    id:string;
    name: string;
}

export interface Group {
    id: string;
    name: string;
    userIds: string[];
}

export interface ScannedReceiptData {
    amount?: number;
    date?: string; // YYYY-MM-DD
    description?: string;
    category?: string;
}

export interface UserData {
    transactions: Transaction[];
    credits: Credit[];
    receipts: Receipt[];
    insurancePolicies: InsurancePolicy[];
    goals: Goal[];
    budgets: Budget[];
    dashboardWidgets?: WidgetConfig[];
    incomeCategories?: string[];
    expenseCategories?: string[];
    expenseSubcategories?: Record<string, string[]>;
    invoiceCategories?: string[];
    insuranceSubcategories?: Record<string, string[]>;
    savedTaxReturns?: SavedTaxReturn[];
    educationProgress?: EducationProgress;
}

export type ActiveView = { type: 'user', id: string } | { type: 'group', id: string };

export interface AppState {
    users: User[];
    groups: Group[];
    activeView: ActiveView;
    userData: Record<string, UserData>;
}

export interface AppContextType {
    // State properties
    users: User[];
    groups: Group[];
    activeView: ActiveView;
    activeViewTarget: User | Group | null;
    groupMembers: User[];
    
    // Derived data for the active view
    transactions: Transaction[];
    credits: Credit[];
    receipts: Receipt[];
    insurancePolicies: InsurancePolicy[];
    goals: Goal[];
    budgets: Budget[];
    dashboardWidgets: WidgetConfig[];
    alerts: Alert[];
    incomeCategories: string[];
    expenseCategories: string[];
    expenseSubcategories: Record<string, string[]>;
    invoiceCategories: string[];
    insuranceSubcategories: Record<string, string[]>;
    savedTaxReturns: SavedTaxReturn[];
    educationProgress: EducationProgress;

    // Data Actions
    addTransaction: (transaction: Omit<Transaction, 'id'>, ownerId?: string) => void;
    updateTransaction: (transaction: Transaction) => void;
    deleteTransaction: (transactionId: string) => void;
    
    addCredit: (credit: Omit<Credit, 'id'>, ownerId?: string) => void;
    updateCredit: (credit: Credit) => void;
    deleteCredit: (creditId: string) => void;
    
    addReceipt: (receipt: Omit<Receipt, 'id'>, ownerId?: string) => void;
    updateReceipt: (receipt: Receipt) => void;
    deleteReceipt: (receiptId: string) => void;
    
    addInsurancePolicy: (policy: Omit<InsurancePolicy, 'id'>, ownerId?: string) => void;
    updateInsurancePolicy: (policy: InsurancePolicy) => void;
    deleteInsurancePolicy: (policyId: string) => void;

    addGoal: (goal: Omit<Goal, 'id'>, ownerId?: string) => void;
    updateGoal: (goal: Goal) => void;
    deleteGoal: (goalId: string) => void;
    addFundsToGoal: (goalId: string, amount: number) => void;
    
    addBudget: (budget: Omit<Budget, 'id'>, ownerId?: string) => void;
    updateBudget: (budget: Budget) => void;
    deleteBudget: (budgetId: string) => void;
    
    updateDashboardWidgets: (widgets: WidgetConfig[]) => void;

    updateCreditToxicity: (creditId: string, report: ToxicityReport) => void;
    deleteCreditToxicity: (creditId: string) => void;
    
    // User & Group Management
    addUser: (name: string) => void;
    updateUser: (userId: string, name:string) => void;
    switchView: (view: ActiveView) => void;
    addGroup: (name: string, userIds: string[]) => void;
    updateGroup: (groupId: string, name: string, userIds: string[]) => void;
    deleteGroup: (groupId: string) => void;

    // Category Management
    addIncomeCategory: (category: string) => void;
    addExpenseCategory: (category: string) => void;
    addExpenseSubcategory: (category: string, subcategory: string) => void;
    addInvoiceCategory: (category: string, ownerId: string) => void;
    addInsuranceSubcategory: (policyType: InsurancePolicyType, subcategory: string) => void;
    updateInsuranceSubcategory: (policyType: InsurancePolicyType, oldName: string, newName: string) => void;
    deleteInsuranceSubcategory: (policyType: InsurancePolicyType, subcategory: string) => void;
    
    // Taxation Management
    addSavedTaxReturn: (returnData: Omit<SavedTaxReturn, 'id' | 'dateSaved'>) => void;
    deleteSavedTaxReturn: (returnId: string) => void;
    
    // Education Management
    updateEducationProgress: (progress: Partial<EducationProgress>) => void;
}

// --- Taxation Module Types ---

export interface TaxDraftData {
  grossIncome: number;
  withholdings: number;
  socialSecurity: number;
  draftResult: number; // Positive if to pay, negative if to be returned
}

export interface RentedProperty {
    id: string;
    name: string;
    income: number;
    expenses: number;
}

export interface TaxQuestionnaire {
  // A
  personal_civilStatus: 'single' | 'married' | 'widowed' | 'divorced';
  personal_autonomousCommunity: string;
  personal_hasChildren: boolean;
  personal_childrenCount: number;
  personal_childrenDisability: boolean;
  personal_childrenDisabilityGrade: number;
  personal_isLargeFamily: 'none' | 'general' | 'special';
  personal_hasAscendants: boolean;
  personal_ascendantsDisability: boolean;
  personal_ascendantsDisabilityGrade: number;
  // B
  housing_isOwner: boolean;
  housing_isRenter: boolean;
  housing_mortgage_boughtBefore2013: boolean;
  housing_mortgage_paidAmount: number;
  housing_rent_contractDate: string;
  housing_rent_paidAmount: number;
  housing_efficiencyImprovements: boolean;
  housing_efficiencyAmount: number;
  // C
  rented_properties: RentedProperty[];
  // D
  care_daycareExpenses: number;
  care_educationExpenses: number;
  // E
  work_isAutonomous: boolean;
  work_autonomousIncome: number;
  work_autonomousExpenses: number;
  work_pensionPlanContributions: number;
  work_investmentGainsLosses: number;
  // F
  donations_ngo: number;
  donations_unionDues: number;
  donations_privateHealthInsurance: number;
  // G
  regional_gymFee: number;
  regional_birthAdoption: number;
  regional_publicTransport: number;
}

export interface TaxDeduction {
  description: string;
  amount: number; // The amount of the expense/contribution
  impactOnResult: number; // The calculated impact on the final tax payment
}

export interface TaxCalculationResult {
  draftResult: number;
  adjustedResult: number;
  advice: string;
  deductions: TaxDeduction[];
}

export interface SavedTaxReturn {
    id: string;
    year: number;
    fileName: string;
    pdfData: string;
    calculationResult: TaxCalculationResult;
    dateSaved: string;
}

// --- AI Chat Assistant Types ---
export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    isLoading?: boolean;
}

// --- Education Module Types ---

export interface EducationMilestone {
    id: string;
    text: string;
    date: string;
}

export interface EducationProgress {
    // The highest level the user has *finished*. Starts at 0.
    // Finishing level 1 sets this to 1, unlocking level 2.
    completedLevel: number; 
    
    // Tracks state of individual checklist items within a level
    checklistStates: {
        [level: number]: boolean[];
    };
    milestones: EducationMilestone[];
}
