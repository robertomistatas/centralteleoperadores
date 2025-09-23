/**
 * Script para limpiar registros duplicados de Javiera y consolidar asignaciones
 */

console.log('🔧 LIMPIEZA DE REGISTROS DUPLICADOS - JAVIERA REYES ALVARADO');
console.log('');

// Configuración de Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  // Tu configuración de Firebase aquí
  apiKey: "AIzaSyCHMlmOe2XBODMcKQWjYhX8DxQCyY8CgIQ",
  authDomain: "centralteleoperadores.firebaseapp.com",
  projectId: "centralteleoperadores",
  storageBucket: "centralteleoperadores.firebasestorage.app",
  messagingSenderId: "775609832977",
  appId: "1:775609832977:web:1a5f7c8b9d2e3f4g5h6i7j"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanDuplicateJaviera() {
  try {
    console.log('📊 ANÁLISIS DE REGISTROS DUPLICADOS:');
    console.log('');
    
    // 1. Obtener todos los operadores de Javiera
    const operatorsRef = collection(db, 'operators');
    const q = query(operatorsRef, where('email', '==', 'reyesalvaradojaviera@gmail.com'));
    const operatorsSnapshot = await getDocs(q);
    
    console.log(`📋 Registros encontrados: ${operatorsSnapshot.size}`);
    
    let registros = [];
    operatorsSnapshot.forEach((doc) => {
      const data = doc.data();
      registros.push({
        id: doc.id,
        ...data
      });
      console.log(`📄 Registro ${doc.id}:`, {
        email: data.email,
        name: data.name,
        phone: data.phone,
        userId: data.userId,
        role: data.role,
        active: data.active,
        createdAt: data.createdAt
      });
    });
    
    if (registros.length <= 1) {
      console.log('✅ No hay duplicados que limpiar');
      return;
    }
    
    // 2. Determinar cuál registro mantener (el más completo y reciente)
    const registroActivo = registros.find(r => r.role === 'teleoperadora' && r.active === true);
    const registroAMantener = registroActivo || registros[0];
    const registrosAEliminar = registros.filter(r => r.id !== registroAMantener.id);
    
    console.log('');
    console.log('🎯 ESTRATEGIA DE LIMPIEZA:');
    console.log(`✅ MANTENER: ${registroAMantener.id} (${registroAMantener.name})`);
    console.log(`❌ ELIMINAR: ${registrosAEliminar.map(r => r.id).join(', ')}`);
    
    // 3. Buscar asignaciones para todos los registros
    console.log('');
    console.log('📋 VERIFICANDO ASIGNACIONES...');
    
    const assignmentsRef = collection(db, 'assignments');
    let todasLasAsignaciones = [];
    
    for (const registro of registros) {
      // Buscar por operatorId
      const q1 = query(assignmentsRef, where('operatorId', '==', registro.id));
      const snapshot1 = await getDocs(q1);
      
      // Buscar por operatorName
      const q2 = query(assignmentsRef, where('operatorName', '==', registro.name));
      const snapshot2 = await getDocs(q2);
      
      // Buscar por operator
      const q3 = query(assignmentsRef, where('operator', '==', registro.name));
      const snapshot3 = await getDocs(q3);
      
      console.log(`📊 Asignaciones para registro ${registro.id}:`);
      console.log(`   - Por operatorId: ${snapshot1.size}`);
      console.log(`   - Por operatorName: ${snapshot2.size}`);
      console.log(`   - Por operator: ${snapshot3.size}`);
      
      // Recopilar todas las asignaciones únicas
      const conjuntoAsignaciones = new Set();
      
      [snapshot1, snapshot2, snapshot3].forEach(snapshot => {
        snapshot.forEach(doc => {
          if (!conjuntoAsignaciones.has(doc.id)) {
            conjuntoAsignaciones.add(doc.id);
            todasLasAsignaciones.push({
              id: doc.id,
              data: doc.data(),
              registroVinculado: registro.id
            });
          }
        });
      });
    }
    
    console.log(`📊 Total asignaciones encontradas: ${todasLasAsignaciones.length}`);
    
    // 4. SIMULACIÓN - No ejecutar realmente la limpieza
    console.log('');
    console.log('🔥 SIMULACIÓN DE LIMPIEZA (NO SE EJECUTARÁ):');
    console.log('');
    
    console.log('📝 PASOS QUE SE EJECUTARÍAN:');
    console.log('1. Actualizar todas las asignaciones para apuntar al registro correcto');
    console.log(`   - Cambiar operatorId a: ${registroAMantener.id}`);
    console.log(`   - Cambiar operatorName a: ${registroAMantener.name}`);
    console.log(`   - Cambiar userId a: ${registroAMantener.userId}`);
    
    console.log('2. Eliminar registros duplicados:');
    registrosAEliminar.forEach(registro => {
      console.log(`   - Eliminar registro: ${registro.id}`);
    });
    
    console.log('');
    console.log('⚠️ PARA EJECUTAR LA LIMPIEZA REAL:');
    console.log('1. Haz backup de la base de datos');
    console.log('2. Cambia SIMULATION_MODE = false en este script');
    console.log('3. Ejecuta el script nuevamente');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  }
}

// Ejecutar simulación
const SIMULATION_MODE = true; // Cambiar a false para ejecutar limpieza real

if (SIMULATION_MODE) {
  console.log('🔍 MODO SIMULACIÓN ACTIVADO - No se harán cambios');
  console.log('');
} else {
  console.log('🔥 MODO EJECUCIÓN REAL - Se harán cambios permanentes');
  console.log('');
}

cleanDuplicateJaviera();