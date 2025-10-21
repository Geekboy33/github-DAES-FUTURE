# Sincronizar con GitHub Existente

## Si Ya Tienes un Repositorio en GitHub

### Opción A: Actualizar Repositorio Existente

Si ya tienes un repo de este proyecto:

```bash
# 1. Ver el estado actual
git status

# 2. Agregar todos los cambios nuevos
git add .

# 3. Hacer commit con los cambios
git commit -m "feat: add Enhanced Binary Viewer and complete documentation

- Add EnhancedBinaryViewer component with 5 view modes
- Add entropy analysis and pattern detection
- Add search functionality and bookmarks
- Add export capabilities (HEX, Base64, JSON)
- Add complete documentation (README, FEATURES, DEPLOY)
- Add automated setup script
- Update .env.example for security"

# 4. Subir cambios
git push origin main
```

### Opción B: Si el Repositorio Tiene Otro Proyecto

Si quieres guardar esto en un repo existente pero diferente:

```bash
# 1. Ver el remote actual
git remote -v

# 2. Si necesitas cambiar el remote
git remote set-url origin https://github.com/TU_USUARIO/TU_REPO.git

# 3. Agregar y hacer commit
git add .
git commit -m "feat: CoreBanking System v1.0"

# 4. Subir (puede necesitar force si hay conflictos)
git push origin main
# O si hay conflictos:
git push origin main --force
```

### Opción C: Crear Nueva Rama en Repo Existente

Para no sobrescribir el proyecto actual:

```bash
# 1. Crear nueva rama
git checkout -b corebanking-system

# 2. Agregar cambios
git add .

# 3. Hacer commit
git commit -m "feat: add CoreBanking System"

# 4. Subir la nueva rama
git push origin corebanking-system

# 5. Luego puedes crear un Pull Request en GitHub
```

## Comandos Rápidos

### Ver Estado
```bash
git status                    # Ver archivos modificados
git log --oneline            # Ver historial de commits
git remote -v                # Ver repositorio remoto
git branch                   # Ver ramas
```

### Sincronizar
```bash
git pull origin main         # Traer cambios del remote
git add .                    # Agregar todos los archivos
git commit -m "mensaje"      # Hacer commit
git push origin main         # Subir cambios
```

### Resolver Conflictos
```bash
# Si hay conflictos al hacer pull:
git pull origin main
# Edita los archivos con conflictos
git add .
git commit -m "resolve conflicts"
git push origin main
```

## Verificación Rápida

Antes de hacer push, verifica:

```bash
# 1. ¿Está .env en .gitignore?
cat .gitignore | grep .env
# Debe mostrar: .env

# 2. ¿Tienes .env.example?
ls -la | grep .env
# Debe mostrar: .env y .env.example

# 3. ¿El build funciona?
npm run build
# Debe completar sin errores

# 4. ¿Cuántos archivos se van a subir?
git status
```

## Archivos Importantes No Se Subirán

Estos archivos están protegidos en `.gitignore`:
- ✅ `.env` (tus credenciales)
- ✅ `node_modules/` (dependencias)
- ✅ `dist/` (build)
- ✅ Logs

## Si Necesitas Ayuda

### Error: "repository not found"
```bash
# Verifica el remote
git remote -v

# Si es incorrecto, cámbialo
git remote set-url origin https://github.com/USUARIO/REPO.git
```

### Error: "permission denied"
```bash
# Configura git si no lo has hecho
git config --global user.email "tu@email.com"
git config --global user.name "Tu Nombre"

# O usa SSH en lugar de HTTPS
git remote set-url origin git@github.com:USUARIO/REPO.git
```

### Error: "rejected (non-fast-forward)"
```bash
# Opción 1: Traer cambios primero
git pull origin main --rebase
git push origin main

# Opción 2: Force push (¡cuidado! sobrescribe)
git push origin main --force
```

## Verificar Después de Subir

1. Ve a tu repositorio en GitHub
2. Verifica que los archivos estén ahí
3. Lee el README.md que se mostrará automáticamente
4. Verifica que `.env` NO esté visible (seguridad)

## Comandos Todo-en-Uno

### Subir cambios rápidamente:
```bash
git add . && git commit -m "update: latest changes" && git push origin main
```

### Ver diferencias antes de commit:
```bash
git diff                      # Ver cambios en archivos
git diff --staged             # Ver cambios que se commitearán
```

### Deshacer cambios:
```bash
git checkout -- archivo.txt   # Deshacer cambios en un archivo
git reset --soft HEAD~1       # Deshacer último commit (mantener cambios)
git reset --hard HEAD~1       # Deshacer último commit (perder cambios)
```

---

¡Listo! Elige la opción que mejor se ajuste a tu situación y sigue los pasos.
