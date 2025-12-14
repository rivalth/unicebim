/**
 * Payment Feasibility Analysis
 * 
 * Analyzes whether upcoming payments can be covered based on:
 * - Current balance
 * - Projected income until due date
 * - Current spending trend
 * - Days until payment is due
 */

export type PaymentAnalysisInput = {
  /**
   * Current available balance (total income - total expenses for the month)
   */
  currentBalance: number;
  /**
   * Total amount of unpaid upcoming payments
   */
  totalUnpaidPayments: number;
  /**
   * Average daily expense for the current month
   */
  averageDailyExpense: number;
  /**
   * Days remaining in the current month
   */
  daysRemainingInMonth: number;
  /**
   * Next income date (if known)
   */
  nextIncomeDate: Date | null;
  /**
   * Expected income amount (if known)
   */
  expectedIncomeAmount: number | null;
  /**
   * Current date (defaults to now)
   */
  now?: Date;
};

export type PaymentAnalysisResult = {
  /**
   * Whether the payment can be covered with current balance
   */
  canCoverWithCurrentBalance: boolean;
  /**
   * Whether the payment can be covered if spending continues at current rate
   */
  canCoverWithCurrentTrend: boolean;
  /**
   * Whether the payment can be covered if income arrives before due date
   */
  canCoverWithExpectedIncome: boolean;
  /**
   * Projected balance on payment due date (if spending continues at current rate)
   */
  projectedBalanceOnDueDate: number;
  /**
   * Recommended daily spending limit to ensure payment can be made
   */
  recommendedDailySpendingLimit: number;
  /**
   * Days until payment is due
   */
  daysUntilDue: number;
  /**
   * Warning level: 'none' | 'low' | 'medium' | 'high' | 'critical'
   */
  warningLevel: "none" | "low" | "medium" | "high" | "critical";
  /**
   * Warning message to display to user
   */
  warningMessage: string | null;
};

/**
 * Calculate payment feasibility analysis for a single payment
 */
export function analyzePaymentFeasibility(
  payment: {
    amount: number;
    due_date: Date;
  },
  input: PaymentAnalysisInput,
): PaymentAnalysisResult {
  const now = input.now ?? new Date();
  const dueDate = new Date(payment.due_date);
  dueDate.setHours(0, 0, 0, 0);
  
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  const daysUntilDue = Math.max(0, Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Calculate projected balance if spending continues at current rate
  const daysToProject = Math.min(daysUntilDue, input.daysRemainingInMonth);
  const projectedExpense = input.averageDailyExpense * daysToProject;
  const projectedBalanceOnDueDate = input.currentBalance - projectedExpense;
  
  // Check if can cover with current balance
  const canCoverWithCurrentBalance = input.currentBalance >= payment.amount;
  
  // Check if can cover with current trend
  const canCoverWithCurrentTrend = projectedBalanceOnDueDate >= payment.amount;
  
  // Check if income will arrive before due date
  let canCoverWithExpectedIncome = false;
  if (input.nextIncomeDate && input.expectedIncomeAmount) {
    const incomeDate = new Date(input.nextIncomeDate);
    incomeDate.setHours(0, 0, 0, 0);
    const incomeArrivesBeforeDue = incomeDate <= dueDate;
    const balanceAfterIncome = input.currentBalance + input.expectedIncomeAmount - projectedExpense;
    canCoverWithExpectedIncome = incomeArrivesBeforeDue && balanceAfterIncome >= payment.amount;
  }
  
  // Calculate recommended daily spending limit
  // Formula: (currentBalance - paymentAmount) / daysUntilDue
  const recommendedDailySpendingLimit = daysUntilDue > 0
    ? Math.max(0, (input.currentBalance - payment.amount) / daysUntilDue)
    : 0;
  
  // Determine warning level
  let warningLevel: PaymentAnalysisResult["warningLevel"] = "none";
  let warningMessage: string | null = null;
  
  if (daysUntilDue === 0) {
    // Payment is due today
    if (!canCoverWithCurrentBalance) {
      warningLevel = "critical";
      warningMessage = `Bugün ödemeniz gereken ${payment.amount.toFixed(2)} ₺ tutarındaki ödemeyi karşılayamıyorsunuz.`;
    }
  } else if (daysUntilDue <= 3) {
    // Payment due in 3 days or less
    if (!canCoverWithCurrentBalance && !canCoverWithExpectedIncome) {
      warningLevel = "critical";
      warningMessage = `${daysUntilDue} gün sonra ${payment.amount.toFixed(2)} ₺ ödemeniz var. Mevcut bakiyeniz yetersiz.`;
    } else if (!canCoverWithCurrentTrend) {
      warningLevel = "high";
      warningMessage = `${daysUntilDue} gün sonra ${payment.amount.toFixed(2)} ₺ ödemeniz var. Mevcut harcama trendinizle ödemeyi karşılayamayabilirsiniz.`;
    }
  } else if (daysUntilDue <= 7) {
    // Payment due in a week
    if (!canCoverWithCurrentTrend && !canCoverWithExpectedIncome) {
      warningLevel = "high";
      warningMessage = `${daysUntilDue} gün sonra ${payment.amount.toFixed(2)} ₺ ödemeniz var. Harcamalarınızı kontrol etmeniz gerekiyor.`;
    } else if (projectedBalanceOnDueDate < payment.amount * 1.1) {
      // Less than 10% buffer
      warningLevel = "medium";
      warningMessage = `${daysUntilDue} gün sonra ${payment.amount.toFixed(2)} ₺ ödemeniz var. Harcamalarınıza dikkat edin.`;
    }
  } else {
    // Payment due in more than a week
    if (!canCoverWithCurrentTrend && !canCoverWithExpectedIncome) {
      warningLevel = "medium";
      warningMessage = `${daysUntilDue} gün sonra ${payment.amount.toFixed(2)} ₺ ödemeniz var. Planlamanızı gözden geçirin.`;
    } else if (projectedBalanceOnDueDate < payment.amount * 1.2) {
      // Less than 20% buffer
      warningLevel = "low";
      warningMessage = `${daysUntilDue} gün sonra ${payment.amount.toFixed(2)} ₺ ödemeniz var.`;
    }
  }
  
  return {
    canCoverWithCurrentBalance,
    canCoverWithCurrentTrend,
    canCoverWithExpectedIncome,
    projectedBalanceOnDueDate,
    recommendedDailySpendingLimit,
    daysUntilDue,
    warningLevel,
    warningMessage,
  };
}

/**
 * Analyze multiple upcoming payments and return overall analysis
 */
export function analyzeMultiplePayments(
  payments: Array<{ amount: number; due_date: Date }>,
  input: PaymentAnalysisInput,
): {
  individualAnalyses: Array<PaymentAnalysisResult & { payment: { amount: number; due_date: Date } }>;
  overallWarningLevel: PaymentAnalysisResult["warningLevel"];
  overallWarningMessage: string | null;
  totalAmountDue: number;
  earliestDueDate: Date | null;
} {
  if (payments.length === 0) {
    return {
      individualAnalyses: [],
      overallWarningLevel: "none",
      overallWarningMessage: null,
      totalAmountDue: 0,
      earliestDueDate: null,
    };
  }
  
  const individualAnalyses = payments.map((payment) => ({
    ...analyzePaymentFeasibility(payment, input),
    payment,
  }));
  
  // Find highest warning level
  const warningLevels: Array<PaymentAnalysisResult["warningLevel"]> = ["none", "low", "medium", "high", "critical"];
  const overallWarningLevel = individualAnalyses.reduce((max, analysis) => {
    const maxIndex = warningLevels.indexOf(max);
    const currentIndex = warningLevels.indexOf(analysis.warningLevel);
    return currentIndex > maxIndex ? analysis.warningLevel : max;
  }, "none" as PaymentAnalysisResult["warningLevel"]);
  
  // Generate overall warning message
  const totalAmountDue = payments.reduce((sum, p) => sum + p.amount, 0);
  const earliestDueDate = payments.reduce((earliest, p) => {
    const dueDate = new Date(p.due_date);
    return !earliest || dueDate < earliest ? dueDate : earliest;
  }, null as Date | null);
  
  let overallWarningMessage: string | null = null;
  
  if (overallWarningLevel === "critical") {
    overallWarningMessage = `Toplam ${totalAmountDue.toFixed(2)} ₺ tutarında ödemeniz var ve bunları karşılayamayabilirsiniz. Acil önlem alın.`;
  } else if (overallWarningLevel === "high") {
    overallWarningMessage = `Toplam ${totalAmountDue.toFixed(2)} ₺ tutarında ödemeniz var. Harcamalarınızı kontrol etmeniz gerekiyor.`;
  } else if (overallWarningLevel === "medium") {
    overallWarningMessage = `Toplam ${totalAmountDue.toFixed(2)} ₺ tutarında ödemeniz var. Planlamanızı gözden geçirin.`;
  } else if (overallWarningLevel === "low") {
    overallWarningMessage = `Toplam ${totalAmountDue.toFixed(2)} ₺ tutarında ödemeniz var.`;
  }
  
  return {
    individualAnalyses,
    overallWarningLevel,
    overallWarningMessage,
    totalAmountDue,
    earliestDueDate,
  };
}

