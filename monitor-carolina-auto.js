/**
 * SCRIPT DE MONITOREO AUTOMÁTICO PARA CAROLINA
 * Detecta automáticamente cuando Carolina está logueada y verifica su estado
 */

(function() {
  console.log('🎯 Monitor automático para Carolina iniciado');
  
  let carolinaDetected = false;
  let lastCheckTime = 0;
  let checkCount = 0;
  
  const checkCarolinaStatus = () => {
    try {
      checkCount++;
      const now = Date.now();
      
      // Solo verificar cada 2 segundos para no saturar
      if (now - lastCheckTime < 2000) {
        return;
      }
      lastCheckTime = now;
      
      // Verificar si Firebase está disponible
      if (!window.firebase) {
        if (checkCount % 10 === 0) { // Log cada 10 checks
          console.log('⏳ Esperando Firebase...');
        }
        return;
      }
      
      // Verificar usuario autenticado
      const auth = window.firebase.auth();
      if (!auth || !auth.currentUser) {
        if (checkCount % 10 === 0) {
          console.log('⏳ Esperando autenticación...');
        }
        return;
      }
      
      const user = auth.currentUser;
      
      // Solo proceder si es Carolina
      if (user.email !== 'carolina@mistatas.com') {
        return;
      }
      
      if (!carolinaDetected) {
        console.log('👑 ¡CAROLINA DETECTADA! Iniciando monitoreo detallado...');
        carolinaDetected = true;
      }
      
      // Verificar estado de stores
      let storeStatus = 'N/A';
      let dataStatus = 'N/A';
      
      if (window.useAppStore) {
        const appState = window.useAppStore.getState();
        storeStatus = {
          operadores: appState.operators?.length || 0,
          asignaciones: Object.keys(appState.operatorAssignments || {}).length
        };
        
        dataStatus = (appState.operators?.length > 0 && Object.keys(appState.operatorAssignments || {}).length > 0) ? '✅ CON DATOS' : '❌ SIN DATOS';
      }
      
      // Verificar rol de permisos
      let permissionsStatus = 'N/A';
      if (window.React && window.React.version) {
        // Intentar detectar si usePermissions está siendo usado
        try {
          permissionsStatus = 'Hook disponible pero no accesible directamente';
        } catch (e) {
          permissionsStatus = 'Error accediendo hook';
        }
      }
      
      // Solo mostrar estado cada 5 checks cuando hay problema
      if (checkCount % 5 === 0 && dataStatus.includes('SIN DATOS')) {
        console.log(`🔍 ESTADO CAROLINA (Check #${checkCount}):`, {
          email: user.email,
          uid: user.uid,
          stores: storeStatus,
          estado: dataStatus,
          timestamp: new Date().toLocaleTimeString()
        });
        
        // Si no tiene datos después de varios checks, sugerir acción
        if (checkCount >= 15) {
          console.log('🚨 PROBLEMA PERSISTENTE DETECTADO');
          console.log('🔧 Ejecutar: window.fixCarolinaDataLoading()');
          console.log('🔧 O ejecutar: window.debugCarolinaTiming()');
        }
      }
      
      // Estado OK
      if (dataStatus.includes('CON DATOS') && checkCount % 10 === 0) {
        console.log('✅ Carolina con datos correctos:', storeStatus);
      }
      
    } catch (error) {
      if (checkCount % 20 === 0) { // Solo log errores ocasionalmente
        console.log('⚠️ Error en monitoreo:', error.message);
      }
    }
  };
  
  // Verificar cada segundo
  const monitorInterval = setInterval(checkCarolinaStatus, 1000);
  
  // Verificar inmediatamente
  checkCarolinaStatus();
  
  // Exponer función para parar el monitoreo
  window.stopCarolinaMonitor = () => {
    clearInterval(monitorInterval);
    console.log('🛑 Monitor de Carolina detenido');
  };
  
  console.log('👀 Monitor activo - usar window.stopCarolinaMonitor() para detener');
  
})();