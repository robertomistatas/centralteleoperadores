/**
 * metricsService.js
 * Única fuente de cálculo de métricas/KPIs.
 * Todas las vistas (Dashboard, Auditoría, Historial, Teleoperadora) deben consumir este servicio.
 */

import logger from '../utils/logger';
import { normalizeCallResult, normalizeDate, normalizePhoneCL, normalizeRecords } from '../utils/dataNormalizer';
import { getCanonicalAssignmentsMetrics } from '../utils/assignmentMetrics';
import METRICS_CONTRACT from './metricsContract';

const normalizeEmail = (value = '') => (value || '').toString().trim().toLowerCase();
const normalizeName = (value = '') => (value || '').toString().trim();

// Normaliza teléfonos según canon Chile (9 dígitos, inicia con 9)
const normalizePhoneDigits = (value = '') => normalizePhoneCL(String(value || ''));

// Extractor robusto de teléfono para registros de llamadas
const extractPhone = (record = {}) => {
  const candidates = [
    record.phone,
    record.phoneNumber,
    record.telefono,
    record.fono,
    record.primaryPhone,
    record.caller,
    record.numero,
    record.numero_cliente,
    record.numero_telefono,
    record.contactNumber,
    record._original?.phone,
    record._original?.phoneNumber,
    record._original?.telefono,
    record._original?.caller,
  ];

  return candidates.find((v) => v !== undefined && v !== null && `${v}`.trim() !== '') || '';
};

const toUTCDate = (dateString) => {
  if (!dateString) return null;
  const parsed = new Date(`${dateString}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const inRange = (date, range) => {
  if (!range || (!range.start && !range.end)) return true;
  if (!date) return false;
  const start = range.start ? toUTCDate(range.start) : null;
  const end = range.end ? toUTCDate(range.end) : null;
  if (start && date < start) return false;
  if (end) {
    // incluir el día final completo
    const endInclusive = new Date(end);
    endInclusive.setUTCHours(23, 59, 59, 999);
    if (date > endInclusive) return false;
  }
  return true;
};

const buildOperatorIndex = (operators = []) => {
  const validOperators = (operators || []).filter((op) => op && op.id && op.email && op.isActive !== false);
  const byId = new Map();
  const byEmail = new Map();
  const byName = new Map();

  validOperators.forEach((op) => {
    const email = normalizeEmail(op.email);
    const name = normalizeName(op.name || op.displayName || op.email);
    const entry = {
      operatorId: op.id,
      operatorKey: email,
      displayName: name || email || 'Sin nombre',
      email,
      raw: op
    };
    byId.set(op.id, entry);
    if (email) byEmail.set(email, entry);
    if (name) byName.set(name.toLowerCase(), entry);
  });

  return { validOperators, byId, byEmail, byName };
};

const deriveOperatorKey = (record = {}, operatorIndex) => {
  const original = record._original || record;
  const candidates = [
    original.operatorEmail,
    original.operadorEmail,
    original.operator_email,
    original.emailOperador,
    original.email,
  ].map(normalizeEmail).filter(Boolean);

  for (const candidate of candidates) {
    if (operatorIndex.byEmail.has(candidate)) return candidate;
  }

  if (record.operatorId && operatorIndex.byId.has(record.operatorId)) {
    return operatorIndex.byId.get(record.operatorId).operatorKey;
  }

  const name = normalizeName(record.operatorName);
  if (name && operatorIndex.byName.has(name.toLowerCase())) {
    return operatorIndex.byName.get(name.toLowerCase()).operatorKey;
  }

  return null;
};

const enrichRecords = (records = [], operatorIndex, range) => {
  const normalized = normalizeRecords(records || []);
  const filtered = [];
  const byDate = new Map();
  const beneficiaryActivity = new Map();
  let totalDuration = 0;
  let totalEffectiveMinutes = 0;
  let successfulCalls = 0;
  let failedCalls = 0;

  normalized.forEach((rec) => {
    const callDate = toUTCDate(rec.fecha);
    if (!inRange(callDate, range)) return;

    const operatorKey = deriveOperatorKey(rec, operatorIndex);
    const duration = Number(rec.duracion || 0);
    const isSuccess = rec.resultado === 'exitosa';
    const isFailure = rec.resultado === 'fallida';

    const enriched = { ...rec, operatorKey, callDate, duration };
    filtered.push(enriched);

    // time series
    const dateKey = rec.fecha || 'Sin fecha';
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, { date: dateKey, total: 0, successful: 0, failed: 0 });
    }
    const bucket = byDate.get(dateKey);
    bucket.total += 1;
    if (isSuccess) bucket.successful += 1;
    if (isFailure) bucket.failed += 1;

    // beneficiary activity
    const beneficiaryKey = normalizeName(rec.beneficiaryName || '').toLowerCase();
    if (beneficiaryKey) {
      if (!beneficiaryActivity.has(beneficiaryKey)) {
        beneficiaryActivity.set(beneficiaryKey, {
          beneficiary: rec.beneficiaryName || 'Sin nombre',
          lastCallDate: null,
          lastSuccessfulDate: null,
          totalCalls: 0,
          successfulCalls: 0,
          lastResult: null,
        });
      }
      const activity = beneficiaryActivity.get(beneficiaryKey);
      activity.totalCalls += 1;
      if (isSuccess) activity.successfulCalls += 1;
      if (callDate && (!activity.lastCallDate || callDate > activity.lastCallDate)) {
        activity.lastCallDate = callDate;
        activity.lastResult = rec.resultado;
      }
      if (isSuccess && callDate && (!activity.lastSuccessfulDate || callDate > activity.lastSuccessfulDate)) {
        activity.lastSuccessfulDate = callDate;
      }
    }

    // global aggregates
    totalDuration += duration;
    if (isSuccess) {
      successfulCalls += 1;
      totalEffectiveMinutes += duration;
    } else if (isFailure) {
      failedCalls += 1;
    }
  });

  return {
    records: filtered,
    byDate: Array.from(byDate.values()).sort((a, b) => new Date(a.date) - new Date(b.date)),
    beneficiaryActivity,
    totals: {
      totalDuration,
      totalEffectiveMinutes,
      successfulCalls,
      failedCalls,
    }
  };
};

const classifyStatus = (lastSuccessDate, referenceDate) => {
  if (!referenceDate) return { status: 'urgent', daysSinceLastSuccess: null };
  if (!lastSuccessDate) return { status: 'urgent', daysSinceLastSuccess: null };
  const diffDays = Math.max(0, Math.floor((referenceDate - lastSuccessDate) / (1000 * 60 * 60 * 24)));
  if (diffDays <= 15) return { status: 'dueSoon', daysSinceLastSuccess: diffDays };
  if (diffDays <= 30) return { status: 'pending', daysSinceLastSuccess: diffDays };
  return { status: 'urgent', daysSinceLastSuccess: diffDays };
};

const diffInDays = (referenceDate, targetDate) => {
  if (!referenceDate || !targetDate) return null;
  return Math.max(0, Math.floor((referenceDate - targetDate) / (1000 * 60 * 60 * 24)));
};

const formatChileanDate = (value) => {
  if (!value) return 'Sin historial';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin historial';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
};

const buildPhoneActivityIndex = (normalizedRecords = []) => {
  const byPhone = new Map();
  let successfulCalls = 0;
  let failedCalls = 0;

  normalizedRecords.forEach((rec) => {
    const phoneKey = normalizePhoneDigits(extractPhone(rec));
    if (!phoneKey) return;

    const callDate = rec.fecha ? new Date(`${rec.fecha}T00:00:00Z`) : null;
    const isSuccess = rec.resultado === 'exitosa';
    const isFailure = rec.resultado === 'fallida';

    if (isSuccess) successfulCalls += 1;
    if (isFailure) failedCalls += 1;

    if (!byPhone.has(phoneKey)) {
      byPhone.set(phoneKey, {
        phone: phoneKey,
        lastCallDate: null,
        lastSuccessfulDate: null,
        totalCalls: 0,
        successfulCalls: 0,
      });
    }

    const activity = byPhone.get(phoneKey);
    activity.totalCalls += 1;
    if (isSuccess) activity.successfulCalls += 1;

    if (callDate && (!activity.lastCallDate || callDate > activity.lastCallDate)) {
      activity.lastCallDate = callDate;
    }

    if (isSuccess && callDate && (!activity.lastSuccessfulDate || callDate > activity.lastSuccessfulDate)) {
      activity.lastSuccessfulDate = callDate;
    }
  });

  return {
    byPhone,
    successfulCalls,
    failedCalls,
    totalCalls: normalizedRecords.length,
  };
};

// Normalizador ligero para Historial: ignora operadora de AMAIA y se centra en teléfono/fecha/resultado
const normalizeCallsForHistory = (records = []) => {
  return (records || [])
    .map((rec) => {
      const phone = normalizePhoneDigits(extractPhone(rec));
      const fecha = normalizeDate(rec.fecha || rec.date || rec.fechaLlamada || (rec._original && rec._original.fecha));
      const resultado = normalizeCallResult(rec.resultado || rec.result || rec.estadoLlamada || rec.status);
      const duracion = Number(rec.duracion || rec.duration || 0) || 0;
      if (!phone) return null;
      return { phone, fecha, resultado, duracion };
    })
    .filter(Boolean);
};

const flattenAssignmentsForHistory = (operatorAssignments = {}, operatorIndex) => {
  const result = [];
  const seen = new Set();

  Object.entries(operatorAssignments || {}).forEach(([operatorId, rawAssignments]) => {
    const operator = operatorIndex.byId.get(operatorId);
    const operatorName = operator?.displayName || operator?.email || 'Sin asignar';
    const operatorKey = operator?.operatorKey || null;

    (rawAssignments || []).forEach((assignment, idx) => {
      const assignmentId = assignment.id || assignment.assignmentId || null;
      const normalizedPhones = [
        assignment.primaryPhone,
        assignment.phone,
        assignment.telefono,
        assignment.fono,
        assignment.celular,
        ...(assignment.phones || []),
      ]
        .map(normalizePhoneDigits)
        .filter(Boolean);

      const beneficiaryDisplay = normalizeName(
        assignment.beneficiary ||
          assignment.beneficiario ||
          assignment.name ||
          assignment.usuario ||
          assignment.fullName ||
          ''
      ) || 'Beneficiario sin nombre';

      const cardId = assignmentId || `${operatorId || 'op'}-${idx}`;
      if (seen.has(cardId)) return; // evitar duplicados
      seen.add(cardId);

      result.push({
        id: cardId,
        assignmentId: assignmentId || cardId,
        beneficiary: beneficiaryDisplay,
        operatorName,
        operatorKey,
        phones: normalizedPhones,
        phone: normalizedPhones[0] || '',
        commune: assignment.commune || assignment.comuna || '',
      });
    });
  });

  return result;
};

const classifyFollowUpStatus = ({ activity, referenceDate }) => {
  if (!activity) {
    return {
      status: 'sin-historial',
      statusReason: 'Sin historial (no se encontraron llamadas)',
      daysSinceLastCall: null,
      daysSinceLastSuccess: null,
      lastCallLabel: 'Sin historial',
    };
  }

  const daysSinceLastCall = activity.lastCallDate ? diffInDays(referenceDate, activity.lastCallDate) : null;
  const daysSinceLastSuccess = activity.lastSuccessfulDate ? diffInDays(referenceDate, activity.lastSuccessfulDate) : null;

  // Política: si hay llamadas asociadas, nunca etiquetar como urgente
  if (activity.successfulCalls > 0 && daysSinceLastSuccess !== null && daysSinceLastSuccess <= 15) {
    return {
      status: 'al-dia',
      statusReason: null,
      daysSinceLastCall,
      daysSinceLastSuccess,
      lastCallLabel: formatChileanDate(activity.lastCallDate),
    };
  }

  return {
    status: 'pendiente',
    statusReason: activity.successfulCalls === 0 ? 'Con llamadas registradas (sin éxito)' : null,
    daysSinceLastCall,
    daysSinceLastSuccess,
    lastCallLabel: formatChileanDate(activity.lastCallDate),
  };
};

export const computeMetrics = ({
  calls = [],
  seguimientos = [],
  operatorAssignments = {},
  operators = [],
  range = null,
  filters = {},
} = {}) => {
  const operatorIndex = buildOperatorIndex(operators);
  const referenceDate = range?.end ? toUTCDate(range.end) : new Date();

  const {
    validOperators,
    assignmentsByOperator,
    totalAssignments,
    operatorsWithAssignments,
  } = getCanonicalAssignmentsMetrics(operatorIndex.validOperators, operatorAssignments);

  const operatorEntries = (validOperators || []).map((op) => {
    const email = normalizeEmail(op.email);
    return {
      operatorId: op.id,
      operatorKey: email,
      displayName: normalizeName(op.name || op.displayName || op.email),
      email,
    };
  });

  const { records, byDate, beneficiaryActivity, totals } = enrichRecords(
    [...(calls || []), ...(seguimientos || [])],
    operatorIndex,
    range
  );

  const perOperator = {};
  operatorEntries.forEach((op) => {
    perOperator[op.operatorKey] = {
      operatorId: op.operatorId,
      operatorKey: op.operatorKey,
      displayName: op.displayName,
      email: op.email,
      calls: {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        uniqueBeneficiariesContacted: 0,
        avgMinutesPerCall: 0,
        effectiveMinutes: 0,
      },
      assignments: {
        totalAssigned: assignmentsByOperator[op.operatorId]?.length || 0,
        contactedBeneficiaries: 0,
        uncontactedBeneficiaries: 0,
        dueSoon: 0,
        pending: 0,
        urgent: 0,
        beneficiaries: [],
      },
      records: [],
    };
  });

  // calls by operator
  const beneficiariesByOperator = new Map();
  records.forEach((rec) => {
    if (!rec.operatorKey || !perOperator[rec.operatorKey]) return;
    const operatorEntry = perOperator[rec.operatorKey];
    operatorEntry.records.push(rec);
    operatorEntry.calls.totalCalls += 1;
    if (rec.resultado === 'exitosa') {
      operatorEntry.calls.successfulCalls += 1;
      operatorEntry.calls.effectiveMinutes += rec.duration || 0;
    } else if (rec.resultado === 'fallida') {
      operatorEntry.calls.failedCalls += 1;
    }
    const bKey = normalizeName(rec.beneficiaryName || '').toLowerCase();
    if (bKey) {
      if (!beneficiariesByOperator.has(rec.operatorKey)) {
        beneficiariesByOperator.set(rec.operatorKey, new Set());
      }
      beneficiariesByOperator.get(rec.operatorKey).add(bKey);
    }
    operatorEntry.calls.avgMinutesPerCall = operatorEntry.calls.totalCalls > 0
      ? operatorEntry.calls.effectiveMinutes / operatorEntry.calls.totalCalls
      : 0;
    operatorEntry.calls.uniqueBeneficiariesContacted = beneficiariesByOperator.get(rec.operatorKey)?.size || 0;
  });

  // assignment coverage and statuses
  const beneficiaryStatuses = [];
  let contactedBeneficiaries = 0;
  let dueSoon = 0;
  let pending = 0;
  let urgent = 0;

  operatorEntries.forEach((op) => {
    const operatorKey = op.operatorKey;
    const opAssignments = assignmentsByOperator[op.operatorId] || [];
    const opEntry = perOperator[operatorKey];

    opAssignments.forEach((assignment) => {
      const beneficiaryName = normalizeName(
        assignment.beneficiary || assignment.beneficiario || assignment.name || assignment.usuario || ''
      );
      if (!beneficiaryName) return;
      const bKey = beneficiaryName.toLowerCase();
      const activity = beneficiaryActivity.get(bKey);
      const { status, daysSinceLastSuccess } = classifyStatus(activity?.lastSuccessfulDate, referenceDate);

      const hasCalls = Boolean(activity);
      if (hasCalls) contactedBeneficiaries += 1;
      if (status === 'dueSoon') dueSoon += 1;
      if (status === 'pending') pending += 1;
      if (status === 'urgent') urgent += 1;

      opEntry.assignments.beneficiaries.push({
        id: assignment.id || `${op.operatorId}-${bKey}`,
        beneficiary: beneficiaryName,
        operatorKey,
        operatorName: op.displayName,
        phone: assignment.primaryPhone || assignment.phone || assignment.telefono || '',
        commune: assignment.commune || assignment.comuna || '',
        status,
        daysSinceLastSuccess,
        lastCallDate: activity?.lastCallDate || null,
        lastResult: activity?.lastResult || null,
        callCount: activity?.totalCalls || 0,
        successfulCallCount: activity?.successfulCalls || 0,
      });

      beneficiaryStatuses.push({
        id: assignment.id || `${op.operatorId}-${bKey}`,
        beneficiary: beneficiaryName,
        operatorKey,
        operatorName: op.displayName,
        status,
        daysSinceLastSuccess,
        lastCallDate: activity?.lastCallDate || null,
        callCount: activity?.totalCalls || 0,
        successfulCallCount: activity?.successfulCalls || 0,
      });

      if (status === 'dueSoon') opEntry.assignments.dueSoon += 1;
      if (status === 'pending') opEntry.assignments.pending += 1;
      if (status === 'urgent') opEntry.assignments.urgent += 1;
      if (hasCalls) opEntry.assignments.contactedBeneficiaries += 1;
    });

    opEntry.assignments.uncontactedBeneficiaries = opEntry.assignments.totalAssigned - opEntry.assignments.contactedBeneficiaries;
  });

  const summary = {
    totalCalls: records.length,
    successfulCalls: totals.successfulCalls,
    failedCalls: totals.failedCalls,
    uniqueBeneficiariesContacted: beneficiaryActivity.size,
    avgMinutesPerCall: records.length > 0 ? totals.totalDuration / records.length : 0,
    effectiveMinutes: totals.totalEffectiveMinutes,
    totalAssignedBeneficiaries: totalAssignments,
    contactedBeneficiaries,
    uncontactedBeneficiaries: Math.max(0, totalAssignments - contactedBeneficiaries),
    dueSoon,
    pending,
    urgent,
    operatorsWithAssignments,
    totalOperators: operatorEntries.length,
    successRate: records.length > 0 ? (totals.successfulCalls / records.length) * 100 : 0,
    failureRate: records.length > 0 ? (totals.failedCalls / records.length) * 100 : 0,
  };

  logger.audit('[metricsService] Snapshot calculado', {
    range,
    totalCalls: summary.totalCalls,
    totalAssigned: summary.totalAssignedBeneficiaries,
    operators: summary.totalOperators,
  });

  return {
    contract: METRICS_CONTRACT,
    summary,
    perOperator,
    timeSeries: { byDate },
    beneficiaryStatuses,
    records,
    referenceDate,
    raw: { operators: operatorIndex.validOperators, operatorAssignments }
  };
};

export const getExecutiveSnapshot = (payload = {}) => {
  const base = computeMetrics(payload);
  const topOperators = Object.values(base.perOperator)
    .sort((a, b) => b.calls.totalCalls - a.calls.totalCalls)
    .slice(0, 10);

  return {
    summary: base.summary,
    timeSeries: base.timeSeries,
    perOperator: base.perOperator,
    topOperators,
    referenceDate: base.referenceDate,
  };
};

export const getAuditSnapshot = (payload = {}) => {
  const base = computeMetrics(payload);
  return {
    summary: base.summary,
    perOperator: base.perOperator,
    timeSeries: base.timeSeries,
    referenceDate: base.referenceDate,
  };
};

export const getHistorySnapshot = (payload = {}) => {
  const {
    calls = [],
    seguimientos = [],
    assignments = [],
    operators = [],
    range = null,
  } = payload;

  const referenceDate = range?.end ? toUTCDate(range.end) || new Date() : new Date();

  const rawCalls = calls || [];
  const rawSeguimientos = seguimientos || [];

  logger.info('[HistorialSeguimientos] 🔍 Datos de entrada', {
    rawCallsCount: rawCalls.length,
    rawCallsSample: rawCalls.slice(0, 3),
    rawSeguimientosCount: rawSeguimientos.length,
    rawSeguimientosSample: rawSeguimientos.slice(0, 3),
  });

  // Normalizar registros y construir índice por teléfono (contrato: teléfono es clave primaria)
  // ⚠️ AMAIA no define operadora: no usamos operatorHelpers aquí.
  const normalizedRecords = normalizeCallsForHistory([...rawCalls, ...rawSeguimientos]);

  if (!rawCalls.length) {
    logger.warn('[HistorialSeguimientos] ⚠️ No llegaron llamadas al snapshot');
  }

  logger.info('[HistorialSeguimientos] 🔍 Normalizados para matching', {
    normalizedCount: normalizedRecords.length,
    normalizedSample: normalizedRecords.slice(0, 3),
  });
  const activityIndex = buildPhoneActivityIndex(normalizedRecords);

  // Normalizar asignaciones usando el mismo canon de teléfono que llamadas
  const normalizedAssignments = (Array.isArray(assignments) ? assignments : []).map((assignment, idx) => {
    const normalizedPhones = [
      assignment.primaryPhone,
      assignment.phone,
      assignment.telefono,
      assignment.fono,
      assignment.celular,
      ...(assignment.phones || []),
    ]
      .map((phone) => normalizePhoneDigits(phone))
      .filter(Boolean);

    const operatorName = assignment.operatorName || assignment.operator || 'Sin asignar';

    return {
      id: assignment.id || `assignment-${idx}`,
      assignmentId: assignment.assignmentId || assignment.id || `assignment-${idx}`,
      beneficiary: assignment.beneficiary || assignment.beneficiario || assignment.name || 'Beneficiario sin nombre',
      operatorName,
      operatorKey: normalizeEmail(assignment.operatorEmail || ''),
      phones: normalizedPhones,
      phone: normalizedPhones[0] || '',
      commune: assignment.commune || assignment.comuna || '',
      normalizedPhones,
      normalizedPhone: normalizedPhones[0] || '',
    };
  });

  const followUps = normalizedAssignments.map((assignment) => {
    const activity = assignment.normalizedPhones
      .map((phone) => activityIndex.byPhone.get(phone))
      .find((match) => Boolean(match)) || null;

    const statusInfo = classifyFollowUpStatus({ activity, referenceDate });

    return {
      id: assignment.id,
      assignmentId: assignment.assignmentId,
      beneficiary: assignment.beneficiary,
      operator: assignment.operatorName,
      phone: assignment.normalizedPhone || 'Sin teléfono',
      commune: assignment.commune,
      status: statusInfo.status,
      statusReason: statusInfo.statusReason,
      lastCall: statusInfo.lastCallLabel,
      callCount: activity?.totalCalls || 0,
      successfulCallCount: activity?.successfulCalls || 0,
      daysSinceLastCall: statusInfo.daysSinceLastSuccess ?? statusInfo.daysSinceLastCall,
    };
  });

  const summary = {
    totalCalls: activityIndex.totalCalls,
    successfulCalls: activityIndex.successfulCalls,
    failedCalls: activityIndex.failedCalls,
    uniqueBeneficiariesContacted: activityIndex.byPhone.size,
    totalAssignedBeneficiaries: normalizedAssignments.length,
    dueSoon: followUps.filter((f) => f.status === 'al-dia').length,
    pending: followUps.filter((f) => f.status === 'pendiente').length,
    urgent: followUps.filter((f) => f.status === 'urgente').length,
    noHistory: followUps.filter((f) => f.status === 'sin-historial').length,
    successRate: activityIndex.totalCalls > 0 ? (activityIndex.successfulCalls / activityIndex.totalCalls) * 100 : 0,
  };

  logger.audit('[metricsService] Snapshot Historial recalculado', {
    totalCalls: summary.totalCalls,
    assigned: summary.totalAssignedBeneficiaries,
    followUps: followUps.length,
    contacted: summary.uniqueBeneficiariesContacted,
    dueSoon: summary.dueSoon,
    pending: summary.pending,
    urgent: summary.urgent,
    noHistory: summary.noHistory,
  });

  return {
    summary,
    followUps,
    referenceDate,
  };
};

export const getOperatorSnapshot = (operatorKey, payload = {}) => {
  const base = computeMetrics(payload);
  if (!operatorKey) return { summary: base.summary };
  const operator = base.perOperator[operatorKey];
  if (!operator) return { summary: base.summary };

  return {
    operator,
    calls: operator.calls,
    assignments: operator.assignments,
    records: operator.records,
    summary: base.summary,
    referenceDate: base.referenceDate,
  };
};

export default {
  computeMetrics,
  getExecutiveSnapshot,
  getAuditSnapshot,
  getHistorySnapshot,
  getOperatorSnapshot,
};
