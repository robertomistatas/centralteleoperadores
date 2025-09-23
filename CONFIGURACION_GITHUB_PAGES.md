# 🔧 CONFIGURACIÓN MANUAL DE GITHUB PAGES

## 🚨 Problema Identificado
```
Branch "main" is not allowed to deploy to github-pages due to environment protection rules.
```

## ✅ SOLUCIÓN PASO A PASO

### **1. Configurar GitHub Pages Source**
1. Ir a: https://github.com/robertomistatas/centralteleoperadores/settings/pages
2. En **"Source"** seleccionar: **"GitHub Actions"** (NO "Deploy from a branch")
3. Guardar cambios

### **2. Configurar Permisos de Actions**
1. Ir a: https://github.com/robertomistatas/centralteleoperadores/settings/actions
2. En **"Workflow permissions"** seleccionar: **"Read and write permissions"**
3. Activar: **"Allow GitHub Actions to create and approve pull requests"**
4. Guardar cambios

### **3. Verificar Environments (Si existe)**
1. Ir a: https://github.com/robertomistatas/centralteleoperadores/settings/environments
2. Si existe un environment "github-pages":
   - Clickear en "github-pages"
   - En "Deployment branches" seleccionar "All branches" o añadir "main"
   - Guardar

### **4. Reintentar Deploy**
Después de configurar lo anterior, hacer:
```bash
git add .
git commit -m "fix: Configuración de permisos para GitHub Pages"
git push origin main
```

## 🔍 VERIFICACIÓN

- **GitHub Actions**: https://github.com/robertomistatas/centralteleoperadores/actions
- **GitHub Pages**: https://github.com/robertomistatas/centralteleoperadores/settings/pages
- **Resultado**: https://robertomistatas.github.io/centralteleoperadores/

## 📋 ARCHIVOS MODIFICADOS

1. **.github/workflows/deploy.yml** - Permisos mejorados
2. **.github/workflows/pages.yml** - Workflow alternativo más simple

---

**🎯 Una vez configurado, el deploy funcionará automáticamente en cada push a main.**
