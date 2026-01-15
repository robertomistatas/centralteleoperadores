/*
 * Canonical metrics contract for deterministic calculations.
 */

export type TemporalStatus = 'upToDate' | 'pending' | 'urgent';

export interface CallRecord {
  id?: string;
  operatorId?: string;
  operatorEmail?: string;
  emailOperador?: string;
  email?: string;
  operatorName?: string;
  operatorKey?: string;
  beneficiaryId?: string;
  beneficiaryName?: string;
  date?: string;
  fecha?: string;
  durationMinutes?: number;
  duracion?: number;
  result?: string;
  resultado?: string;
}

export interface BeneficiaryAssignment {
  id?: string;
  beneficiaryId?: string;
  beneficiaryName?: string;
  operatorId?: string;
  operatorEmail?: string;
  operatorName?: string;
  assignedAt?: string;
  commune?: string;
  phone?: string;
}

export interface CallMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  unresolvedCalls?: number;
  successRate: number;
  effectiveMinutes: number;
  avgMinutesPerCall: number;
}

export interface BeneficiaryMetrics {
  assignedBeneficiaries: number;
  contactedBeneficiaries: number;
  uncontactedBeneficiaries: number;
  coverageRate: number;
}

export interface TemporalStateMetrics {
  upToDate: number;
  pending: number;
  urgent: number;
}

export interface TimeSeriesPoint {
  date: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
}

export interface BeneficiaryStatus {
  beneficiaryId?: string;
  beneficiaryName?: string;
  operatorId?: string;
  operatorKey?: string;
  status: TemporalStatus;
  lastSuccessfulCall: string | null;
  daysSinceLastSuccess: number | null;
  callCount: number;
  successfulCallCount: number;
}

export interface HistoryMetricsSnapshot {
  timeSeries: TimeSeriesPoint[];
  beneficiaryStatuses: BeneficiaryStatus[];
  referenceDate: Date;
}

export interface OperatorMetricsSnapshot {
  operatorId: string;
  operatorKey: string;
  displayName?: string;
  email?: string;
  calls: CallMetrics;
  beneficiaries: BeneficiaryMetrics;
  temporal: TemporalStateMetrics;
  history: HistoryMetricsSnapshot;
  referenceDate: Date;
}

export interface GlobalMetricsSnapshot {
  calls: CallMetrics;
  beneficiaries: BeneficiaryMetrics;
  temporal: TemporalStateMetrics;
  perOperator: Record<string, OperatorMetricsSnapshot>;
  history: HistoryMetricsSnapshot;
  referenceDate: Date;
}

export const metricsContract = {
  calls: {
    totalCalls: {
      label: 'Total de llamadas',
      formula: 'Conteo de registros normalizados',
      key: 'totalCalls'
    },
    successfulCalls: {
      label: 'Llamadas exitosas',
      formula: 'Resultado = exitosa',
      key: 'successfulCalls'
    },
    failedCalls: {
      label: 'Llamadas fallidas',
      formula: 'Resultado = fallida',
      key: 'failedCalls'
    },
    unresolvedCalls: {
      label: 'Llamadas no identificadas',
      formula: 'Eventos sin beneficiario resoluble (AMAIA o Asignaciones)',
      key: 'unresolvedCalls'
    },
    successRate: {
      label: 'Tasa de éxito',
      formula: 'successfulCalls / totalCalls',
      key: 'successRate'
    },
    effectiveMinutes: {
      label: 'Minutos efectivos',
      formula: 'Suma de duraciones con resultado exitosa',
      key: 'effectiveMinutes'
    },
    avgMinutesPerCall: {
      label: 'Minutos promedio por llamada',
      formula: 'Suma de duraciones / totalCalls',
      key: 'avgMinutesPerCall'
    }
  },
  beneficiaries: {
    assignedBeneficiaries: {
      label: 'Beneficiarios asignados',
      formula: 'Conteo de asignaciones activas',
      key: 'assignedBeneficiaries'
    },
    contactedBeneficiaries: {
      label: 'Beneficiarios contactados',
      formula: 'Beneficiarios asignados con al menos una llamada',
      key: 'contactedBeneficiaries'
    },
    uncontactedBeneficiaries: {
      label: 'Beneficiarios sin contacto',
      formula: 'assignedBeneficiaries - contactedBeneficiaries',
      key: 'uncontactedBeneficiaries'
    },
    coverageRate: {
      label: 'Cobertura',
      formula: 'contactedBeneficiaries / assignedBeneficiaries',
      key: 'coverageRate'
    }
  },
  temporal: {
    upToDate: {
      label: 'Al día',
      formula: '<= 15 días desde última exitosa',
      key: 'upToDate'
    },
    pending: {
      label: 'Pendiente',
      formula: '16-30 días desde última exitosa',
      key: 'pending'
    },
    urgent: {
      label: 'Urgente',
      formula: '> 30 días sin exitosa o sin llamadas',
      key: 'urgent'
    }
  }
};

export type MetricKey =
  | keyof typeof metricsContract.calls
  | keyof typeof metricsContract.beneficiaries
  | keyof typeof metricsContract.temporal;

export const METRIC_KEYS: MetricKey[] = [
  'totalCalls',
  'successfulCalls',
  'failedCalls',
  'unresolvedCalls',
  'successRate',
  'effectiveMinutes',
  'avgMinutesPerCall',
  'assignedBeneficiaries',
  'contactedBeneficiaries',
  'uncontactedBeneficiaries',
  'coverageRate',
  'upToDate',
  'pending',
  'urgent'
];

export default metricsContract;
