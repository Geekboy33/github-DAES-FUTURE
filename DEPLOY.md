# Guía de Despliegue a GitHub

## Paso 1: Crear Repositorio en GitHub

1. Ve a [GitHub](https://github.com)
2. Click en el botón "+" → "New repository"
3. Nombre: `corebanking-system` (o el que prefieras)
4. Descripción: "Professional banking system with advanced binary processing and hex viewer"
5. Público o Privado (tu elección)
6. **NO** marques "Add a README file" (ya tenemos uno)
7. Click "Create repository"

## Paso 2: Inicializar Git Localmente

Desde la carpeta del proyecto, ejecuta:

```bash
# Inicializar repositorio git
git init

# Agregar todos los archivos
git add .

# Hacer el primer commit
git commit -m "Initial commit: CoreBanking System with advanced binary viewer"

# Renombrar la rama a main
git branch -M main
```

## Paso 3: Conectar con GitHub

Reemplaza `USUARIO` con tu nombre de usuario de GitHub:

```bash
# Agregar el repositorio remoto
git remote add origin https://github.com/USUARIO/corebanking-system.git

# Subir los archivos
git push -u origin main
```

## Paso 4: Verificar

1. Refresca tu página de GitHub
2. Deberías ver todos los archivos del proyecto
3. El README.md se mostrará automáticamente

## Configuración de Variables de Entorno

⚠️ **IMPORTANTE**: El archivo `.env` no se sube a GitHub (está en `.gitignore`)

Los usuarios que clonen tu repositorio deberán:

1. Copiar `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configurar sus propias credenciales de Supabase en `.env`

## Commits Futuros

Para subir cambios futuros:

```bash
# Ver cambios
git status

# Agregar archivos modificados
git add .

# Hacer commit con mensaje descriptivo
git commit -m "Descripción de los cambios"

# Subir a GitHub
git push
```

## Buenas Prácticas

### Mensajes de Commit

Use mensajes descriptivos:
- ✅ `feat: add entropy analysis to hex viewer`
- ✅ `fix: resolve authentication error in binary reader`
- ✅ `docs: update README with new features`
- ❌ `update`
- ❌ `fix stuff`

### Branches

Para features grandes, usa branches:

```bash
# Crear branch
git checkout -b feature/nueva-funcionalidad

# Trabajar en el branch
git add .
git commit -m "feat: implementar nueva funcionalidad"

# Subir branch
git push -u origin feature/nueva-funcionalidad

# Luego crear Pull Request en GitHub
```

## Despliegue a Producción

### Opción 1: Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Importa tu repositorio de GitHub
3. Vercel detectará automáticamente Vite
4. Agrega variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

### Opción 2: Netlify

1. Ve a [netlify.com](https://netlify.com)
2. "Add new site" → "Import existing project"
3. Conecta GitHub
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Agrega variables de entorno
7. Deploy

### Opción 3: GitHub Pages

```bash
# Instalar gh-pages
npm install --save-dev gh-pages

# Agregar a package.json scripts:
# "predeploy": "npm run build",
# "deploy": "gh-pages -d dist"

# Actualizar vite.config.ts con base: '/corebanking-system/'

# Deploy
npm run deploy
```

## Actualizar Dependencias

```bash
# Ver paquetes desactualizados
npm outdated

# Actualizar todos
npm update

# Commit los cambios
git add package.json package-lock.json
git commit -m "chore: update dependencies"
git push
```

## Colaboración

### Aceptar Pull Requests

1. Revisa los cambios en GitHub
2. Corre los tests localmente si es necesario
3. Merge o solicita cambios
4. Elimina el branch después del merge

### Issues

Usa GitHub Issues para:
- Reportar bugs
- Solicitar features
- Discutir cambios mayores

## Seguridad

### Secretos

- ⚠️ **NUNCA** comitear `.env`
- ⚠️ **NUNCA** exponer API keys en código
- Usa GitHub Secrets para CI/CD
- Rota credenciales si se exponen accidentalmente

### GitHub Security

Habilita:
- Dependabot alerts
- Code scanning
- Secret scanning

## Respaldo

```bash
# Clonar todo (incluyendo branches)
git clone --mirror https://github.com/USUARIO/corebanking-system.git

# Restaurar desde mirror
cd corebanking-system.git
git push --mirror https://github.com/USUARIO/corebanking-system-backup.git
```

## Comandos Útiles

```bash
# Ver historial
git log --oneline --graph

# Deshacer último commit (mantener cambios)
git reset --soft HEAD~1

# Ver diferencias
git diff

# Ver branches
git branch -a

# Cambiar de branch
git checkout nombre-branch

# Eliminar branch local
git branch -d nombre-branch

# Eliminar branch remoto
git push origin --delete nombre-branch
```

## Soporte

Si tienes problemas:
1. Revisa el estado: `git status`
2. Verifica el remoto: `git remote -v`
3. Consulta documentación de Git
4. Busca en Stack Overflow
