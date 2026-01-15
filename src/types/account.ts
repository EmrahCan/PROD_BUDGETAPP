export interface Account {
  id: string;
  name: string;
  bankId: string;
  accountNumber?: string;
  iban?: string;
  balance: number;
  currency: string;
  type: 'checking' | 'savings';
  createdAt: Date;
}

export interface CreditCard {
  id: string;
  name: string;
  bankId: string;
  lastFourDigits: string;
  limit: number;
  balance: number;
  currency: string;
  dueDate: number; // day of month
  createdAt: Date;
}

export interface Transaction {
  id: string;
  accountId?: string;
  cardId?: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: Date;
  createdAt: Date;
}

export const TRANSACTION_CATEGORIES = {
  income: [
    { id: 'salary', label: 'Maaş', icon: '💰' },
    { id: 'bonus', label: 'İkramiye', icon: '🎁' },
    { id: 'investment', label: 'Yatırım', icon: '📈' },
    { id: 'freelance', label: 'Serbest Çalışma', icon: '💼' },
    { id: 'other_income', label: 'Diğer Gelir', icon: '💵' },
  ],
  expense: [
    { id: 'food', label: 'Yemek', icon: '🍽️' },
    { id: 'transport', label: 'Ulaşım', icon: '🚗' },
    { id: 'shopping', label: 'Alışveriş', icon: '🛒' },
    { id: 'bills', label: 'Faturalar', icon: '📃' },
    { id: 'entertainment', label: 'Eğlence', icon: '🎬' },
    { id: 'health', label: 'Sağlık', icon: '🏥' },
    { id: 'education', label: 'Eğitim', icon: '📚' },
    { id: 'rent', label: 'Kira', icon: '🏠' },
    { id: 'other_expense', label: 'Diğer Gider', icon: '💳' },
  ],
} as const;
