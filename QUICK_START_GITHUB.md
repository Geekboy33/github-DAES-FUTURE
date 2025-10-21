# 🚀 INICIO RÁPIDO - Subir a GitHub

## ⚡ OPCIÓN 1: Script Automático (Más Fácil)

```bash
# Ejecutar el script
./setup-new-github-repo.sh
```

El script te guiará paso a paso:
1. ✅ Configura Git automáticamente
2. ✅ Inicializa el repositorio
3. ✅ Agrega todos los archivos
4. ✅ Crea el commit inicial
5. ✅ Conecta con GitHub
6. ✅ Sube el código

**Solo necesitas:**
- Tu nombre y email
- URL de tu repositorio en GitHub (créalo primero en https://github.com/new)

---

## ⚡ OPCIÓN 2: Manual (Comandos Rápidos)

### 1️⃣ Crear repo en GitHub
Ve a: https://github.com/new
- Nombre: `corebanking-system-v2`
- ❌ NO marcar "Initialize with README"

### 2️⃣ Ejecutar comandos

```bash
# Configurar Git
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"

# Inicializar
git init

# Agregar archivos
git add .

# Commit
git commit -m "🎉 Initial commit - CoreBanking System v2.0"

# Conectar con GitHub (reemplaza la URL)
git remote add origin https://github.com/TU-USUARIO/corebanking-system-v2.git

# Subir
git branch -M main
git push -u origin main
```

---

## 🔐 Autenticación

Cuando GitHub pida autenticación:

**Username:** tu-usuario  
**Password:** tu Personal Access Token (NO tu contraseña)

**Crear token:** https://github.com/settings/tokens
- Scopes: ✓ repo (full control)

---

## ✅ Verificar

Después de subir, ve a:
```
https://github.com/TU-USUARIO/corebanking-system-v2
```

Deberías ver:
- ✅ Todos los archivos de `src/`
- ✅ `package.json`
- ✅ `README.md`
- ✅ Documentación
- ❌ NO `node_modules/`
- ❌ NO `dist/`

---

## 📚 Documentación Completa

Para más detalles, ver: `GITHUB_SETUP_INSTRUCTIONS.md`

---

## 🆘 Problemas Comunes

### Error: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/...
```

### Error: "failed to push"
```bash
git pull origin main --allow-unrelated-histories
git push origin main
```

### Error: "Author identity unknown"
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

---

## 🎉 ¡Listo!

Tu proyecto estará en GitHub y disponible para colaboración, backup y deploy.

**¿Preguntas?** Ver documentación completa en `GITHUB_SETUP_INSTRUCTIONS.md`
