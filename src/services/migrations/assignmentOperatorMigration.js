import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { operatorService, assertFirestoreReady } from '../../firestoreService';

// Normaliza email/operatorId
const normalize = (value = '') => value.toLowerCase().trim();
const isValidEmail = (value = '') => value.includes('@');

const deriveOperatorIdFromDoc = (data, docId) => {
  // Prioridad: operatorId en documento
  const fromField = normalize(data?.operatorId || '');
  if (fromField && isValidEmail(fromField)) return fromField;

  // Fallback: id del documento si es email
  const fromDoc = normalize(docId || '');
  if (fromDoc && isValidEmail(fromDoc)) return fromDoc;

  return null;
};

const deriveOperatorIdFromAssignments = (assignments = []) => {
  for (const a of assignments) {
    const fromAssignment = normalize(a?.operatorEmail || a?.operatorId || a?.operator || '');
    if (fromAssignment && isValidEmail(fromAssignment)) return fromAssignment;
  }
  return null;
};

/**
 * Migra assignments legacy a esquema canónico:
 * - operatorId = emailNormalized (solo emails válidos con "@")
 * - Crea operators/{operatorId} si falta (solo cuando hay email válido)
 * - Crea/actualiza assignments/{operatorId} con el payload existente
 * - Si no hay email válido: se marca como unresolvedLegacyAssignment
 * - dryRun: true => no escribe, solo reporta
 */
export const runAssignmentOperatorMigration = async ({ dryRun = false } = {}) => {
  assertFirestoreReady('migrar assignments → operators');

  const snap = await getDocs(collection(db, 'assignments'));
  const summary = {
    totalAssignmentDocs: snap.size,
    totalAssignmentItems: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    operatorsToCreate: [],
    operatorsExisting: [],
    resolvableAssignments: [],
    unresolvedLegacyAssignments: [],
    details: [],
    dryRun,
    dataSources: 'assignments collection (doc-level + nested assignments)'
  };

  for (const docSnap of snap.docs) {
    const legacyId = docSnap.id;
    try {
      const data = docSnap.data() || {};
      const assignments = Array.isArray(data.assignments) ? data.assignments : [];
      summary.totalAssignmentItems += assignments.length;

      // Derivar operador desde múltiples fuentes
      let operatorId = deriveOperatorIdFromDoc(data, legacyId);
      if (!operatorId) {
        operatorId = deriveOperatorIdFromAssignments(assignments);
      }

      if (!operatorId) {
        summary.skipped += 1;
        summary.unresolvedLegacyAssignments.push({ legacyId, assignments: assignments.length });
        summary.details.push({ legacyId, reason: 'sin operador derivable (no email con @ en doc ni en asignaciones)' });
        continue;
      }

      // Asegurar operador (solo si email válido)
      const existing = await operatorService.getByEmail(operatorId);
      if (existing && existing.length > 0) {
        summary.operatorsExisting.push(operatorId);
      } else {
        summary.operatorsToCreate.push(operatorId);
        if (!dryRun) {
          await operatorService.create(null, {
            email: operatorId,
            name: data.operatorName || data.nombre || operatorId,
            phone: data.phone || null,
            isActive: true
          }, { id: operatorId });
        }
      }

      // Migrar assignments al doc canónico
      // Cada ítem en assignments se considera resoluble para el operadorId derivado
      summary.resolvableAssignments.push(...assignments.map(() => operatorId));

      if (!dryRun) {
        const targetRef = doc(db, 'assignments', operatorId);
        await setDoc(targetRef, {
          operatorId,
          assignments,
          ownerUserId: data.ownerUserId || null,
          updatedAt: new Date()
        }, { merge: true });
      }

      summary.migrated += 1;
      summary.details.push({ legacyId, operatorId, status: dryRun ? 'dry-run' : 'migrated', assignmentCount: assignments.length });
    } catch (error) {
      summary.errors += 1;
      summary.details.push({ legacyId, error: error.message });
    }
  }

  return summary;
};

export default runAssignmentOperatorMigration;