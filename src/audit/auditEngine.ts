/*
 * Internal audit engine for deterministic, side-effect-free checks.
 */

export type AuditStatus = 'OK' | 'WARN' | 'FAIL' | 'SKIPPED';
export type AuditSeverity = AuditStatus;

export interface AuditResult {
  id: string;
  label: string;
  status: AuditStatus;
  severity?: AuditSeverity;
  summary?: string;
  details?: string;
  affectedEntities?: any[];
  remediationHint?: string;
  durationMs: number;
}

export interface AuditSummary {
  total: number;
  ok: number;
  warn: number;
  fail: number;
  skipped: number;
  durationMs: number;
}

export interface AuditReport {
  timestamp: string;
  environment: string;
  results: AuditResult[];
  summary: AuditSummary;
}

export interface AuditContext {
  environment?: string;
  currentUser?: any;
  userProfile?: any;
  users?: any[];
  operators?: any[];
  assignmentsSnapshot?: any;
  metricsSnapshot?: any;
  metricsData?: any;
}

export type AuditCheck = (context: AuditContext) => Promise<AuditResult> | AuditResult;

export const buildSummary = (results: AuditResult[], durationMs: number): AuditSummary => {
  const counts = results.reduce(
    (acc, item) => {
      if (item.status === 'OK') acc.ok += 1;
      if (item.status === 'WARN') acc.warn += 1;
      if (item.status === 'FAIL') acc.fail += 1;
      if (item.status === 'SKIPPED') acc.skipped += 1;
      return acc;
    },
    { ok: 0, warn: 0, fail: 0, skipped: 0 }
  );

  return {
    total: results.length,
    ok: counts.ok,
    warn: counts.warn,
    fail: counts.fail,
    skipped: counts.skipped,
    durationMs,
  };
};

export const safeExecuteCheck = async (
  checkId: string,
  label: string,
  fn: AuditCheck,
  context: AuditContext
): Promise<AuditResult> => {
  const started = performance.now ? performance.now() : Date.now();
  try {
    const result = await fn(context);
    const ended = performance.now ? performance.now() : Date.now();
    const durationMs = ended - started;

    return {
      id: checkId,
      label,
      status: result.status,
      severity: result.severity || result.status,
      summary: result.summary,
      details: result.details,
      affectedEntities: result.affectedEntities,
      remediationHint: result.remediationHint,
      durationMs,
    };
  } catch (error: any) {
    const ended = performance.now ? performance.now() : Date.now();
    return {
      id: checkId,
      label,
      status: 'FAIL',
      severity: 'FAIL',
      details: error?.message || 'Unexpected error during audit check',
      durationMs: ended - started,
    };
  }
};
