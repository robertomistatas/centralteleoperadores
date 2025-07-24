# 🚀 Instrucciones de Deploy - GitHub Pages

## 📋 Deploy Automático (Recomendado)

El deploy se ejecuta automáticamente con **GitHub Actions** cada vez que se hace push a la rama `main`.

### ✅ Configuración Actual
- **Workflow:** `.github/workflows/deploy.yml`
- **Trigger:** Push a `main` o manualmente
- **Build:** `npm run build`
- **Deploy:** GitHub Pages

### 🌐 URL de la Aplicación
```
https://robertomistatas.github.io/centralteleoperadores/
```

## 🔧 Deploy Manual (Alternativo)

Si necesitas hacer deploy manual, sigue estos pasos:

### 1. Build del proyecto
```bash
npm run build
```

### 2. Deploy con gh-pages
```bash
npm run deploy
```

### 3. Comando completo (commit + deploy)
```bash
npm run commit-and-deploy
```

## ⚙️ Configuración GitHub Pages

### 1. Habilitar GitHub Pages
1. Ve a **Settings** del repositorio
2. Sección **Pages** en el menú lateral
3. **Source:** Deploy from a branch
4. **Branch:** `gh-pages` (se crea automáticamente)
5. **Folder:** `/ (root)`

### 2. Verificar Configuración Vite
El `vite.config.js` debe tener:
```javascript
export default defineConfig({
  plugins: [react()],
  base: '/centralteleoperadores/',  // ← Nombre del repositorio
  build: {
    outDir: 'dist',
  }
})
```

## 🔍 Verificar Deploy

### 1. GitHub Actions
- Ve a la pestaña **Actions** del repositorio
- Verifica que el workflow "Deploy to GitHub Pages" se ejecute correctamente
- Status verde = deploy exitoso

### 2. GitHub Pages
- Ve a **Settings → Pages**
- Verifica que muestre: "Your site is published at https://robertomistatas.github.io/centralteleoperadores/"

### 3. URL Final
- Accede a: https://robertomistatas.github.io/centralteleoperadores/
- La aplicación debe cargar correctamente

## 🐛 Solución de Problemas

### Error: 404 Not Found
- Verifica que `base: '/centralteleoperadores/'` esté correcto en vite.config.js
- El nombre debe coincidir exactamente con el nombre del repositorio

### Error: Build Failed
- Ejecuta `npm run build` localmente para verificar errores
- Revisa los logs en GitHub Actions

### Error: Deploy Failed
- Verifica que GitHub Pages esté habilitado
- Asegúrate de que la rama `gh-pages` exista

## 📊 Status del Deploy

✅ **Configuración completada**
✅ **Workflow de GitHub Actions creado**
✅ **Build local exitoso**
✅ **Push realizado - Deploy en progreso**

---

**Próximo paso:** Habilitar GitHub Pages en la configuración del repositorio
