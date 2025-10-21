#!/bin/bash

# Script para sincronizar cambios con GitHub
# Uso: ./sync-changes.sh "mensaje del commit"

set -e

echo "🔄 Sincronizando con GitHub..."
echo ""

# Verificar si git está inicializado
if [ ! -d ".git" ]; then
    echo "❌ Error: Este directorio no es un repositorio git"
    echo "Primero ejecuta: git init"
    exit 1
fi

# Verificar si hay cambios
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ No hay cambios para sincronizar"
    exit 0
fi

# Mensaje de commit
if [ -z "$1" ]; then
    COMMIT_MSG="update: sync changes to GitHub"
else
    COMMIT_MSG="$1"
fi

echo "📝 Cambios detectados:"
git status --short
echo ""

# Verificar que .env no se vaya a subir
if git status --porcelain | grep -q "^?? .env$\|^A  .env$\|^M  .env$"; then
    echo "⚠️  ADVERTENCIA: .env está en los cambios"
    echo "Verificando .gitignore..."

    if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
        echo "❌ ERROR: .env no está en .gitignore"
        echo "Agregando .env a .gitignore..."
        echo ".env" >> .gitignore
    fi

    # Remover .env del índice si está ahí
    git rm --cached .env 2>/dev/null || true
    echo "✅ .env protegido"
fi

# Agregar cambios
echo "➕ Agregando archivos..."
git add .

# Verificar que .env no esté en el stage
if git diff --cached --name-only | grep -q "^\.env$"; then
    echo "❌ ERROR: .env todavía está en stage"
    git reset HEAD .env 2>/dev/null || true
    echo "✅ .env removido del stage"
fi

# Hacer commit
echo "💾 Creando commit..."
git commit -m "$COMMIT_MSG"

# Ver el remote
REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$REMOTE" ]; then
    echo "⚠️  No hay remote configurado"
    echo "Configura el remote con:"
    echo "  git remote add origin https://github.com/USUARIO/REPO.git"
    exit 1
fi

echo "📡 Remote: $REMOTE"
echo ""

# Preguntar si desea hacer push
read -p "¿Subir a GitHub? (s/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "⬆️  Subiendo a GitHub..."

    # Intentar push
    if git push origin main 2>&1; then
        echo ""
        echo "✅ ¡Cambios sincronizados exitosamente!"
        echo ""
        echo "Ver en: ${REMOTE%.git}"
    else
        echo ""
        echo "⚠️  Error al hacer push. Intentando push con fuerza..."
        read -p "¿Hacer force push? (s/n): " -n 1 -r
        echo

        if [[ $REPLY =~ ^[Ss]$ ]]; then
            git push origin main --force
            echo "✅ Push forzado completado"
        else
            echo "❌ Push cancelado"
            echo "Ejecuta manualmente: git push origin main"
        fi
    fi
else
    echo "⏸️  Push cancelado"
    echo "Para subir manualmente: git push origin main"
fi

echo ""
echo "📊 Estado final:"
git log --oneline -3
echo ""
echo "✨ ¡Listo!"
