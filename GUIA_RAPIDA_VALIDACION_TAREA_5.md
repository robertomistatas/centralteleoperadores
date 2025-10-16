# ⚡ GUÍA RÁPIDA: VALIDACIÓN TAREA 5

**Tiempo estimado:** 15-20 minutos  
**Requisitos:** Super Admin account, npm instalado

---

## 🚀 PASO A PASO

### 1️⃣ **Iniciar Servidor** (2 min)

```powershell
# Navegar a carpeta del proyecto
cd "c:\Users\rober\Seguimiento teleasistencia\centralteleoperadores"

# Instalar dependencias (si es primera vez)
npm install

# Iniciar servidor de desarrollo
npm run dev
```

**Esperar mensaje:**
```
  VITE v5.4.19  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### 2️⃣ **Login Super Admin** (1 min)

1. Abrir navegador: `http://localhost:5173`
2. Ingresar credenciales Super Admin
3. Verificar que aparece dashboard principal

---

### 3️⃣ **Verificar Métricas Dashboard** (2 min)

En **Dashboard Global**:

1. Anotar valor "Total Llamadas": `______`
2. Anotar valor "Tasa de Éxito": `______%`
3. Anotar valor "Beneficiarios Únicos": `______`
4. Verificar badge "⚡ Métricas Unificadas" visible

---

### 4️⃣ **Verificar Métricas Auditoría** (2 min)

Navegar a **Auditoría Avanzada**:

1. Anotar valor "Total Llamadas": `______`
2. Anotar valor "Tasa de Éxito": `______%`
3. Comparar con Dashboard:
   - ¿Son idénticos? [ ] SÍ  [ ] NO
4. Verificar badge "⚡ Métricas Unificadas" visible

---

### 5️⃣ **Verificar Métricas Historial** (2 min)

Navegar a **Historial de Seguimientos**:

1. Buscar sección de estadísticas generales
2. Anotar "Total Llamadas": `______`
3. Anotar "Tasa Éxito": `______%`
4. Comparar con Dashboard y Auditoría:
   - ¿Todos idénticos? [ ] SÍ  [ ] NO

---

### 6️⃣ **Calcular Diferencia** (1 min)

```
Fórmula: |Dashboard - Auditoría| / Dashboard * 100

Total Llamadas:
  Dashboard: [____]
  Auditoría: [____]
  Diferencia: |[____] - [____]| / [____] * 100 = [____]%

Tasa Éxito:
  Dashboard: [____]%
  Auditoría: [____]%
  Diferencia: |[____] - [____]| / [____] * 100 = [____]%

✅ Criterio de Éxito: Todas las diferencias ≤ 0.01%
```

**Estado:** [ ] ✅ APROBADO  [ ] ⚠️ REQUIERE REVISIÓN

---

### 7️⃣ **Prueba Sincronización Realtime** (5 min)

#### **Opción A: Subir Excel**

1. Preparar archivo Excel de prueba con 10-20 registros
2. Navegar a **Análisis de Excel**
3. Anotar hora actual: `[HH:MM:SS]`
4. Subir Excel
5. Esperar mensaje "Procesado correctamente"
6. **SIN HACER F5**, navegar a Dashboard
7. Anotar hora actualización Dashboard: `[HH:MM:SS]`
8. Calcular latencia: `[____] segundos`
9. Navegar a Auditoría → verificar actualización automática
10. Navegar a Historial → verificar actualización automática

**Latencia medida:** `[____]ms`  
**Criterio:** < 2000ms → [ ] ✅ APROBADO  [ ] ⚠️ LENTO

#### **Opción B: Agregar Seguimiento Manual**

1. Navegar a módulo de Seguimientos
2. Crear nuevo seguimiento:
   - Beneficiario: "Test Usuario"
   - Operadora: (seleccionar cualquiera)
   - Resultado: "exitosa"
3. Guardar
4. **SIN HACER F5**, navegar a Dashboard
5. Verificar que total aumentó en +1
6. Navegar a Auditoría → verificar +1
7. Navegar a Historial → verificar nuevo seguimiento visible

**¿Sincronización sin F5?** [ ] ✅ SÍ  [ ] ❌ NO

---

### 8️⃣ **Verificar Logs de Auditoría** (2 min)

1. Abrir DevTools: **F12**
2. Ir a pestaña **Console**
3. Filtrar por `[ConsistencyTest]`
4. Verificar logs presentes:
   - [ ] `[ConsistencyTest] Iniciando validación`
   - [ ] `[ConsistencyTest] Datos normalizados`
   - [ ] `[ConsistencyTest] Validación completada`

5. Ir a pestaña **Application** → **Local Storage** → `http://localhost:5173`
6. Buscar key `app_logs`
7. Verificar eventos con `"level": "audit"`

**Logs completos:** [ ] ✅ SÍ  [ ] ❌ NO

---

### 9️⃣ **Ejecutar npm run lint** (1 min)

```powershell
npm run lint
```

**Resultado esperado:**
```
✔ No errors found
✔ No warnings found
```

**Estado:** [ ] ✅ 0 errors  [ ] ⚠️ Errores encontrados

---

### 🔟 **Capturar Evidencia** (3 min)

Tomar screenshots (tecla **Print Screen** o **Win+Shift+S**):

1. **Dashboard** mostrando métricas
2. **Auditoría** mostrando métricas idénticas
3. **Historial** mostrando métricas idénticas
4. **Console** con logs `[ConsistencyTest]`
5. **Local Storage** mostrando `app_logs`

Guardar en carpeta: `docs/validacion/tarea5/`

---

## ✅ CHECKLIST FINAL

Marcar con ✅ cada item completado:

### **Consistencia de Métricas:**
- [ ] Dashboard muestra métricas correctas
- [ ] Auditoría muestra métricas idénticas
- [ ] Historial muestra métricas idénticas
- [ ] Diferencia calculada ≤ 0.01%
- [ ] Badge "⚡ Métricas Unificadas" visible en 2+ módulos

### **Sincronización Realtime:**
- [ ] Subir Excel → actualización automática sin F5
- [ ] Latencia medida < 2000ms
- [ ] Todos los módulos actualizados simultáneamente

### **Validación Código:**
- [ ] `npm run lint` → 0 errors
- [ ] No hay warnings en console
- [ ] Logs de auditoría completos

### **Evidencia:**
- [ ] Screenshots capturados (mínimo 5)
- [ ] Guardados en carpeta `docs/validacion/tarea5/`

---

## 📊 PLANTILLA DE RESULTADOS

```
=== VALIDACIÓN TAREA 5 - RESULTADOS ===
Fecha: 2025-10-16
Hora: [HH:MM]
Validador: [tu nombre]

MÉTRICAS:
  Dashboard:  [____] llamadas, [____]% éxito
  Auditoría:  [____] llamadas, [____]% éxito
  Historial:  [____] llamadas, [____]% éxito
  
  Diferencia: [____]% (criterio: ≤ 0.01%)

SINCRONIZACIÓN:
  Latencia: [____]ms (criterio: < 2000ms)
  Actualización automática: [ ] SÍ  [ ] NO

CÓDIGO:
  ESLint: [ ] 0 errors  [ ] Errores
  Warnings: [ ] 0  [ ] Presentes

ESTADO FINAL:
  [ ] ✅ APROBADO - Todos los criterios cumplidos
  [ ] ⚠️ APROBADO CON OBSERVACIONES - Ver notas
  [ ] ❌ REQUIERE CORRECCIONES - Ver issues

OBSERVACIONES:
[                                              ]
[                                              ]

PRÓXIMOS PASOS:
[ ] Continuar con TAREA 6 (Optimizaciones)
[ ] Corregir issues encontrados
[ ] Documentar hallazgos adicionales
```

---

## 🆘 SI ALGO NO FUNCIONA

### **Error: "Cannot find module 'consistencyTest'"**

```powershell
# Verificar que el archivo existe
ls src/tests/consistencyTest.js

# Si no existe, revisar si hay typo en nombre o ubicación
```

### **Panel de Validación no aparece**

Verificar que estás logueado como **Super Admin** (no Admin normal).

### **Métricas diferentes entre módulos**

1. Abrir `FASE_4_TAREA_5_VALIDACION_CONSISTENCIA.md`
2. Ir a sección "TROUBLESHOOTING"
3. Seguir pasos de diagnóstico

### **Latencia > 2000ms**

Verificar:
- Conexión a internet estable
- Firestore rules permiten lectura realtime
- `realtimeSync.js` inicializado correctamente

---

## 📞 CONTACTO

Si encuentras problemas:

1. Revisar documentación completa:
   - `FASE_4_TAREA_5_VALIDACION_CONSISTENCIA.md`
   - `FASE_4_TAREA_5_RESUMEN.md`
   - `src/tests/README.md`

2. Revisar logs de auditoría en console y localStorage

3. Ejecutar diagnóstico:
   ```javascript
   // En console del navegador:
   window.diagnosticDataStructure?.()
   ```

---

## ⏱️ TIEMPO TOTAL ESTIMADO

- Inicio servidor: 2 min
- Login: 1 min
- Verificación métricas: 6 min
- Sincronización realtime: 5 min
- Logs: 2 min
- ESLint: 1 min
- Screenshots: 3 min

**TOTAL: ~20 minutos**

---

**¡Éxito en la validación! 🎉**

Última actualización: 2025-10-16
