import React, { useState, useEffect, useRef } from 'react';
import { shallow } from 'zustand/shallow';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Shield, 
  Settings, 
  Plus, 
  Search, 
  Filter,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Crown,
  UserPlus,
  Database,
  Activity,
  Zap,
  ClipboardList,
  BarChart3,
  Globe,
  Lock,
  Palette,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../AuthContext';
import useUserManagementStore from '../../stores/useUserManagementStore';
import { userManagementService } from '../../services/userManagementService';
import { userSyncService } from '../../services/userSyncService'; // ✅ Servicio de sincronización global
import { useUIStore, useCallStore, useAppStore } from '../../stores';
import auditService from '../../audit/auditService';
import { buildCanonicalAssignmentsSnapshot } from '../../services/assignmentsSnapshot';
import { computeGlobalSnapshot } from '../../services/metricsService';
import { operatorService, assignmentService } from '../../firestoreService';
import { teleoperatorService } from '../../services/teleoperatorService';
import { runAssignmentOperatorMigration } from '../../services/migrations/assignmentOperatorMigration';
import { getCanonicalAssignmentsMetrics } from '../../utils/assignmentMetrics';
import logger from '../../utils/logger';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';

/**
 * Panel de Configuración del Sistema - Rediseñado
 * Interfaz moderna, elegante y sofisticada para administración
 */
const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const users = useUserManagementStore(state => state.users);
  const roles = useUserManagementStore(state => state.roles);
  const isLoading = useUserManagementStore(state => state.isLoading);
  const isLoaded = useUserManagementStore(state => state.isLoaded);
  const stats = useUserManagementStore(state => state.stats, shallow);
  const searchTerm = useUserManagementStore(state => state.searchTerm);
  const filterRole = useUserManagementStore(state => state.filterRole);
  const selectedUser = useUserManagementStore(state => state.selectedUser);
  const setSearchTerm = useUserManagementStore(state => state.setSearchTerm);
  const setFilterRole = useUserManagementStore(state => state.setFilterRole);
  const setSelectedUser = useUserManagementStore(state => state.setSelectedUser);
  const createUser = useUserManagementStore(state => state.createUser);
  const updateUser = useUserManagementStore(state => state.updateUser);
  const deleteUser = useUserManagementStore(state => state.deleteUser);
  const toggleUserStatus = useUserManagementStore(state => state.toggleUserStatus);
  const loadUsers = useUserManagementStore(state => state.loadUsers);
  const getFilteredUsers = useUserManagementStore(state => state.getFilteredUsers);
  const isSuperAdmin = useUserManagementStore(state => state.isSuperAdmin);
  const exportUsers = useUserManagementStore(state => state.exportUsers);

  // 📡 Operadores y asignaciones (fuente real en Firestore)
  const operatorDocs = useAppStore(state => state.operators);
  const operatorAssignments = useAppStore(state => state.operatorAssignments);
  const removeStoreOperator = useAppStore(state => state.removeOperator);
  const loadOperators = useAppStore(state => state.loadOperators);
  const loadAssignments = useAppStore(state => state.loadAssignments);
  const callData = useCallStore(state => state.callData);

  // UI Store hooks for toasts
  const showSuccess = useUIStore(state => state.showSuccess);
  const showError = useUIStore(state => state.showError);
  const showInfo = useUIStore(state => state.showInfo);
  const showWarning = useUIStore(state => state.showWarning);

  // Estados locales
  const [activeTab, setActiveTab] = useState('overview'); // overview, users, system, security
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isCreatingTestUsers, setIsCreatingTestUsers] = useState(false);
  const [isCleaningTestUsers, setIsCleaningTestUsers] = useState(false);
  const [deletingTeleopId, setDeletingTeleopId] = useState(null);
  const [isMigrationRunning, setIsMigrationRunning] = useState(false);
  const operatorsLoggedRef = useRef(false);
  const [canonicalMetrics, setCanonicalMetrics] = useState(null);
  const [canonicalSignature, setCanonicalSignature] = useState(null);

  // Verificar permisos
  const hasAccess = isSuperAdmin(user);

  // Loguear una sola vez cuando haya operadores disponibles
  useEffect(() => {
    if (!hasAccess || operatorsLoggedRef.current) return;
    if (operatorDocs && operatorDocs.length > 0) {
      operatorsLoggedRef.current = true;
      if (import.meta.env.DEV) logger.debug('[Config] Operators loaded');
    }
  }, [hasAccess, operatorDocs]);

  // Cargar usuarios desde userProfiles una sola vez
  useEffect(() => {
    if (!hasAccess || isLoaded || isLoading) return;
    loadUsers?.();
  }, [hasAccess, isLoaded, isLoading, loadUsers]);

  // Cargar operators y assignments una sola vez
  useEffect(() => {
    if (!hasAccess) return;
    loadOperators?.();
    loadAssignments?.();
  }, [hasAccess, loadOperators, loadAssignments]);
  
  // Calcular snapshot canónico de métricas fuera del render para evitar loops
  useEffect(() => {
    const hasCalls = Array.isArray(callData) && callData.length > 0;
    const hasOperators = Array.isArray(operatorDocs) && operatorDocs.length > 0;
    const assignmentLists = operatorAssignments && typeof operatorAssignments === 'object'
      ? Object.values(operatorAssignments).filter(Array.isArray)
      : [];
    const assignmentsCount = assignmentLists.reduce((sum, list) => sum + list.length, 0);
    const hasAssignments = assignmentsCount > 0;

    const signature = `${hasCalls ? callData.length : 0}|${hasOperators ? operatorDocs.length : 0}|${assignmentsCount}`;

    if (!hasCalls || !hasOperators || !hasAssignments) {
      setCanonicalMetrics(null);
      setCanonicalSignature(null);
      return;
    }

    if (signature === canonicalSignature) return;

    const canonicalAssignments = buildCanonicalAssignmentsSnapshot({
      operators: operatorDocs || [],
      assignments: operatorAssignments || {},
    });

    const operatorMeta = new Map();
    (canonicalAssignments?.operators || []).forEach((op) => {
      operatorMeta.set(op.id, {
        email: op.email,
        name: op.name || op.displayName || op.email || op.id,
      });
    });

    const flatAssignments = Object.entries(canonicalAssignments?.assignmentsByOperatorId || {}).flatMap(
      ([operatorId, list]) => {
        const meta = operatorMeta.get(operatorId) || {};
        if (!Array.isArray(list)) return [];
        return list
          .filter(Boolean)
          .map((assignment) => ({
            operatorId,
            operatorEmail: meta.email,
            operatorName: meta.name,
            beneficiaryId: assignment?.beneficiaryId || assignment?.id,
            beneficiaryName:
              assignment?.beneficiary ||
              assignment?.beneficiaryName ||
              assignment?.name ||
              assignment?.nombre,
            phone: assignment?.phone || assignment?.primaryPhone || assignment?.telefono,
            commune: assignment?.commune || assignment?.comuna,
          }));
      }
    );

    const snapshot = computeGlobalSnapshot({
      calls: callData,
      assignments: flatAssignments,
      operators: (canonicalAssignments?.operators || []).map((op) => ({
        id: op.id,
        email: op.email,
        name: op.name || op.displayName || op.email || op.id,
        displayName: op.displayName || op.name,
      })),
    });

    setCanonicalMetrics(snapshot?.calls || null);
    setCanonicalSignature(signature);
  }, [callData, operatorDocs, operatorAssignments, canonicalSignature]);

  // Usuarios filtrados
  const filteredUsers = getFilteredUsers();

  // Control de acceso
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Acceso Restringido</h3>
            <p className="text-gray-600">No tienes permisos para acceder a la configuración del sistema.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Pestañas de navegación
  const tabs = [
    { id: 'overview', label: 'Resumen', icon: BarChart3 },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'teleops', label: 'Teleoperadoras', icon: Users },
    { id: 'system', label: 'Sistema', icon: Settings },
    { id: 'appTests', label: 'Pruebas APP', icon: ClipboardList },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'development', label: 'Desarrollo', icon: Zap }
  ];

  // Manejar creación de usuario con sistema inteligente
  const handleCreateUser = async (userData) => {
    setActionLoading(true);
    try {
      logger.auth('Iniciando creación de usuario/teleoperadora:', userData.email);

      // Flujo canónico para teleoperadoras: perfil + operator + assignments
      if (userData.role === 'teleoperadora') {
        const { userProfile, operator } = await teleoperatorService.createTeleoperator({
          displayName: userData.displayName,
          email: userData.email,
          phone: userData.phone
        });

        await loadUsers?.();
        await loadOperators?.();
        await loadAssignments?.();

        setShowCreateModal(false);
        showSuccess(
          `Teleoperadora creada y vinculada\n\n` +
          `📧 Email: ${userProfile.email}\n` +
          `👤 Operador: ${operator?.name || userProfile.displayName}`
        );
        return;
      }

      // Otros roles mantienen el flujo inteligente + store local
      const { smartUserCreationService } = await import('../../services/smartUserCreationService');
      const result = await smartUserCreationService.createUserIntelligent(userData);

      logger.auth('Usuario creado con sistema inteligente:', result);

      await createUser(userData);

      setShowCreateModal(false);

      showSuccess(
        `Usuario creado exitosamente\n\n` +
        `📧 Email: ${userData.email}\n` +
        `👤 Rol: ${userData.role}`
      );

    } catch (error) {
      logger.error('Error creando usuario:', error);
      showError('Error al crear usuario: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Manejar edición de usuario
  const handleEditUser = async (userData) => {
    setActionLoading(true);
    try {
      console.log('🔄 Actualizando usuario:', {
        uid: selectedUser.uid,
        email: selectedUser.email,
        userData
      });
      
      // Verificar si el usuario tiene UID
      if (!selectedUser.uid) {
        console.warn('⚠️ Usuario sin UID, buscando por email:', selectedUser.email);
        
        // Buscar el perfil por email para obtener el UID
        const profile = await userSyncService.getUserProfileByEmail(selectedUser.email);
        
        if (profile && profile.uid) {
          console.log('✅ UID encontrado por email:', profile.uid);
          selectedUser.uid = profile.uid;
        } else {
          throw new Error('No se pudo encontrar el UID del usuario. Debe estar registrado en Firebase Auth primero.');
        }
      }
      
      // ✅ Actualizar usando el servicio de sincronización global
      // Esto notificará automáticamente a TODOS los módulos de la app
      await userSyncService.updateUserProfile(selectedUser.uid, userData);
      
      // También actualizar en el store local
      await updateUser(selectedUser.uid, userData);
      
      setShowEditModal(false);
      setSelectedUser(null);
      showSuccess('✅ Usuario editado y sincronizado en toda la aplicación');
      
      console.log('✅ Usuario actualizado y notificación global enviada');
    } catch (error) {
      logger.error('Error editando usuario:', error);
      showError('Error al editar usuario: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Manejar eliminación de usuario
  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Está seguro de que desea eliminar este usuario?')) return;

    setActionLoading(true);
    try {
      await deleteUser(userId);
      showSuccess('Usuario eliminado correctamente');
    } catch (error) {
      logger.error('Error eliminando usuario:', error);
      showError('Error al eliminar usuario: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Manejar cambio de estado de usuario
  const handleToggleUserStatus = async (userId) => {
    setActionLoading(true);
    try {
      await toggleUserStatus(userId);
      showSuccess('Estado del usuario actualizado correctamente');
    } catch (error) {
      logger.error('Error cambiando estado de usuario:', error);
      showError('Error al cambiar estado de usuario: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Crear usuarios de prueba
  const handleCreateTestUsers = async () => {
    setIsCreatingTestUsers(true);
    try {
      await userManagementService.createTestUsers();
      showSuccess('Usuarios de prueba creados correctamente');
    } catch (error) {
      logger.error('Error creando usuarios de prueba:', error);
      showError('Error al crear usuarios de prueba: ' + error.message);
    } finally {
      setIsCreatingTestUsers(false);
    }
  };

  // Limpiar usuarios de prueba
  const handleCleanTestUsers = async () => {
    if (!confirm('¿Está seguro de que desea eliminar todos los usuarios de prueba?')) return;

    setIsCleaningTestUsers(true);
    try {
      await userManagementService.cleanTestUsers();
      showSuccess('Usuarios de prueba eliminados correctamente');
    } catch (error) {
      logger.error('Error limpiando usuarios de prueba:', error);
      showError('Error al limpiar usuarios de prueba: ' + error.message);
    } finally {
      setIsCleaningTestUsers(false);
    }
  };

  // Eliminar teleoperadora directamente desde operators
  const handleDeleteTeleop = async (operatorId) => {
    if (!confirm('¿Eliminar esta teleoperadora? Esta acción eliminará también sus asignaciones.')) return;

    setDeletingTeleopId(operatorId);
    try {
      await operatorService.delete(operatorId);
      await assignmentService.deleteOperatorAssignments(null, operatorId);
      removeStoreOperator?.(operatorId);
      showSuccess('Teleoperadora eliminada');
    } catch (error) {
      logger.error('Error eliminando teleoperadora:', error);
      showError('No se pudo eliminar la teleoperadora');
    } finally {
      setDeletingTeleopId(null);
    }
  };

  const handleRunAssignmentsMigration = async () => {
    if (!hasAccess || isMigrationRunning) return;

    setIsMigrationRunning(true);
    console.log('🚀 Migración (dryRun) iniciada');

    try {
      // Paso 1: Dry run
      const drySummary = await runAssignmentOperatorMigration({ dryRun: true });
      const uniqueOperatorsToCreate = Array.from(new Set(drySummary.operatorsToCreate || []));
      const uniqueResolvable = Array.from(new Set(drySummary.resolvableAssignments || []));
      const unresolvedCount = drySummary.unresolvedLegacyAssignments?.length || 0;

      console.log('✅ DryRun completado', drySummary);

      // Bloqueo si el dry-run no coincide con expectativas mínimas
      const minOperatorsExpected = 2;
      const minAssignmentsExpected = 300; // ~400 esperado
      const resolvableCount = drySummary.resolvableAssignments?.length || 0;

      const summaryText =
        'DryRun migración:\n' +
        `Operadores a crear: ${uniqueOperatorsToCreate.length}\n` +
        `Asignaciones resolubles: ${resolvableCount}\n` +
        `Legacy sin email (@): ${unresolvedCount}\n` +
        `Errores: ${drySummary.errors || 0}\n` +
        `Docs leídos: ${drySummary.totalAssignmentDocs ?? 'n/a'}\n` +
        `Items leídos: ${drySummary.totalAssignmentItems ?? 'n/a'}\n`;

      const proceed = uniqueOperatorsToCreate.length >= minOperatorsExpected && resolvableCount >= minAssignmentsExpected
        ? confirm(summaryText + '\n\n¿Ejecutar migración real?')
        : (alert(summaryText + '\n\n⚠️ Resumen no coincide con expectativas. Migración BLOQUEADA.'), false);

      if (!proceed) {
        alert('Migración cancelada después de dryRun. No se realizaron cambios.');
        return;
      }

      console.log('🚀 Migración real iniciada');
      const summary = await runAssignmentOperatorMigration({ dryRun: false });
      console.log('✅ Migración completada', summary);

      await loadOperators?.();
      await loadAssignments?.();

      const uniqueCreated = Array.from(new Set(summary?.operatorsToCreate || []));
      const uniqueResolvableFinal = Array.from(new Set(summary?.resolvableAssignments || []));
      const unresolvedFinal = summary?.unresolvedLegacyAssignments?.length || 0;

      alert(
        'Migración completada:\n' +
        `migrated: ${summary?.migrated ?? 0}\n` +
        `skipped: ${summary?.skipped ?? 0}\n` +
        `errors: ${summary?.errors ?? 0}\n` +
        `operadores creados: ${uniqueCreated.length}\n` +
        `asignaciones resolubles: ${uniqueResolvableFinal.length}\n` +
        `legacy sin email (@): ${unresolvedFinal}`
      );
    } catch (error) {
      console.error('❌ Error en migración', error);
      const message = error?.message || 'No se pudo ejecutar la migración (Firestore no está listo o sin permisos).';
      alert(`Error al ejecutar migración:\n${message}`);
    } finally {
      setIsMigrationRunning(false);
    }
  };

  // Componente de carga
  if (isLoading && !isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando configuración del sistema...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Principal */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
                <p className="text-gray-600">Panel de administración avanzada</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3"></div>
          </div>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-2 mb-8">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <IconComponent className="h-5 w-5 mr-2" />
                  {tab.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Contenido principal */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <OverviewTab 
              stats={stats} 
              users={users} 
              teleopCount={operatorDocs.length}
              onCreateTestUsers={handleCreateTestUsers}
              onCleanTestUsers={handleCleanTestUsers}
              isCreatingTestUsers={isCreatingTestUsers}
              isCleaningTestUsers={isCleaningTestUsers}
              canonicalMetrics={canonicalMetrics}
            />
          )}
          
          {activeTab === 'users' && (
            <UsersTab 
              users={filteredUsers}
              searchTerm={searchTerm}
              filterRole={filterRole}
              onSearchChange={setSearchTerm}
              onFilterChange={setFilterRole}
              onCreateUser={() => setShowCreateModal(true)}
              onEditUser={(user) => {
                setSelectedUser(user);
                setShowEditModal(true);
              }}
              onDeleteUser={handleDeleteUser}
              onToggleStatus={handleToggleUserStatus}
              actionLoading={actionLoading}
              roles={roles}
            />
          )}

          {activeTab === 'teleops' && (
            <TeleoperatorsTab
              operators={operatorDocs}
              operatorAssignments={operatorAssignments}
              onDelete={handleDeleteTeleop}
              deletingId={deletingTeleopId}
              onRunMigration={handleRunAssignmentsMigration}
              isMigrationRunning={isMigrationRunning}
              showMigrationButton={hasAccess}
            />
          )}
          
          {activeTab === 'system' && <SystemTab />}
          {activeTab === 'appTests' && <AppTestsTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'development' && <DevelopmentTab />}
        </AnimatePresence>
      </div>

      {/* Modales */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateUser}
        isLoading={actionLoading}
        roles={roles}
      />

      <EditUserModal
        isOpen={showEditModal}
        user={selectedUser}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        onSave={handleEditUser}
        isLoading={actionLoading}
        roles={roles}
      />
    </div>
  );
};

// Componente Tab de Resumen
const OverviewTab = ({ 
  stats, 
  users, 
  teleopCount,
  onCreateTestUsers, 
  onCleanTestUsers, 
  isCreatingTestUsers, 
  isCleaningTestUsers,
  canonicalMetrics
}) => {
  const canonicalTotals = {
    total: canonicalMetrics?.totalCalls ?? 0,
    successful: canonicalMetrics?.successfulCalls ?? 0,
    failed: canonicalMetrics?.failedCalls ?? 0,
    unresolved: canonicalMetrics?.unresolvedCalls ?? 0,
  };
  const statsCards = [
    {
      title: 'Total Usuarios',
      value: stats.totalUsers || 0,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'Usuarios Activos',
      value: stats.activeUsers || 0,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: 'Administradores',
      value: stats.adminUsers || 0,
      icon: Crown,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      title: 'Teleoperadoras',
      value: teleopCount || 0,
      icon: Shield,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    }
  ];

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                  <IconComponent className={`h-6 w-6 ${stat.textColor}`} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Acciones rápidas */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Zap className="h-6 w-6 mr-2 text-yellow-500" />
          Acciones Rápidas
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCreateTestUsers}
            disabled={isCreatingTestUsers}
            className="flex items-center justify-center p-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg shadow-green-500/25"
          >
            {isCreatingTestUsers ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
            ) : (
              <UserPlus className="h-5 w-5 mr-3" />
            )}
            {isCreatingTestUsers ? 'Creando...' : 'Crear Usuarios de Prueba'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCleanTestUsers}
            disabled={isCleaningTestUsers}
            className="flex items-center justify-center p-6 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-lg shadow-red-500/25"
          >
            {isCleaningTestUsers ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
            ) : (
              <Trash2 className="h-5 w-5 mr-3" />
            )}
            {isCleaningTestUsers ? 'Limpiando...' : 'Limpiar Usuarios de Prueba'}
          </motion.button>
        </div>
      </div>

      {/* Auditoría de Llamadas (AMAIA) */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            <h3 className="text-xl font-semibold text-gray-900">Auditoría de Llamadas (AMAIA)</h3>
          </div>
          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            Read-only
          </span>
        </div>

        {canonicalMetrics ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-4 border border-indigo-100">
                <p className="text-xs text-gray-600 mb-1">Total de llamadas auditables en el período</p>
                <p className="text-3xl font-bold text-gray-900">{canonicalTotals.total}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-4 border border-emerald-100">
                <p className="text-xs text-gray-600 mb-1">Exitosas</p>
                <p className="text-3xl font-bold text-emerald-700">{canonicalTotals.successful}</p>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-white rounded-xl p-4 border border-rose-100">
                <p className="text-xs text-gray-600 mb-1">Llamadas sin respuesta</p>
                <p className="text-3xl font-bold text-rose-700">{canonicalTotals.failed}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-4 border border-amber-200">
                <p className="text-xs text-gray-600 mb-1">Llamadas No Identificadas (PIN)</p>
                <p className="text-3xl font-bold text-amber-700">{canonicalTotals.unresolved}</p>
              </div>
            </div>
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <p className="text-sm text-gray-800">
                Hay {canonicalTotals.unresolved} llamadas con números no identificados que deben ser actualizados en Asignaciones.
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-600">
            Carga llamadas y asignaciones para visualizar el estado auditable según el contrato de métricas vigente.
          </p>
        )}
      </div>

      {/* Información del sistema */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Activity className="h-6 w-6 mr-2 text-blue-500" />
          Estado del Sistema
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-700">Sistema Operativo</p>
            <p className="text-xs text-green-600">Todos los servicios funcionando</p>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <Database className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-700">Base de Datos</p>
            <p className="text-xs text-blue-600">Conexión estable</p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-xl">
            <Globe className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-purple-700">Conectividad</p>
            <p className="text-xs text-purple-600">Óptima</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const UsersTab = ({ 
  users, 
  searchTerm, 
  filterRole, 
  onSearchChange, 
  onFilterChange, 
  onCreateUser, 
  onEditUser, 
  onDeleteUser, 
  onToggleStatus, 
  actionLoading, 
  roles 
}) => {
  return (
    <motion.div
      key="users"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header con búsqueda y filtros */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={filterRole}
                onChange={(e) => onFilterChange(e.target.value)}
                className="pl-10 pr-8 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">Todos los roles</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCreateUser}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-600/25"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Usuario
          </motion.button>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="divide-y divide-gray-100">
          {users.map((user, index) => (
            <motion.div
              key={user.uid}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {user.displayName?.charAt(0) || user.email?.charAt(0)}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900">{user.displayName || 'Sin nombre'}</h3>
                    <p className="text-gray-600 text-sm">{user.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        user.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {user.role === 'super_admin' ? 'Super Admin' :
                         user.role === 'admin' ? 'Administrador' :
                         'Teleoperadora'}
                      </span>
                      
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onToggleStatus(user.uid)}
                    disabled={actionLoading}
                    className={`p-2 rounded-lg transition-colors ${
                      user.active 
                        ? 'text-green-600 hover:bg-green-50' 
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    {user.active ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onEditUser(user)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="h-5 w-5" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onDeleteUser(user.uid)}
                    disabled={actionLoading}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
          
          {users.length === 0 && (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios</h3>
              <p className="text-gray-600">Crea el primer usuario para comenzar.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const TeleoperatorsTab = ({ 
  operators, 
  operatorAssignments, 
  onDelete, 
  deletingId,
  onRunMigration,
  isMigrationRunning,
  showMigrationButton
}) => {
  const {
    validOperators,
    assignmentsByOperator: canonicalAssignmentsByOperator,
    totalAssignments,
    operatorsWithAssignments
  } = getCanonicalAssignmentsMetrics(operators, operatorAssignments);

  return (
    <motion.div
      key="teleops"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Teleoperadoras (operators)</h3>
            <p className="text-gray-600 text-sm">
              Fuente única: colección operators. Las asignaciones solo existen para operadores reales.
            </p>
          </div>

          {showMigrationButton && (
            <div className="w-full md:w-auto flex flex-col sm:flex-row sm:items-center gap-3">
              {/* TODO: eliminar este botón luego de migración PRD */}
              <motion.button
                whileHover={{ scale: isMigrationRunning ? 1 : 1.02 }}
                whileTap={{ scale: isMigrationRunning ? 1 : 0.98 }}
                onClick={() => onRunMigration?.()}
                disabled={isMigrationRunning}
                className={`w-full md:w-auto px-4 py-2 rounded-lg font-semibold text-sm shadow-md transition-all duration-200 text-white
                  ${isMigrationRunning
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600'}
                `}
              >
                {isMigrationRunning ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Migrando...
                  </span>
                ) : (
                  'Ejecutar Migración Operators / Assignments (Admin)'
                )}
              </motion.button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Teleoperadoras reales</p>
              <p className="text-2xl font-bold text-blue-700">{validOperators.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
          <div className="bg-green-50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Asignaciones totales</p>
              <p className="text-2xl font-bold text-green-700">{totalAssignments}</p>
            </div>
            <Database className="w-8 h-8 text-green-500" />
          </div>
          <div className="bg-purple-50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Operadores con asignaciones</p>
              <p className="text-2xl font-bold text-purple-700">{operatorsWithAssignments}</p>
            </div>
            <FileSpreadsheet className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 divide-y divide-gray-100">
        {validOperators.length === 0 && (
          <div className="py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">No hay teleoperadoras en operators</p>
            <p className="text-gray-500 text-sm">Crea una teleoperadora desde Asignaciones o mediante operadorService.</p>
          </div>
        )}

        {validOperators.map((operator) => {
          const assignmentCount = canonicalAssignmentsByOperator?.[operator.id]?.length || 0;
          const displayName = operator.name || operator.displayName || operator.email;

          return (
            <div key={operator.id} className="py-4 flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-gray-900">{displayName || 'No asignada'}</h4>
                <p className="text-sm text-gray-600">{operator.email || 'Sin email'}</p>
                {operator.phone && (
                  <p className="text-sm text-gray-500">{operator.phone}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {assignmentCount} asignaciones
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onDelete(operator.id)}
                  disabled={deletingId === operator.id}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  {deletingId === operator.id ? '...' : <Trash2 className="h-5 w-5" />}
                </motion.button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// Tab de Desarrollo - Herramientas de diagnóstico y debugging
const DevelopmentTab = () => {
  const { 
    callData, 
    callMetrics, 
    forceReanalysis 
  } = useCallStore();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 Sincronizando datos desde Firebase...');
      // Aquí se puede implementar la lógica de recarga si es necesaria
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulación
      console.log('✅ Sincronización completada');
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleReanalysis = () => {
    setIsReanalyzing(true);
    try {
      console.log('🔧 DEBUG: Forzando re-análisis...');
      console.log('📊 Datos antes del re-análisis:', callMetrics);
      forceReanalysis();
      console.log('✅ Re-análisis completado');
    } catch (error) {
      console.error('❌ Error en re-análisis:', error);
    } finally {
      setTimeout(() => setIsReanalyzing(false), 500);
    }
  };
  
  const handleDiagnostics = () => {
    setIsDiagnosing(true);
    try {
      console.log('🔍 DIAGNÓSTICO: Analizando datos reales...');
      if (callData && callData.length > 0) {
        if (window.analyzeRealData) {
          window.analyzeRealData(callData);
        } else {
          console.log('⚠️ Función de diagnóstico no disponible');
          console.log('Datos disponibles:', callData.length, 'llamadas');
          console.log('Muestra de datos:', callData.slice(0, 3));
          
          // Diagnóstico básico
          const teleoperadoras = [...new Set(callData.map(c => c.teleoperadora).filter(Boolean))];
          const estados = [...new Set(callData.map(c => c.estado).filter(Boolean))];
          const resultados = [...new Set(callData.map(c => c.resultado).filter(Boolean))];
          
          console.log('📊 Estadísticas básicas:');
          console.log('  - Teleoperadoras únicas:', teleoperadoras.length, teleoperadoras);
          console.log('  - Estados únicos:', estados.length, estados);
          console.log('  - Resultados únicos:', resultados.length, resultados);
          console.log('  - Métricas actuales:', callMetrics);
        }
      } else {
        console.log('❌ No hay datos disponibles para analizar');
      }
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
    } finally {
      setTimeout(() => setIsDiagnosing(false), 1000);
    }
  };
  
  return (
    <motion.div
      key="development"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl shadow-lg p-8"
    >
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Herramientas de Desarrollo
        </h3>
        <p className="text-sm text-gray-600">
          Herramientas de diagnóstico y debugging para desarrollo y mantenimiento del sistema
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sincronización de Datos */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
              <RefreshCw className={`w-6 h-6 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Sincronización</h4>
              <p className="text-xs text-gray-600">Recargar datos</p>
            </div>
          </div>
          <p className="text-sm text-gray-700 mb-4">
            Recarga todos los datos desde Firebase para refrescar la información del sistema.
          </p>
          <button
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
              isRefreshing
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
            }`}
          >
            {isRefreshing ? (
              <span className="flex items-center justify-center">
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </span>
            ) : (
              '🔄 Sincronizar Datos'
            )}
          </button>
        </div>

        {/* Re-análisis de Datos */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mr-4">
              <BarChart3 className={`w-6 h-6 text-white ${isReanalyzing ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Re-análisis</h4>
              <p className="text-xs text-gray-600">Recalcular métricas</p>
            </div>
          </div>
          <p className="text-sm text-gray-700 mb-4">
            Fuerza un nuevo análisis de todos los datos y recalcula las métricas del sistema.
          </p>
          <button
            onClick={handleReanalysis}
            disabled={isReanalyzing || !callData || callData.length === 0}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
              isReanalyzing || !callData || callData.length === 0
                ? 'bg-purple-300 cursor-not-allowed'
                : 'bg-purple-500 hover:bg-purple-600 text-white shadow-md hover:shadow-lg'
            }`}
          >
            {isReanalyzing ? (
              <span className="flex items-center justify-center">
                <BarChart3 className="w-4 h-4 mr-2 animate-pulse" />
                Re-analizando...
              </span>
            ) : (
              '🔧 Re-analizar Datos'
            )}
          </button>
          {callData && callData.length > 0 && (
            <p className="text-xs text-gray-600 mt-2 text-center">
              {callData.length} llamadas disponibles
            </p>
          )}
        </div>

        {/* Diagnóstico del Sistema */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mr-4">
              <Activity className={`w-6 h-6 text-white ${isDiagnosing ? 'animate-bounce' : ''}`} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Diagnóstico</h4>
              <p className="text-xs text-gray-600">Análisis detallado</p>
            </div>
          </div>
          <p className="text-sm text-gray-700 mb-4">
            Ejecuta un diagnóstico completo y muestra información detallada en la consola.
          </p>
          <button
            onClick={handleDiagnostics}
            disabled={isDiagnosing || !callData || callData.length === 0}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
              isDiagnosing || !callData || callData.length === 0
                ? 'bg-orange-300 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg'
            }`}
          >
            {isDiagnosing ? (
              <span className="flex items-center justify-center">
                <Activity className="w-4 h-4 mr-2 animate-bounce" />
                Diagnosticando...
              </span>
            ) : (
              '🔍 Diagnosticar Sistema'
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Ver resultados en la consola del navegador (F12)
          </p>
        </div>
      </div>

      {/* Información de Estado */}
      <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <Database className="w-5 h-5 mr-2 text-gray-700" />
          Estado Actual del Sistema
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Llamadas Totales</p>
            <p className="text-2xl font-bold text-gray-900">
              {callMetrics?.totalCalls || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Llamadas Exitosas</p>
            <p className="text-2xl font-bold text-teal-600">
              {callMetrics?.successfulCalls || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Tasa de Éxito</p>
            <p className="text-2xl font-bold text-blue-600">
              {callMetrics?.totalCalls > 0 
                ? Math.round((callMetrics.successfulCalls / callMetrics.totalCalls) * 100) 
                : 0}%
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Registros en Memoria</p>
            <p className="text-2xl font-bold text-purple-600">
              {callData?.length || 0}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AppTestsTab = () => {
  const [report, setReport] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const { user } = useAuth();
  const users = useUserManagementStore(state => state.users);
  const operators = useAppStore(state => state.operators);
  const operatorAssignments = useAppStore(state => state.operatorAssignments);
  const callData = useCallStore(state => state.callData);

  const statusStyles = {
    OK: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: CheckCircle },
    WARN: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertTriangle },
    FAIL: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: XCircle },
    SKIPPED: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', icon: EyeOff },
  };

  const formatMs = (value) => `${value.toFixed(1)} ms`;

  const normalizeEmail = (value) => (value || '').trim().toLowerCase();

  const buildAssignmentsSnapshotForAudit = () =>
    buildCanonicalAssignmentsSnapshot({
      operators: operators || [],
      assignments: operatorAssignments || {},
    });

  // Export helpers (read-only, sin normalizar ni mutar estado)
  const downloadJSON = (filename, data) => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exportando JSON', err);
    }
  };

  const buildUsersSnapshot = () =>
    Array.isArray(users)
      ? users.map((u) => ({
          id: u?.id ?? null,
          uuid: u?.uid ?? u?.id ?? null,
          email: u?.email ?? null,
          role: u?.role ?? u?.userRole ?? null,
          status: u?.status ?? (u?.isActive === false ? 'inactive' : 'active'),
        }))
      : [];

  const buildOperatorsSnapshot = () =>
    Array.isArray(operators)
      ? operators.map((op) => ({
          operatorId: op?.id ?? null,
          userId: op?.userId ?? null,
          status: op?.status ?? (op?.isActive === false ? 'inactive' : 'active'),
        }))
      : [];

  const buildOperatorAssignmentsSnapshot = () => operatorAssignments || {};

  const buildMetricsSnapshotForAudit = (canonicalSnapshot) => {
    const operatorMeta = new Map();
    (canonicalSnapshot?.operators || []).forEach((op) => {
      operatorMeta.set(op.id, {
        email: op.email,
        name: op.name || op.displayName || op.email || op.id,
      });
    });

    const flatAssignments = Object.entries(canonicalSnapshot?.assignmentsByOperatorId || {}).flatMap(
      ([operatorId, list]) => {
        const meta = operatorMeta.get(operatorId) || {};
        if (!Array.isArray(list)) return [];
        return list
          .filter(Boolean)
          .map((assignment) => ({
            operatorId,
            operatorEmail: meta.email,
            operatorName: meta.name,
            beneficiaryId: assignment?.beneficiaryId || assignment?.id,
            beneficiaryName:
              assignment?.beneficiary ||
              assignment?.beneficiaryName ||
              assignment?.name ||
              assignment?.nombre,
            phone: assignment?.phone || assignment?.primaryPhone || assignment?.telefono,
            commune: assignment?.commune || assignment?.comuna,
          }));
      }
    );

    const hasCalls = Array.isArray(callData) && callData.length > 0;
    const hasAssignments = flatAssignments.length > 0;
    if (!hasCalls && !hasAssignments) return null;

    return computeGlobalSnapshot({
      calls: Array.isArray(callData) ? callData : [],
      assignments: flatAssignments,
      operators: (canonicalSnapshot?.operators || []).map((op) => ({
        id: op.id,
        email: op.email,
        name: op.name || op.displayName || op.email || op.id,
        displayName: op.displayName || op.name,
      })),
    });
  };

  const handleExportUsers = () => downloadJSON('usersSnapshot.json', buildUsersSnapshot());
  const handleExportOperators = () => downloadJSON('operatorsSnapshot.json', buildOperatorsSnapshot());
  const handleExportAssignments = () => downloadJSON('operatorAssignmentsSnapshot.json', buildOperatorAssignmentsSnapshot());
  const handleExportMetrics = () => {
    const canonicalSnapshot = buildAssignmentsSnapshotForAudit();
    const metricsSnapshot = buildMetricsSnapshotForAudit(canonicalSnapshot);
    if (metricsSnapshot) {
      const minimal = {
        totalCalls: metricsSnapshot.calls?.totalCalls ?? 0,
        successfulCalls: metricsSnapshot.calls?.successfulCalls ?? 0,
        failedCalls: metricsSnapshot.calls?.failedCalls ?? 0,
        raw: metricsSnapshot,
      };
      downloadJSON('metricsSnapshot.json', minimal);
    }
  };

  const buildAuditContext = () => {
    const canonicalSnapshot = buildAssignmentsSnapshotForAudit();
    const profile = (() => {
      const email = normalizeEmail(user?.email);
      if (!email || !Array.isArray(users)) return null;
      return users.find((u) => normalizeEmail(u?.email) === email) || null;
    })();

    return {
      environment: import.meta?.env?.MODE || 'unknown',
      currentUser: user,
      userProfile: profile,
      users,
      operators,
      assignmentsSnapshot: canonicalSnapshot,
      metricsSnapshot: buildMetricsSnapshotForAudit(canonicalSnapshot),
    };
  };

  const handleRunAudit = async () => {
    setRunning(true);
    setError(null);
    try {
      const context = buildAuditContext();
      const result = await auditService.runAudit(context);
      setReport(result);
    } catch (err) {
      setError(err?.message || 'Error ejecutando la auditoría');
    } finally {
      setRunning(false);
    }
  };

  const summary = report?.summary;

  return (
    <motion.div
      key="appTests"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl shadow-lg p-8 space-y-6"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Pruebas APP (Auditoría Interna)</h3>
          <p className="text-sm text-gray-600">Ejecución manual, solo visible para SUPER_ADMIN.</p>
        </div>
        <button
          onClick={handleRunAudit}
          disabled={running}
          className={`inline-flex items-center px-4 py-2 rounded-lg font-semibold text-white transition-colors ${
            running ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >
          {running ? 'Ejecutando...' : 'Ejecutar Auditoría del Sistema'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={handleExportUsers}
          className="border border-slate-200 rounded-lg p-3 text-sm text-slate-800 hover:bg-slate-50 text-left"
        >
          Exportar usersSnapshot.json
        </button>
        <button
          onClick={handleExportOperators}
          className="border border-slate-200 rounded-lg p-3 text-sm text-slate-800 hover:bg-slate-50 text-left"
        >
          Exportar operatorsSnapshot.json
        </button>
        <button
          onClick={handleExportAssignments}
          className="border border-slate-200 rounded-lg p-3 text-sm text-slate-800 hover:bg-slate-50 text-left"
        >
          Exportar operatorAssignmentsSnapshot.json
        </button>
        <button
          onClick={handleExportMetrics}
          className="border border-slate-200 rounded-lg p-3 text-sm text-slate-800 hover:bg-slate-50 text-left"
        >
          Exportar metricsSnapshot.json
        </button>
      </div>

      {running && (
        <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Ejecutando checks internos...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Total checks</p>
            <p className="text-2xl font-bold text-slate-900">{summary.total}</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-xs text-green-700">OK</p>
            <p className="text-2xl font-bold text-green-800">{summary.ok}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs text-amber-700">WARN</p>
            <p className="text-2xl font-bold text-amber-800">{summary.warn}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-xs text-red-700">FAIL</p>
            <p className="text-2xl font-bold text-red-800">{summary.fail}</p>
            <p className="text-xs text-red-600 mt-1">{formatMs(summary.durationMs)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-600">SKIPPED</p>
            <p className="text-2xl font-bold text-slate-800">{summary.skipped}</p>
          </div>
        </div>
      )}

      {report && (
        <div className="space-y-3">
          {report.results.map((item) => {
            const style = statusStyles[item.status] || statusStyles.WARN;
            const Icon = style.icon;
            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-lg border ${style.border} ${style.bg} p-4`}
              >
                <Icon className={`w-5 h-5 ${style.text}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-semibold ${style.text}`}>{item.label}</p>
                      <p className="text-xs text-slate-500">ID: {item.id}</p>
                    </div>
                    <span className="text-xs text-slate-600">{formatMs(item.durationMs)}</span>
                  </div>
                  {(item.summary || item.details || item.remediationHint) && (
                    <div className="mt-1 space-y-1">
                      {item.summary && <p className="text-sm text-slate-800">{item.summary}</p>}
                      {item.details && <p className="text-sm text-slate-700">{item.details}</p>}
                      {item.remediationHint && (
                        <p className="text-xs text-slate-500">Sugerencia: {item.remediationHint}</p>
                      )}
                      {Array.isArray(item.affectedEntities) && item.affectedEntities.length > 0 && (
                        <p className="text-xs text-slate-500">Entidades afectadas: {item.affectedEntities.length}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!report && !running && !error && (
        <div className="text-sm text-slate-600 bg-slate-50 border border-dashed border-slate-200 rounded-lg p-4">
          Ejecuta la auditoría para ver resultados. No se ejecuta automáticamente.
        </div>
      )}
    </motion.div>
  );
};

const SystemTab = () => {
  return (
    <motion.div
      key="system"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl shadow-lg p-8"
    >
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Configuración del Sistema</h3>
      <p className="text-gray-600">Panel de configuración del sistema próximamente disponible.</p>
    </motion.div>
  );
};

const SecurityTab = () => {
  return (
    <motion.div
      key="security"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl shadow-lg p-8"
    >
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Configuración de Seguridad</h3>
      <p className="text-gray-600">Panel de seguridad próximamente disponible.</p>
    </motion.div>
  );
};

export default SuperAdminDashboard;