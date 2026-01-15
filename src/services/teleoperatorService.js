import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { operatorService, assignmentService, assertFirestoreReady } from '../firestoreService';

const normalizeEmail = (email = '') => email.toLowerCase().trim();

const pickFirstDoc = (snap) => {
  if (!snap || snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

class TeleoperatorService {
  constructor() {
    this.userProfilesCollection = 'userProfiles';
  }

  async findUserProfilesByEmail(emailNormalized) {
    const queries = [
      query(collection(db, this.userProfilesCollection), where('emailNormalized', '==', emailNormalized)),
      query(collection(db, this.userProfilesCollection), where('email', '==', emailNormalized))
    ];

    const results = [];
    for (const q of queries) {
      try {
        const snap = await getDocs(q);
        snap.docs.forEach(d => results.push({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('⚠️ findUserProfilesByEmail query falló:', err?.message);
      }
    }

    // dedupe by doc id
    const seen = new Map();
    results.forEach(r => seen.set(r.id, r));
    return Array.from(seen.values());
  }

  async ensureUserProfile({ displayName, email, phone }) {
    const emailNormalized = normalizeEmail(email);
    const existingProfiles = await this.findUserProfilesByEmail(emailNormalized);
    const existing = existingProfiles[0];

    if (existing) {
      const needsReactivation = existing.isActive === false;
      const needsRole = existing.role !== 'teleoperadora';
      const needsEmailNormalized = !existing.emailNormalized;
      const needsDisplay = displayName && existing.displayName !== displayName;
      const needsPhone = phone && existing.phone !== phone;

      let merged = { ...existing, isActive: true, role: 'teleoperadora', email: emailNormalized, emailNormalized };

      if (needsReactivation || needsRole || needsEmailNormalized || needsDisplay || needsPhone) {
        const updates = {
          isActive: true,
          deletedAt: null,
          role: 'teleoperadora',
          email: emailNormalized,
          emailNormalized,
          displayName: displayName || existing.displayName || emailNormalized,
          phone: phone || existing.phone || null,
          updatedAt: serverTimestamp(),
          updatedBy: 'teleoperator_service'
        };
        await updateDoc(doc(db, this.userProfilesCollection, existing.id), updates);
        merged = { ...merged, ...updates };
      }

      return merged;
    }

    // Crear nuevo perfil
    const profileId = `teleop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const profile = {
      uid: profileId,
      email: emailNormalized,
      emailNormalized,
      displayName: displayName?.trim() || emailNormalized,
      phone: phone || null,
      role: 'teleoperadora',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'teleoperator_service',
      authenticationStatus: 'pending',
      profileType: 'teleoperator_created'
    };

    await setDoc(doc(db, this.userProfilesCollection, profileId), profile);
    return { id: profileId, ...profile };
  }

  async ensureOperator({ userProfile, displayName, email, phone }) {
    const normalizedEmail = normalizeEmail(email || userProfile.email || userProfile.emailNormalized);

    const existing = await operatorService.getByEmail(normalizedEmail);
    if (existing && existing.length > 0) {
      return existing[0];
    }

    const operatorId = normalizedEmail; // identidad única del operador
    const operatorData = {
      name: displayName || userProfile.displayName || normalizedEmail,
      email: normalizedEmail,
      phone: phone || userProfile.phone || '',
      userId: userProfile.id || userProfile.uid,
      isActive: true
    };

    return operatorService.create(userProfile.id || userProfile.uid, operatorData, { id: operatorId });
  }

  async ensureAssignments(operatorId) {
    const currentAssignments = await assignmentService.getOperatorAssignments(null, operatorId);
    if (currentAssignments && currentAssignments.length >= 0) {
      // Doc exists or will be created; always persist to guarantee presence
      await assignmentService.saveOperatorAssignments(null, operatorId, currentAssignments || []);
      return currentAssignments || [];
    }

    await assignmentService.saveOperatorAssignments(null, operatorId, []);
    return [];
  }

  async createTeleoperator({ displayName, email, phone }) {
    assertFirestoreReady('crear teleoperadora');

    if (!email) {
      throw new Error('Email requerido para crear teleoperadora');
    }

    const emailNormalized = normalizeEmail(email);

    if (!emailNormalized) {
      throw new Error('emailNormalized inválido. No se puede crear teleoperadora.');
    }

    // 1) Asegurar userProfile activo
    const userProfile = await this.ensureUserProfile({ displayName, email: emailNormalized, phone });

    // 2) Asegurar operador vinculado
    const operator = await this.ensureOperator({ userProfile, displayName, email: emailNormalized, phone });

    // 3) Asegurar documento de asignaciones
    await this.ensureAssignments(operator.id);

    return { userProfile, operator };
  }
}

export const teleoperatorService = new TeleoperatorService();
export default teleoperatorService;
