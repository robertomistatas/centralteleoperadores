import { AuditContext, AuditResult } from '../auditEngine';
import { collectUsersFromContext, getNormalizedRole, getNormalizedStatus, hasCanonicalUUID, normalizeEmail, summarizeUsers } from '../checkUtils';

const checkId = 'onlyOneSuperAdmin';
const label = 'Solo un SUPER_ADMIN';

export const onlyOneSuperAdmin = (context: AuditContext): AuditResult => {
  try {
    const users = collectUsersFromContext(context);

    if (!users.length) {
      return {
        id: checkId,
        label,
        status: 'SKIPPED',
        severity: 'SKIPPED',
        summary: 'Usuarios no cargados',
        details: 'Se necesitan perfiles para validar la identidad de SUPER_ADMIN.',
        affectedEntities: [],
        remediationHint: 'Cargar usuarios antes de ejecutar la auditoría.',
        durationMs: 0,
      };
    }

    const canonicalSuperAdmins = users.filter(
      (u) => getNormalizedRole(u) === 'super_admin' && getNormalizedStatus(u) === 'active' && hasCanonicalUUID(u)
    );
    const legacySuperAdmins = users.filter((u) => getNormalizedRole(u) === 'super_admin' && !hasCanonicalUUID(u));

    if (canonicalSuperAdmins.length === 1) {
      return {
        id: checkId,
        label,
        status: 'OK',
        severity: 'OK',
        summary: '1 SUPER_ADMIN canónico activo detectado.',
        details: `SUPER_ADMIN: ${normalizeEmail(canonicalSuperAdmins[0]?.email) || canonicalSuperAdmins[0]?.id}`,
        affectedEntities: summarizeUsers(canonicalSuperAdmins),
        remediationHint: 'Mantener un único SUPER_ADMIN activo con UUID.',
        durationMs: 0,
      };
    }

    if (canonicalSuperAdmins.length === 0) {
      return {
        id: checkId,
        label,
        status: 'FAIL',
        severity: 'FAIL',
        summary: 'No hay SUPER_ADMIN canónico activo.',
        details: legacySuperAdmins.length
          ? 'Solo se encontraron perfiles legacy (sin UUID); no cuentan para el contrato.'
          : 'No se encontró ningún SUPER_ADMIN en los datos canónicos.',
        affectedEntities: summarizeUsers(legacySuperAdmins),
        remediationHint: 'Crear/regularizar 1 SUPER_ADMIN activo con UUID. Perfiles sin UUID no cuentan.',
        durationMs: 0,
      };
    }

    return {
      id: checkId,
      label,
      status: 'FAIL',
      severity: 'FAIL',
      summary: `Se encontraron ${canonicalSuperAdmins.length} SUPER_ADMIN canónicos activos.`,
      details: 'Debe existir exactamente 1 SUPER_ADMIN canónico activo. Perfiles legacy no se consideran para el conteo.',
      affectedEntities: summarizeUsers(canonicalSuperAdmins),
      remediationHint: 'Dejar solo 1 SUPER_ADMIN activo con UUID; desactivar o reclasificar los adicionales.',
      durationMs: 0,
    };
  } catch (error: any) {
    return {
      id: checkId,
      label,
      status: 'FAIL',
      severity: 'FAIL',
      summary: 'Error evaluando regla de SUPER_ADMIN.',
      details: error?.message || 'Error evaluando SUPER_ADMIN',
      remediationHint: 'Revisar el motor de auditoría y volver a ejecutar.',
      durationMs: 0,
    };
  }
};

export default onlyOneSuperAdmin;
