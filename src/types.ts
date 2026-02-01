
// Fix: Updated types to support reconciliation logic and resolved missing MonthStatus export
export type PaymentStatus = 'PAID' | 'UNPAID' | 'MANUAL_PAID';

export interface MonthStatus {
  month: number; // 1-12
  year: number;
  status: PaymentStatus;
  paymentDates: string[];
  amount?: number;
  source?: 'ai' | 'manual';
}

export interface Client {
  id: string;
  name: string;
  startDate: string; // YYYY-MM
  expectedAmount: number;
  months: MonthStatus[];
  progress: number; // 0-100
}

export interface SummaryStats {
  totalClients: number;
  totalPaid: number;
  openMonths: number;
}

// Keeping potentially used types from the original src/types.ts
export interface ClientPayment {
  month: string; // ISO Month e.g. "2024-03"
  day?: string;   // ISO Date e.g. "2024-03-15"
  status: string;
  amount: number;
  transactionId?: string;
}

export interface ReconciliationResult {
  matches: Array<{
    clientName: string;
    amount: number;
    transactionDate: string;
    confidence: number;
    month: string;
  }>;
  unmatchedBilling: string[];
  unmatchedBank: Array<{
    description: string;
    amount: number;
    date: string;
  }>;
}

export interface VehicleData {
  placa: string;
  marca: string;
  modelo: string;
  imei: string[];
}

export interface ServiceOrderField {
  label: string;
  value: any;
  type?: string;
}

export interface ServiceOrder {
  id: string;
  date: string;
  clientName: string;
  totalValue: number;
  status: 'completed' | 'pending';
  vehicle: {
    placa: string;
    modelo: string;
    marca: string;
  };
  templateName: string;
  fields: ServiceOrderField[];
}
