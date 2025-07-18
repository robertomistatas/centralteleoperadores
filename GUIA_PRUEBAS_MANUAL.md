# 🧪 GUÍA DE PRUEBAS MANUALES - Central Teleoperadores

## 📋 **Instrucciones de Uso**
Sigue estos pasos para probar sistemáticamente todas las funcionalidades.

---

## 🔍 **PRUEBA 1: Verificación Inicial (2 min)**

### **Objetivo**: Confirmar que la aplicación carga correctamente

### **Pasos**:
1. ✅ Ve a: http://localhost:5173/centralteleoperadores/
2. ✅ Verifica que la página carga sin errores
3. ✅ Abre DevTools (F12) → Console
4. ✅ Confirma que no hay errores rojos críticos
5. ✅ Busca el mensaje de estado de Firebase:
   - 🔵 "Modo Local" = Firebase configurándose
   - 🟢 "Conectado a Firebase" = Todo funcionando

### **Resultado Esperado**:
- [x] Página carga completamente
- [x] UI se renderiza correctamente
- [x] Sin errores críticos
- [x] Estado de Firebase visible

---

## 🔐 **PRUEBA 2: Sistema de Autenticación (3 min)**

### **Objetivo**: Verificar login, registro y persistencia de sesión

### **Pasos**:

#### **2A. Registro de Usuario Nuevo**
1. ✅ En la pantalla de login, busca opción "Crear cuenta" o similar
2. ✅ Llena el formulario:
   - **Email**: `prueba$(fecha)@test.com` (ej: prueba1807@test.com)
   - **Password**: `TestPassword123!`
3. ✅ Click en "Crear cuenta" o "Registrarse"
4. ✅ Verifica que te lleva al dashboard

#### **2B. Cierre y Reapertura de Sesión**
1. ✅ Busca botón de "Logout" o "Cerrar sesión"
2. ✅ Click en logout
3. ✅ Verifica que vuelves a pantalla de login
4. ✅ Inicia sesión con las mismas credenciales
5. ✅ Confirma que accedes correctamente

#### **2C. Persistencia de Sesión**
1. ✅ Con sesión iniciada, recarga la página (F5)
2. ✅ Verifica que sigues logueado (no vuelve a login)

### **Resultado Esperado**:
- [x] Registro exitoso
- [x] Login/logout funciona
- [x] Sesión persiste al recargar

---

## 👥 **PRUEBA 3: Gestión de Operadores (5 min)**

### **Objetivo**: Crear, visualizar y gestionar operadores

### **Pasos**:

#### **3A. Acceder a Módulo de Operadores**
1. ✅ Click en pestaña "Asignaciones"
2. ✅ Verifica que se muestra lista de operadores

#### **3B. Crear Operador Nuevo**
1. ✅ Click en "Agregar Operador" o botón similar
2. ✅ Llena el formulario:
   - **Nombre**: `Test Operador $(hora)` (ej: Test Operador 17:25)
   - **Email**: `operador@test.com`
   - **Teléfono**: `+56912345678`
3. ✅ Click en "Guardar" o "Crear"
4. ✅ Verifica que aparece en la lista

#### **3C. Verificar Información del Operador**
1. ✅ Confirma que se muestra:
   - ✅ Nombre correcto
   - ✅ Email correcto
   - ✅ Teléfono correcto
   - ✅ Contador de beneficiarios (inicialmente 0)

### **Resultado Esperado**:
- [x] Módulo de operadores accesible
- [x] Creación de operador exitosa
- [x] Datos se muestran correctamente
- [x] Información persiste

---

## 📋 **PRUEBA 4: Sistema de Asignaciones (5 min)**

### **Objetivo**: Asignar beneficiarios a operadores

### **Pasos**:

#### **4A. Acceder a Gestión de Asignaciones**
1. ✅ En un operador, click "Gestionar Asignaciones"
2. ✅ Verifica que se abre modal/sección de asignaciones

#### **4B. Agregar Beneficiario**
1. ✅ Click en "Agregar Beneficiario" o similar
2. ✅ Llena el formulario:
   - **Beneficiario**: `María Silva Test`
   - **Teléfono**: `987654321`
   - **Comuna**: `Santiago`
3. ✅ Click en "Guardar"
4. ✅ Verifica que aparece en la lista de asignaciones

#### **4C. Agregar Segundo Beneficiario**
1. ✅ Repite proceso con:
   - **Beneficiario**: `Juan Pérez Test`
   - **Teléfono**: `987654322`
   - **Comuna**: `Valparaíso`

#### **4D. Verificar Contador**
1. ✅ Cierra modal de asignaciones
2. ✅ Verifica que el operador muestra "2 beneficiarios"

### **Resultado Esperado**:
- [x] Asignaciones se crean correctamente
- [x] Datos se guardan
- [x] Contador se actualiza
- [x] Lista se muestra bien

---

## 📊 **PRUEBA 5: Dashboard y Métricas (3 min)**

### **Objetivo**: Verificar estadísticas y visualización de datos

### **Pasos**:
1. ✅ Click en pestaña "Dashboard"
2. ✅ Verifica que se muestran:
   - ✅ Métricas de llamadas (números)
   - ✅ Gráficos estadísticos
   - ✅ Resumen de actividad
   - ✅ Indicadores de rendimiento
3. ✅ Verifica que los números tienen sentido
4. ✅ Confirma que la UI es responsiva

### **Resultado Esperado**:
- [x] Dashboard se carga completamente
- [x] Métricas se muestran
- [x] Gráficos funcionan
- [x] Datos son coherentes

---

## 📞 **PRUEBA 6: Registro de Llamadas (4 min)**

### **Objetivo**: Probar funcionalidad de registro de llamadas

### **Pasos**:

#### **6A. Acceder a Registro**
1. ✅ Click en pestaña "Registro de Llamadas"
2. ✅ Verifica que se muestra interfaz de llamadas

#### **6B. Agregar Nueva Llamada**
1. ✅ Click en "Nueva Llamada" o similar
2. ✅ Llena datos de prueba:
   - **Operador**: Selecciona uno existente
   - **Beneficiario**: Selecciona uno existente
   - **Tipo**: Selecciona opción
   - **Observaciones**: `Llamada de prueba $(hora)`
3. ✅ Guarda la llamada

#### **6C. Verificar Funciones**
1. ✅ Prueba búsqueda por beneficiario
2. ✅ Prueba filtros (por fecha, operador, etc.)
3. ✅ Verifica que se muestran detalles

### **Resultado Esperado**:
- [x] Registro de llamadas funcional
- [x] Nueva llamada se guarda
- [x] Búsqueda funciona
- [x] Filtros operativos

---

## 🔄 **PRUEBA 7: Persistencia de Datos (2 min)**

### **Objetivo**: Confirmar que los datos se guardan permanentemente

### **Pasos**:
1. ✅ Con datos creados, recarga la página completa (Ctrl+F5)
2. ✅ Inicia sesión nuevamente
3. ✅ Verifica que todos los datos siguen ahí:
   - ✅ Operadores creados
   - ✅ Asignaciones realizadas
   - ✅ Llamadas registradas
4. ✅ Ve a Firebase Console para verificar datos en la nube

### **Resultado Esperado**:
- [x] Datos persisten al recargar
- [x] Sesión se mantiene
- [x] Información en Firebase Console

---

## 📂 **PRUEBA 8: Importación Excel (Opcional)**

### **Objetivo**: Probar carga masiva de datos

### **Pasos**:
1. ✅ Busca función "Importar Excel"
2. ✅ Crea archivo Excel de prueba con columnas:
   - Beneficiario | Teléfono | Comuna
3. ✅ Prueba importación
4. ✅ Verifica que datos se cargan correctamente

---

## 📊 **REGISTRO DE RESULTADOS**

### ✅ **PRUEBAS EXITOSAS**
- [ ] Verificación Inicial
- [ ] Autenticación
- [ ] Gestión Operadores
- [ ] Sistema Asignaciones
- [ ] Dashboard
- [ ] Registro Llamadas
- [ ] Persistencia Datos
- [ ] Importación Excel

### ❌ **PROBLEMAS ENCONTRADOS**
*(Anota aquí cualquier error o problema)*

### 📝 **OBSERVACIONES**
*(Notas adicionales, sugerencias de mejora)*

---

## 🎯 **CRITERIO DE ACEPTACIÓN FINAL**

### **✅ APLICACIÓN APROBADA SI:**
- Al menos 7/8 pruebas exitosas
- No hay errores críticos que impidan el uso
- Datos se persisten correctamente
- UI es intuitiva y funcional

### **📈 MÉTRICAS DE ÉXITO:**
- **Funcionalidad**: > 90% operativa
- **UX**: Navegación fluida
- **Performance**: Respuesta < 2 segundos
- **Persistencia**: 100% de datos se guardan

---

**🏁 ¡Comencemos las pruebas!**
