/*
 * Deterministic metrics service (pure, side-effect free).
 */

import {
  BeneficiaryAssignment,
  BeneficiaryMetrics,
  BeneficiaryStatus,
  CallMetrics,
  CallRecord,
  GlobalMetricsSnapshot,
  HistoryMetricsSnapshot,
  OperatorMetricsSnapshot,
  TemporalStatus,
} from './metricsContract';

type MetricsData = {
  calls?: CallRecord[];
  seguimientos?: CallRecord[];
  followUps?: CallRecord[];
  assignments?: BeneficiaryAssignment[];
  operators?: OperatorIdentity[];
  referenceDate?: string | Date;
};

type OperatorIdentity = {
  id?: string;
  email?: string;
  name?: string;
  displayName?: string;
};

type OperatorDirectoryEntry = {
  operatorId?: string;
  operatorKey: string;
  displayName?: string;
  email?: string;
};

type TimeSeriesBucket = { total: number; successful: number; failed: number; duration: number };

type CallTotals = {
  total: number;
  successful: number;
  failed: number;
  unresolved: number;
  totalDuration: number;
  effectiveMinutes: number;
};

type OperatorAccumulator = {
  operatorId?: string;
  operatorKey: string;
  displayName?: string;
  email?: string;
  callTotals: CallTotals;
  timeSeries: Map<string, TimeSeriesBucket>;
  assignedBeneficiaries: number;
  contactedBeneficiaries: number;
  upToDate: number;
  pending: number;
  urgent: number;
  beneficiaryStatuses: BeneficiaryStatus[];
};

type BeneficiaryActivity = {
  beneficiaryId?: string;
  beneficiaryName?: string;
  lastCallDate: Date | null;
  lastSuccessfulDate: Date | null;
  totalCalls: number;
  successfulCalls: number;
};

type NormalizedCall = {
  operatorKey: string | null;
  operatorId?: string;
  beneficiaryKey: string | null;
  beneficiaryId?: string;
  beneficiaryName?: string;
  date: Date;
  dateKey: string;
  direction: 'saliente' | 'entrante';
  durationSeconds: number;
  result: string;
  isSuccess: boolean;
  isFailure: boolean;
  isResolved: boolean;
  isAuditable: boolean;
};

type NormalizedAssignment = {
  id?: string;
  beneficiaryKey: string | null;
  beneficiaryId?: string;
  beneficiaryName?: string;
  operatorKey: string | null;
  operatorId?: string;
  phone?: string;
  phones?: string[];
  commune?: string;
};

type ComputeAllResult = {
  globalSnapshot: GlobalMetricsSnapshot;
  operatorKeyById: Map<string, string>;
  operatorKeyByEmail: Map<string, string>;
};

const normalizeText = (value?: string | null) => (value ?? '').trim();
const normalizeEmail = (value?: string | null) => normalizeText(value).toLowerCase();
const normalizePhoneDigits = (value?: string | number | null) => (value ? String(value).replace(/\D+/g, '') : '');

const extractDirection = (call: CallRecord | any): 'saliente' | 'entrante' => {
  const raw = normalizeText(
    (call as any).callDirection || (call as any).tipoLlamada || (call as any).tipo || (call as any).direction
  ).toLowerCase();
  if (raw.includes('entra')) return 'entrante';
  if (raw.includes('out') || raw.includes('sal')) return 'saliente';
  return 'saliente';
};

const extractDurationSeconds = (call: CallRecord | any): number => {
  const candidates = [
    (call as any).durationSeconds,
    (call as any).duracion,
    (call as any).duration,
    (call as any).durationMinutes != null ? Number((call as any).durationMinutes) * 60 : null,
  ].filter((v) => v !== undefined && v !== null) as Array<number | string>;
  for (const raw of candidates) {
    const num = Number(raw);
    if (!Number.isNaN(num) && num >= 0) return num;
  }
  return 0;
};

const classifyAmaiaResult = (raw: string) => {
  const normalized = normalizeText(raw).toLowerCase();
  if (normalized === 'llamado exitoso' || normalized === 'llamada exitosa' || normalized === 'exitoso') return 'success';
  if (normalized === 'sin respuesta') return 'failed';
  return 'other';
};

const toDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateKey = (value: Date) => value.toISOString().split('T')[0];

const beneficiaryKeyFrom = (id?: string, name?: string) => {
  const candidate = normalizeText(id) || normalizeText(name);
  return candidate ? candidate.toLowerCase() : null;
};

const buildOperatorDirectory = (operators: OperatorIdentity[] = []) => {
  const byId = new Map<string, OperatorDirectoryEntry>();
  const byEmail = new Map<string, OperatorDirectoryEntry>();

  operators.forEach((op) => {
    const email = normalizeEmail(op.email);
    const key = email || (op.id ? String(op.id).trim() : '');
    if (!key) return;
    const entry: OperatorDirectoryEntry = {
      operatorId: op.id ? String(op.id) : undefined,
      operatorKey: key,
      displayName: normalizeText(op.name || op.displayName || op.email || key) || key,
      email: email || undefined,
    };
    if (entry.operatorId) byId.set(entry.operatorId, entry);
    if (email) byEmail.set(email, entry);
  });

  return { byId, byEmail };
};

const resolveOperatorKey = (
  source: Partial<CallRecord> | Partial<BeneficiaryAssignment> | OperatorIdentity,
  directory: { byId: Map<string, OperatorDirectoryEntry>; byEmail: Map<string, OperatorDirectoryEntry> }
): string | null => {
  const directKey = normalizeEmail((source as CallRecord).operatorKey || null);
  if (directKey) return directKey;

  const emailCandidates = [
    (source as CallRecord).operatorEmail,
    (source as CallRecord).emailOperador as string | undefined,
    (source as CallRecord).email as string | undefined,
  ];
  for (const candidate of emailCandidates) {
    const email = normalizeEmail(candidate || null);
    if (email) {
      const entry = directory.byEmail.get(email);
      return entry?.operatorKey ?? email;
    }
  }

  const idCandidate = (source as CallRecord).operatorId ?? (source as BeneficiaryAssignment).operatorId ?? (source as OperatorIdentity).id;
  if (idCandidate) {
    const idKey = String(idCandidate).trim();
    const entry = directory.byId.get(idKey);
    return entry?.operatorKey ?? idKey;
  }

  return null;
};

const classifyStatus = (lastSuccessDate: Date | null, referenceDate: Date): { status: TemporalStatus; daysSinceLastSuccess: number | null } => {
  if (!lastSuccessDate) return { status: 'urgent', daysSinceLastSuccess: null };
  const diffDays = Math.max(0, Math.floor((referenceDate.getTime() - lastSuccessDate.getTime()) / (1000 * 60 * 60 * 24)));
  if (diffDays <= 15) return { status: 'upToDate', daysSinceLastSuccess: diffDays };
  if (diffDays <= 30) return { status: 'pending', daysSinceLastSuccess: diffDays };
  return { status: 'urgent', daysSinceLastSuccess: diffDays };
};

const ensureOperatorAccumulator = (
  store: Record<string, OperatorAccumulator>,
  operatorKey: string,
  seed?: OperatorDirectoryEntry
) => {
  if (!store[operatorKey]) {
    store[operatorKey] = {
      operatorId: seed?.operatorId,
      operatorKey,
      displayName: seed?.displayName,
      email: seed?.email,
      callTotals: { total: 0, successful: 0, failed: 0, unresolved: 0, totalDuration: 0, effectiveMinutes: 0 },
      timeSeries: new Map(),
      assignedBeneficiaries: 0,
      contactedBeneficiaries: 0,
      upToDate: 0,
      pending: 0,
      urgent: 0,
      beneficiaryStatuses: [],
    };
  }
  return store[operatorKey];
};

const updateTimeSeries = (target: Map<string, TimeSeriesBucket>, dateKey: string, isSuccess: boolean, isFailure: boolean, duration: number) => {
  if (!target.has(dateKey)) {
    target.set(dateKey, { total: 0, successful: 0, failed: 0, duration: 0 });
  }
  const bucket = target.get(dateKey)!;
  bucket.total += 1;
  bucket.duration += duration;
  if (isSuccess) bucket.successful += 1;
  if (isFailure) bucket.failed += 1;
};

const toCallMetrics = (totals: CallTotals): CallMetrics => ({
  totalCalls: totals.total,
  successfulCalls: totals.successful,
  failedCalls: totals.failed,
  unresolvedCalls: totals.unresolved,
  successRate: totals.total > 0 ? (totals.successful / totals.total) * 100 : 0,
  effectiveMinutes: totals.effectiveMinutes,
  avgMinutesPerCall: totals.total > 0 ? totals.totalDuration / totals.total : 0,
});

const toBeneficiaryMetrics = (assigned: number, contacted: number): BeneficiaryMetrics => ({
  assignedBeneficiaries: assigned,
  contactedBeneficiaries: contacted,
  uncontactedBeneficiaries: Math.max(0, assigned - contacted),
  coverageRate: assigned > 0 ? (contacted / assigned) * 100 : 0,
});

const mapTimeSeries = (source: Map<string, TimeSeriesBucket>) =>
  Array.from(source.entries())
    .map(([date, values]) => ({
      date,
      totalCalls: values.total,
      successfulCalls: values.successful,
      failedCalls: values.failed,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

const normalizeCallRecord = (
  call: CallRecord,
  directory: { byId: Map<string, OperatorDirectoryEntry>; byEmail: Map<string, OperatorDirectoryEntry> },
  assignmentByPhone: Map<string, NormalizedAssignment>
): NormalizedCall | null => {
  const rawDate = (call as any).date || (call as any).fecha;
  const parsedDate = toDate(rawDate);
  if (!parsedDate) return null;

  const direction = extractDirection(call);
  const durationSeconds = extractDurationSeconds(call);
  const rawResult = normalizeText((call as any).result ?? (call as any).resultado ?? (call as any).estado ?? '').toLowerCase();
  const strictResult = classifyAmaiaResult(rawResult);
  const isSuccess = strictResult === 'success';
  const isFailure = strictResult === 'failed';

  const operatorKey = resolveOperatorKey(call, directory);
  const beneficiaryId = (call as any).beneficiaryId || (call as any).idBeneficiario;
  const beneficiaryName =
    (call as any).beneficiaryName || (call as any).beneficiary || (call as any).beneficiario || undefined;
  const amaiaKey = beneficiaryKeyFrom(beneficiaryId, beneficiaryName);

  const phoneCandidates: string[] = [
    (call as any).phone,
    (call as any).telefono,
    (call as any).primaryPhone,
    ...(((call as any).phones as string[] | undefined) || []),
  ];
  const phone = phoneCandidates
    .map((p) => normalizePhoneDigits(p))
    .filter(Boolean)
    .find((p) => assignmentByPhone.has(p));

  const assignmentHit = phone ? assignmentByPhone.get(phone) : undefined;
  const beneficiaryKey = amaiaKey || assignmentHit?.beneficiaryKey || null;
  const resolvedBeneficiaryId = beneficiaryId || assignmentHit?.beneficiaryId;
  const resolvedBeneficiaryName = beneficiaryName || assignmentHit?.beneficiaryName;
  const isResolved = Boolean(beneficiaryKey);
  const isAuditable = direction === 'saliente' && durationSeconds >= 10 && (isSuccess || isFailure);

  return {
    operatorKey,
    operatorId: (call as any).operatorId,
    beneficiaryKey,
    beneficiaryId: resolvedBeneficiaryId,
    beneficiaryName: resolvedBeneficiaryName,
    date: parsedDate,
    dateKey: toDateKey(parsedDate),
    direction,
    durationSeconds,
    result: rawResult,
    isSuccess,
    isFailure,
    isResolved,
    isAuditable,
  };
};

const normalizeAssignment = (
  assignment: BeneficiaryAssignment,
  directory: { byId: Map<string, OperatorDirectoryEntry>; byEmail: Map<string, OperatorDirectoryEntry> }
): NormalizedAssignment => ({
  id: assignment.id,
  beneficiaryKey: beneficiaryKeyFrom(assignment.beneficiaryId, assignment.beneficiaryName),
  beneficiaryId: assignment.beneficiaryId,
  beneficiaryName: assignment.beneficiaryName,
  operatorKey: resolveOperatorKey(assignment, directory),
  operatorId: assignment.operatorId,
  phone: assignment.phone || (assignment as any).primaryPhone,
  phones: [
    assignment.phone,
    (assignment as any).primaryPhone,
    ...(((assignment as any).phones as string[] | undefined) || []),
  ]
    .map((p) => normalizePhoneDigits(p))
    .filter(Boolean),
  commune: assignment.commune,
});

const buildHistorySnapshot = (
  globalSeries: Map<string, TimeSeriesBucket>,
  beneficiaryStatuses: BeneficiaryStatus[],
  referenceDate: Date
): HistoryMetricsSnapshot => ({
  timeSeries: mapTimeSeries(globalSeries),
  beneficiaryStatuses,
  referenceDate,
});

const computeAllSnapshots = (data: MetricsData = {}): ComputeAllResult => {
  const {
    calls = [],
    seguimientos = [],
    followUps = [],
    assignments = [],
    operators = [],
    referenceDate: refDate,
  } = data;

  const referenceDate = toDate(refDate) || new Date();
  const directory = buildOperatorDirectory(operators);
  const operatorKeyById = new Map<string, string>();
  const operatorKeyByEmail = new Map<string, string>();

  directory.byId.forEach((entry, id) => operatorKeyById.set(id, entry.operatorKey));
  directory.byEmail.forEach((entry, email) => operatorKeyByEmail.set(email, entry.operatorKey));

  const normalizedAssignments = assignments.map((assignment) => normalizeAssignment(assignment, directory));
  const assignmentByPhone = new Map<string, NormalizedAssignment>();
  normalizedAssignments.forEach((assignment) => {
    if (Array.isArray(assignment.phones)) {
      assignment.phones.forEach((phone) => {
        if (phone && !assignmentByPhone.has(phone)) assignmentByPhone.set(phone, assignment);
      });
    }
  });

  const callsSource = [...calls, ...seguimientos, ...followUps];
  const beneficiaryActivity = new Map<string, BeneficiaryActivity>();
  const perOperator: Record<string, OperatorAccumulator> = {};
  const globalCallTotals: CallTotals = { total: 0, successful: 0, failed: 0, unresolved: 0, totalDuration: 0, effectiveMinutes: 0 };
  const globalTimeSeries = new Map<string, TimeSeriesBucket>();

  callsSource.forEach((call) => {
    const normalized = normalizeCallRecord(call, directory, assignmentByPhone);
    if (!normalized) return;
    if (!normalized.isResolved) {
      // Cuenta llamadas técnicamente auditables que no pudieron resolverse
      if (normalized.isAuditable && (normalized.isSuccess || normalized.isFailure)) {
        globalCallTotals.unresolved += 1;
      }
      return;
    }

    const durationMinutes = normalized.durationSeconds / 60;

    if (normalized.isAuditable && (normalized.isSuccess || normalized.isFailure)) {
      globalCallTotals.total += 1;
      globalCallTotals.totalDuration += durationMinutes;
      if (normalized.isSuccess) {
        globalCallTotals.successful += 1;
        globalCallTotals.effectiveMinutes += durationMinutes;
      } else if (normalized.isFailure) {
        globalCallTotals.failed += 1;
      }
      updateTimeSeries(globalTimeSeries, normalized.dateKey, normalized.isSuccess, normalized.isFailure, durationMinutes);
    }

    if (normalized.operatorKey && normalized.isAuditable && (normalized.isSuccess || normalized.isFailure)) {
      const entry = directory.byEmail.get(normalizeEmail(call.operatorEmail || '')) || directory.byId.get(String(call.operatorId || ''));
      const acc = ensureOperatorAccumulator(perOperator, normalized.operatorKey, entry);
      if (normalized.operatorId && !acc.operatorId) acc.operatorId = normalized.operatorId;
      acc.callTotals.total += 1;
      acc.callTotals.totalDuration += durationMinutes;
      if (normalized.isSuccess) {
        acc.callTotals.successful += 1;
        acc.callTotals.effectiveMinutes += durationMinutes;
      } else if (normalized.isFailure) {
        acc.callTotals.failed += 1;
      }
      updateTimeSeries(acc.timeSeries, normalized.dateKey, normalized.isSuccess, normalized.isFailure, durationMinutes);
    }

    if (normalized.beneficiaryKey) {
      if (!beneficiaryActivity.has(normalized.beneficiaryKey)) {
        beneficiaryActivity.set(normalized.beneficiaryKey, {
          beneficiaryId: normalized.beneficiaryId,
          beneficiaryName: normalized.beneficiaryName,
          lastCallDate: null,
          lastSuccessfulDate: null,
          totalCalls: 0,
          successfulCalls: 0,
        });
      }
      const activity = beneficiaryActivity.get(normalized.beneficiaryKey)!;
      activity.totalCalls += 1;
      if (normalized.isSuccess) {
        activity.successfulCalls += 1;
        if (!activity.lastSuccessfulDate || normalized.date > activity.lastSuccessfulDate) {
          activity.lastSuccessfulDate = normalized.date;
        }
      }
      if (!activity.lastCallDate || normalized.date > activity.lastCallDate) {
        activity.lastCallDate = normalized.date;
      }
    }
  });

  let assignedBeneficiaries = 0;
  let contactedBeneficiaries = 0;
  let upToDate = 0;
  let pending = 0;
  let urgent = 0;
  const beneficiaryStatuses: BeneficiaryStatus[] = [];

  normalizedAssignments.forEach((assignment) => {
    assignedBeneficiaries += 1;
    const activity = assignment.beneficiaryKey ? beneficiaryActivity.get(assignment.beneficiaryKey) : undefined;
    const hasContact = Boolean(activity);
    if (hasContact) contactedBeneficiaries += 1;

    const { status, daysSinceLastSuccess } = classifyStatus(activity?.lastSuccessfulDate ?? null, referenceDate);
    if (status === 'upToDate') upToDate += 1;
    if (status === 'pending') pending += 1;
    if (status === 'urgent') urgent += 1;

    const statusEntry: BeneficiaryStatus = {
      beneficiaryId: assignment.beneficiaryId,
      beneficiaryName: assignment.beneficiaryName,
      operatorId: assignment.operatorId,
      operatorKey: assignment.operatorKey || undefined,
      status,
      lastSuccessfulCall: activity?.lastSuccessfulDate ? toDateKey(activity.lastSuccessfulDate) : null,
      daysSinceLastSuccess,
      callCount: activity?.totalCalls || 0,
      successfulCallCount: activity?.successfulCalls || 0,
    };
    beneficiaryStatuses.push(statusEntry);

    if (assignment.operatorKey) {
      const opSeed = directory.byId.get(String(assignment.operatorId || '')) || directory.byEmail.get(normalizeEmail(assignment.operatorKey));
      const acc = ensureOperatorAccumulator(perOperator, assignment.operatorKey, opSeed);
      if (assignment.operatorId && !acc.operatorId) acc.operatorId = assignment.operatorId;
      acc.assignedBeneficiaries += 1;
      if (hasContact) acc.contactedBeneficiaries += 1;
      if (status === 'upToDate') acc.upToDate += 1;
      if (status === 'pending') acc.pending += 1;
      if (status === 'urgent') acc.urgent += 1;
      acc.beneficiaryStatuses.push(statusEntry);
    }
  });

  const historySnapshot = buildHistorySnapshot(globalTimeSeries, beneficiaryStatuses, referenceDate);

  const perOperatorSnapshots: Record<string, OperatorMetricsSnapshot> = {};
  Object.values(perOperator).forEach((acc) => {
    const callsMetrics = toCallMetrics(acc.callTotals);
    const beneficiaryMetrics = toBeneficiaryMetrics(acc.assignedBeneficiaries, acc.contactedBeneficiaries);
    perOperatorSnapshots[acc.operatorKey] = {
      operatorId: acc.operatorId || acc.operatorKey,
      operatorKey: acc.operatorKey,
      displayName: acc.displayName,
      email: acc.email,
      calls: callsMetrics,
      beneficiaries: beneficiaryMetrics,
      temporal: { upToDate: acc.upToDate, pending: acc.pending, urgent: acc.urgent },
      history: {
        timeSeries: mapTimeSeries(acc.timeSeries),
        beneficiaryStatuses: acc.beneficiaryStatuses,
        referenceDate,
      },
      referenceDate,
    };
  });

  const globalSnapshot: GlobalMetricsSnapshot = {
    calls: toCallMetrics(globalCallTotals),
    beneficiaries: toBeneficiaryMetrics(assignedBeneficiaries, contactedBeneficiaries),
    temporal: { upToDate, pending, urgent },
    perOperator: perOperatorSnapshots,
    history: historySnapshot,
    referenceDate,
  };

  return { globalSnapshot, operatorKeyById, operatorKeyByEmail };
};

export const computeGlobalSnapshot = (data: MetricsData = {}): GlobalMetricsSnapshot => {
  const { globalSnapshot } = computeAllSnapshots(data);
  return globalSnapshot;
};

const resolveOperatorKeyFromInput = (
  operatorIdOrKey: string,
  operatorKeyById: Map<string, string>,
  operatorKeyByEmail: Map<string, string>,
  perOperator: Record<string, OperatorMetricsSnapshot>
) => {
  const normalizedId = normalizeText(operatorIdOrKey);
  const normalizedEmail = normalizeEmail(operatorIdOrKey);
  if (perOperator[normalizedId]) return normalizedId;
  if (perOperator[normalizedEmail]) return normalizedEmail;
  if (operatorKeyById.has(normalizedId)) return operatorKeyById.get(normalizedId) || null;
  if (operatorKeyByEmail.has(normalizedEmail)) return operatorKeyByEmail.get(normalizedEmail) || null;
  return null;
};

export const computeOperatorSnapshot = (
  operatorIdOrKey: string,
  data: MetricsData = {}
): OperatorMetricsSnapshot => {
  const { globalSnapshot, operatorKeyById, operatorKeyByEmail } = computeAllSnapshots(data);
  const operatorKey = resolveOperatorKeyFromInput(operatorIdOrKey, operatorKeyById, operatorKeyByEmail, globalSnapshot.perOperator);
  if (operatorKey && globalSnapshot.perOperator[operatorKey]) {
    return globalSnapshot.perOperator[operatorKey];
  }

  const referenceDate = toDate(data.referenceDate) || new Date();
  return {
    operatorId: normalizeText(operatorIdOrKey) || 'unknown',
    operatorKey: normalizeText(operatorIdOrKey) || 'unknown',
    calls: {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      successRate: 0,
      effectiveMinutes: 0,
      avgMinutesPerCall: 0,
    },
    beneficiaries: {
      assignedBeneficiaries: 0,
      contactedBeneficiaries: 0,
      uncontactedBeneficiaries: 0,
      coverageRate: 0,
    },
    temporal: { upToDate: 0, pending: 0, urgent: 0 },
    history: { timeSeries: [], beneficiaryStatuses: [], referenceDate },
    referenceDate,
  };
};

export const computeHistorySnapshot = (data: MetricsData = {}): HistoryMetricsSnapshot => {
  const { globalSnapshot } = computeAllSnapshots(data);
  return globalSnapshot.history;
};

export default {
  computeGlobalSnapshot,
  computeOperatorSnapshot,
  computeHistorySnapshot,
};
