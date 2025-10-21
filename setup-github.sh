#!/bin/bash

# Script para configurar GitHub automáticamente
# Uso: ./setup-github.sh TU_USUARIO

set -e

echo "🚀 CoreBanking System - Configuración de GitHub"
echo "================================================"
echo ""

# Verificar si se proporcionó el usuario
if [ -z "$1" ]; then
    echo "❌ Error: Debes proporcionar tu nombre de usuario de GitHub"
    echo "Uso: ./setup-github.sh TU_USUARIO"
    exit 1
fi

GITHUB_USER=$1
REPO_NAME="corebanking-system"

echo "📋 Configuración:"
echo "   Usuario GitHub: $GITHUB_USER"
echo "   Repositorio: $REPO_NAME"
echo ""

# Verificar si Git está instalado
if ! command -v git &> /dev/null; then
    echo "❌ Error: Git no está instalado"
    echo "Instala Git desde: https://git-scm.com/"
    exit 1
fi

echo "✅ Git está instalado"
echo ""

# Verificar si ya existe un repositorio Git
if [ -d ".git" ]; then
    echo "⚠️  Ya existe un repositorio Git en este directorio"
    read -p "¿Quieres reinicializarlo? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        rm -rf .git
        echo "✅ Repositorio anterior eliminado"
    else
        echo "❌ Operación cancelada"
        exit 1
    fi
fi

echo "1️⃣  Inicializando repositorio Git..."
git init
echo "✅ Repositorio inicializado"
echo ""

echo "2️⃣  Configurando Git..."
# Verificar si Git está configurado
if [ -z "$(git config --global user.name)" ]; then
    echo "⚠️  Git no está configurado"
    read -p "Ingresa tu nombre: " git_name
    git config --global user.name "$git_name"
fi

if [ -z "$(git config --global user.email)" ]; then
    read -p "Ingresa tu email: " git_email
    git config --global user.email "$git_email"
fi

echo "   Nombre: $(git config --global user.name)"
echo "   Email: $(git config --global user.email)"
echo "✅ Git configurado"
echo ""

echo "3️⃣  Agregando archivos..."
git add .
echo "✅ Archivos agregados"
echo ""

echo "4️⃣  Creando commit inicial..."
git commit -m "Initial commit: CoreBanking System v1.0

Features:
- Account Dashboard
- DTC1B Binary Processor
- Advanced Binary Reader
- Enhanced Hex Viewer Pro
- Transfer Interface
- API Key Manager
- Audit Log Viewer

Security:
- AES-256-GCM encryption
- HMAC-SHA256 integrity
- Row Level Security
- PBKDF2 key derivation"

echo "✅ Commit creado"
echo ""

echo "5️⃣  Renombrando rama a main..."
git branch -M main
echo "✅ Rama renombrada"
echo ""

echo "6️⃣  Conectando con GitHub..."
REPO_URL="https://github.com/$GITHUB_USER/$REPO_NAME.git"
git remote add origin "$REPO_URL"
echo "✅ Conectado a: $REPO_URL"
echo ""

echo "7️⃣  Subiendo a GitHub..."
echo "⚠️  Asegúrate de haber creado el repositorio en GitHub primero!"
echo "   URL: https://github.com/new"
echo ""
read -p "¿El repositorio ya está creado en GitHub? (s/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "Subiendo archivos..."
    if git push -u origin main; then
        echo "✅ Archivos subidos exitosamente"
        echo ""
        echo "🎉 ¡Éxito! Tu proyecto está en GitHub"
        echo ""
        echo "📍 URLs importantes:"
        echo "   Repositorio: https://github.com/$GITHUB_USER/$REPO_NAME"
        echo "   Clonar: git clone https://github.com/$GITHUB_USER/$REPO_NAME.git"
        echo ""
        echo "🚀 Próximos pasos:"
        echo "   1. Agregar topics en GitHub (react, typescript, vite, etc.)"
        echo "   2. Habilitar GitHub Pages (opcional)"
        echo "   3. Configurar deploy en Vercel o Netlify"
        echo "   4. Invitar colaboradores"
        echo ""
        echo "📚 Documentación:"
        echo "   - README.md: Documentación principal"
        echo "   - FEATURES.md: Características detalladas"
        echo "   - DEPLOY.md: Guía de despliegue"
        echo ""
    else
        echo "❌ Error al subir archivos"
        echo "Posibles causas:"
        echo "   - El repositorio no existe en GitHub"
        echo "   - No tienes permisos"
        echo "   - Credenciales incorrectas"
        echo ""
        echo "Solución:"
        echo "   1. Crea el repositorio en: https://github.com/new"
        echo "   2. Verifica tus credenciales de GitHub"
        echo "   3. Intenta de nuevo con: git push -u origin main"
        exit 1
    fi
else
    echo "⚠️  Por favor crea el repositorio primero:"
    echo "   1. Ve a: https://github.com/new"
    echo "   2. Nombre: $REPO_NAME"
    echo "   3. NO marques 'Add a README file'"
    echo "   4. Click 'Create repository'"
    echo ""
    echo "Después ejecuta:"
    echo "   git push -u origin main"
    echo ""
fi

echo "✨ Script completado"
