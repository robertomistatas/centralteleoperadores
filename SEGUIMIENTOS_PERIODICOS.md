# 📞 Módulo de Seguimientos Periódicos

## 📋 Descripción

El módulo de **Seguimientos Periódicos** permite a teleoperadoras gestionar eficientemente su cartera de beneficiarios asignados, registrar contactos y mantener un seguimiento personalizado según reglas de negocio específicas.

## 🎯 Características Principales

### 📊 Dashboard Personalizado
- **Vista por rol**: Teleoperadoras ven solo sus beneficiarios, administradores ven todo
- **Métricas en tiempo real**: KPIs de estado según reglas de 15/30 días
- **Filtros dinámicos**: Por estado, búsqueda de texto, etc.
- **Diseño responsivo**: Optimizado para desktop y móvil

### 📈 Métricas de Estado
| Estado | Criterio | Color | Descripción |
|--------|----------|-------|-------------|
| **Al día** | ≤ 15 días | 🟢 Verde | Última llamada exitosa en los últimos 15 días |
| **Pendiente** | 16-30 días | 🟡 Amarillo | Último contacto exitoso entre 16-30 días |
| **Urgente** | > 30 días | 🔴 Rojo | Sin contacto exitoso en más de 30 días |

### 🏷️ Tipos de Contacto
- **Llamada Telefónica** - Contacto tradicional por voz
- **Video Llamada** - Contacto visual (WhatsApp, Zoom, etc.)
- **WhatsApp** - Mensajería instantánea
- **Visita Presencial** - Contacto cara a cara

### 📝 Resultados de Contacto
- **Exitoso** - Conversación completa con el beneficiario
- **No Responde** - Teléfono suena pero no contestan
- **Línea Ocupada** - Línea ocupada o fuera de servicio
- **Mensaje Dejado** - Se dejó mensaje o se habló con tercero
- **Llamada Fallida** - Error técnico o número inválido

## 🔧 Arquitectura Técnica

### 📂 Estructura de Componentes
```
src/components/seguimientos/
├── TeleoperadoraDashboard.jsx    # Componente principal
├── MetricCard.jsx                # Tarjetas de KPIs
├── BeneficiaryCard.jsx          # Tarjeta de beneficiario
├── NewContactForm.jsx           # Formulario de nuevo contacto
└── index.js                     # Barrel exports
```

### 🗄️ Servicio de Datos
```
src/services/
└── seguimientoService.js        # CRUD y lógica de negocio
```

### 🔥 Estructura Firestore
```
Collection: seguimientos
├── beneficiarioId: string
├── beneficiario: string
├── telefono: string
├── tipoContacto: 'llamada'|'videollamada'|'whatsapp'|'presencial'
├── tipoResultado: 'exitoso'|'fallido'|'no-respuesta'|'ocupado'|'mensaje'
├── observaciones: string
├── fechaContacto: timestamp
├── operadorId: string
├── operador: string
├── userId: string
├── createdAt: timestamp
└── updatedAt: timestamp
```

## 🛡️ Seguridad y Permisos

### 🔐 Reglas de Firestore
```javascript
match /seguimientos/{document} {
  allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
}
```

### 👥 Control de Acceso
- **Teleoperadoras**: Solo ven sus beneficiarios asignados y seguimientos
- **Administradores**: Acceso completo a todos los datos
- **Filtrado automático**: Basado en rol del usuario logueado

## 🚀 Uso del Módulo

### 1️⃣ Acceso
- Iniciar sesión en la aplicación
- Ir a **"Seguimientos Periódicos"** en el menú lateral

### 2️⃣ Ver Métricas
- Las tarjetas superiores muestran KPIs en tiempo real
- Colores indican prioridad de atención

### 3️⃣ Gestionar Beneficiarios
- **Buscar**: Por nombre, teléfono o comuna
- **Filtrar**: Por estado (Al día, Pendientes, Urgentes)
- **Ver historial**: Expandir tarjeta de beneficiario

### 4️⃣ Registrar Contacto
1. Hacer clic en **"Nuevo Contacto"** o botón en tarjeta
2. Seleccionar beneficiario (si no está preseleccionado)
3. Elegir tipo de contacto y resultado
4. Agregar observaciones
5. Guardar

### 5️⃣ Seguimiento Automático
- Los estados se actualizan automáticamente según fechas
- Las métricas se recalculan en tiempo real
- El historial mantiene trazabilidad completa

## 📊 Métricas y Reportes

### 🎯 KPIs Disponibles
- **Total Beneficiarios**: Cantidad asignada a la teleoperadora
- **Al Día**: Beneficiarios con seguimiento actualizado
- **Pendientes**: Requieren contacto pronto
- **Urgentes**: Requieren atención inmediata

### 📈 Visualización
- **Tarjetas animadas**: Con Framer Motion
- **Barras de progreso**: Porcentajes visuales
- **Colores distintivos**: Identificación rápida de prioridades

## 🔄 Integración

### 📱 Con Módulos Existentes
- **Asignaciones**: Obtiene beneficiarios asignados automáticamente
- **Teleoperadoras**: Filtrado por usuario logueado
- **Auditoría**: Los seguimientos alimentan reportes de gestión

### 🔗 APIs Utilizadas
- **Firebase Auth**: Autenticación y permisos
- **Firestore**: Almacenamiento y consultas en tiempo real
- **Zustand**: Gestión de estado global
- **Framer Motion**: Animaciones y transiciones

## 🧪 Testing

### ✅ Casos de Prueba
1. **Registro exitoso**: Crear seguimiento con datos válidos
2. **Filtrado correcto**: Verificar que teleoperadora solo ve sus datos
3. **Cálculo de estados**: Validar reglas de 15/30 días
4. **Búsqueda funcional**: Encontrar beneficiarios por diferentes criterios
5. **Persistencia**: Datos se mantienen entre sesiones

### 🔍 Debug
- Console logs detallados en desarrollo
- Manejo de errores con feedback visual
- Validación de formularios en tiempo real

## 📋 Próximas Funcionalidades

### 🎯 V2.0 Planeado
- [ ] **Recordatorios automáticos**: Notificaciones de seguimientos pendientes
- [ ] **Calendario integrado**: Vista de agenda de contactos
- [ ] **Reportes PDF**: Exportación de historiales
- [ ] **Análisis de tendencias**: Gráficos de evolución
- [ ] **Plantillas de observaciones**: Texto predefinido común
- [ ] **Integración telefónica**: Llamadas directas desde la app

### 📈 Optimizaciones
- [ ] **Paginación**: Para carteras grandes de beneficiarios
- [ ] **Cache inteligente**: Reducir consultas a Firestore
- [ ] **Offline support**: Funcionamiento sin conexión
- [ ] **Push notifications**: Alertas móviles

## 📞 Soporte

### 🆘 Resolución de Problemas
- **No veo beneficiarios**: Verificar asignaciones en módulo correspondiente
- **Error al guardar**: Revisar conexión a internet y permisos
- **Estados incorrectos**: Validar fechas de contactos exitosos

### 📧 Contacto
Para soporte técnico o reportar errores, contactar al administrador del sistema.

---

**✨ El módulo de Seguimientos Periódicos transforma la gestión manual en un proceso automatizado, eficiente y fácil de usar para teleoperadoras.**
