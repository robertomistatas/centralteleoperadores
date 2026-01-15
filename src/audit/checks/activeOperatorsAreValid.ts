import { AuditContext, AuditResult } from '../auditEngine';
import { getTeleoperatorProfiles, getNormalizedStatus, hasCanonicalUUID, summarizeUsers } from '../checkUtils';

const checkId = 'activeOperatorsAreValid';
const label = 'Operadores activos son canónicos';

export const activeOperatorsAreValid = (context: AuditContext): AuditResult => {
  try {
    const users = Array.isArray(context?.users) ? context.users : [];
    const teleoperators = getTeleoperatorProfiles(users);

    if (!teleoperators.length) {
      return {
        id: checkId,
        label,
        status: 'SKIPPED',
        severity: 'SKIPPED',
        summary: 'Sin operadores para validar.',
        remediationHint: 'Cargar teleoperadores antes de auditar.',
        durationMs: 0,
      };
    }

    const invalid = teleoperators.filter((u) => getNormalizedStatus(u) !== 'active' || !hasCanonicalUUID(u));

    if (!invalid.length) {
      return {
        id: checkId,
        label,
        status: 'OK',
        severity: 'OK',
        summary: 'Teleoperadores activos cumplen UUID y estado.',
        durationMs: 0,
      };
    }

    return {
      id: checkId,
      label,
      status: 'WARN',
      severity: 'WARN',
      summary: `${invalid.length} operadores no cumplen el contrato canónico`,
      details: 'Operador válido requiere role TELEOPERATOR/teleoperadora, status active y UUID presente.',
      affectedEntities: summarizeUsers(invalid),
      remediationHint: 'Diagnóstico únicamente; revisar identidad de operadores.',
      durationMs: 0,
    };
  } catch (error: any) {
    return {
      id: checkId,
      label,
      status: 'FAIL',
      severity: 'FAIL',
      summary: 'Error validando operadores activos.',
      details: error?.message || 'Error validando operadores activos',
      remediationHint: 'Revisar el motor de auditoría y volver a ejecutar.',
      durationMs: 0,
    };
  }
};

export default activeOperatorsAreValid;
