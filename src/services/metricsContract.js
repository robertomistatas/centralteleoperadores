/**
 * Canonical metrics contract.
 * Single source of truth for KPI names, formulas, and data sources.
 */

export const METRICS_CONTRACT = {
  totalCalls: {
    label: 'Total de llamadas',
    formula: 'Conteo de registros normalizados dentro del rango indicado',
    source: 'callData + seguimientos (normalizados)'
  },
  successfulCalls: {
    label: 'Llamadas exitosas',
    formula: 'Conteo donde resultado = exitosa',
    source: 'callData + seguimientos (normalizados)'
  },
  failedCalls: {
    label: 'Llamadas fallidas',
    formula: 'Conteo donde resultado = fallida',
    source: 'callData + seguimientos (normalizados)'
  },
  uniqueBeneficiariesContacted: {
    label: 'Beneficiarios contactados',
    formula: 'Beneficiarios con al menos una llamada en rango',
    source: 'callData + seguimientos (normalizados)'
  },
  avgMinutesPerCall: {
    label: 'Minutos promedio por llamada',
    formula: 'Suma de duracion / totalCalls (en minutos)',
    source: 'callData + seguimientos (normalizados)'
  },
  effectiveMinutes: {
    label: 'Minutos efectivos',
    formula: 'Suma de duracion de llamadas exitosas',
    source: 'callData + seguimientos (normalizados)'
  },
  totalAssignedBeneficiaries: {
    label: 'Beneficiarios asignados',
    formula: 'Suma de assignments canónicos por operador real',
    source: 'assignments + operators (reales)'
  },
  contactedBeneficiaries: {
    label: 'Beneficiarios contactados (asignados)',
    formula: 'Beneficiarios asignados con al menos una llamada en rango',
    source: 'assignments + callData + seguimientos + operators'
  },
  uncontactedBeneficiaries: {
    label: 'Beneficiarios sin contacto',
    formula: 'totalAssignedBeneficiaries - contactedBeneficiaries',
    source: 'assignments + callData + seguimientos + operators'
  },
  dueSoon: {
    label: 'Al día (<=15d)',
    formula: 'Beneficiarios asignados con ultima llamada exitosa hace 0-15 dias',
    source: 'assignments + callData + seguimientos + operators'
  },
  pending: {
    label: 'Pendientes (16-30d)',
    formula: 'Beneficiarios asignados con ultima llamada exitosa hace 16-30 dias',
    source: 'assignments + callData + seguimientos + operators'
  },
  urgent: {
    label: 'Urgentes (>30d o sin contacto)',
    formula: 'Beneficiarios asignados sin llamadas o ultima exitosa >30 dias',
    source: 'assignments + callData + seguimientos + operators'
  }
};

export const METRIC_KEYS = Object.keys(METRICS_CONTRACT);

export default METRICS_CONTRACT;
