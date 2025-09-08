# 🚀 Central Teleoperadores - Deploy GitHub Pages

Este proyecto está configurado para deploy automático en GitHub Pages.

## 🌐 URLs de Acceso

- **Producción (GitHub Pages):** https://robertomistatas.github.io/centralteleoperadores/
- **Desarrollo Local:** http://localhost:5173/centralteleoperadores/
- **LAN Access:** 
  - http://192.168.56.1:5173/centralteleoperadores/
  - http://192.168.0.131:5173/centralteleoperadores/

## 🔄 Deploy Automático

El deploy se ejecuta automáticamente en cada push a la rama `main` mediante GitHub Actions.

### Workflow Status
- ✅ Build automático configurado
- ✅ Deploy a GitHub Pages habilitado
- ✅ Base path configurado: `/centralteleoperadores/`

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Deploy manual (si es necesario)
npm run deploy
```

## 🏗️ Arquitectura del Deploy

1. **GitHub Actions** detecta push en `main`
2. **Node.js 18** instala dependencias
3. **Vite** compila la aplicación
4. **GitHub Pages** sirve desde `/dist`

## ✨ Características Incluidas

- 🎯 Módulo Beneficiarios Base completo
- 📊 Sistema de auditoría de llamadas
- 👥 Gestión de asignaciones de teleoperadoras
- 🔍 Herramientas de debugging avanzadas
- 🌐 Acceso LAN para testing multi-dispositivo
- 🎨 UI moderna con tema oscuro
- ⚡ Optimizaciones de rendimiento

---

**Última actualización:** $(date)  
**Commit:** 3f55de1 - Implementación completa del módulo Beneficiarios Base con LAN access
