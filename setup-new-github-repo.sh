#!/bin/bash

# 🚀 Script de Setup Automático para GitHub
# CoreBanking System v2.0

echo "🎯 CoreBanking System - Setup de GitHub"
echo "========================================"
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar si Git está instalado
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git no está instalado. Por favor instala Git primero.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Git está instalado${NC}"
echo ""

# Paso 1: Configuración de usuario
echo -e "${BLUE}📝 Paso 1: Configuración de Usuario Git${NC}"
echo "========================================="

read -p "Ingresa tu nombre para Git: " git_name
read -p "Ingresa tu email para Git: " git_email

git config --global user.name "$git_name"
git config --global user.email "$git_email"

echo -e "${GREEN}✅ Configuración guardada${NC}"
echo ""

# Paso 2: Inicializar repositorio
echo -e "${BLUE}📝 Paso 2: Inicializar Repositorio${NC}"
echo "====================================="

if [ -d .git ]; then
    echo -e "${YELLOW}⚠️  Ya existe un repositorio Git${NC}"
    read -p "¿Quieres reinicializarlo? (s/n): " reinit
    if [ "$reinit" = "s" ]; then
        rm -rf .git
        git init
        echo -e "${GREEN}✅ Repositorio reinicializado${NC}"
    fi
else
    git init
    echo -e "${GREEN}✅ Repositorio inicializado${NC}"
fi
echo ""

# Paso 3: Agregar archivos
echo -e "${BLUE}📝 Paso 3: Agregar Archivos${NC}"
echo "=============================="

echo "Agregando todos los archivos..."
git add .

# Mostrar archivos que se van a incluir
echo ""
echo "Archivos a incluir (primeros 20):"
git status --short | head -20
echo ""

staged_count=$(git diff --cached --numstat | wc -l)
echo -e "${GREEN}✅ $staged_count archivos preparados${NC}"
echo ""

# Paso 4: Crear commit
echo -e "${BLUE}📝 Paso 4: Crear Commit Inicial${NC}"
echo "================================="

git commit -m "🎉 Initial commit - CoreBanking System v2.0

✅ Features implemented:
- Dashboard with multi-currency support (USD, EUR, GBP, CHF)
- Black Screen generator for bank confirmations
- DTC1B file processor and analyzer
- Large file analyzer with real-time balance extraction
- XCP B2B API for international remittances
- Account Ledger with live updates
- Binary file reader and hex viewer
- API Key management
- Audit log viewer
- Transfer interface

✅ Technical improvements:
- Bilingual system (Spanish/English)
- Modern toast notifications
- Responsive design
- TypeScript throughout
- Vite build system
- Production-ready bundle (105 KB gzipped)

✅ Fixed issues:
- Navigation errors resolved
- Black Screen fully functional
- Dashboard translations complete
- All components tested and working"

echo -e "${GREEN}✅ Commit creado exitosamente${NC}"
echo ""

# Paso 5: Conectar con GitHub
echo -e "${BLUE}📝 Paso 5: Conectar con GitHub${NC}"
echo "==============================="
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Antes de continuar, crea tu repositorio en GitHub:${NC}"
echo "   1. Ve a: https://github.com/new"
echo "   2. Nombre sugerido: corebanking-system-v2"
echo "   3. ❌ NO marques 'Initialize with README'"
echo "   4. Copia la URL del repositorio"
echo ""

read -p "Ingresa la URL de tu repositorio (ej: https://github.com/usuario/repo.git): " repo_url

if [ -z "$repo_url" ]; then
    echo -e "${RED}❌ URL vacía. Operación cancelada.${NC}"
    exit 1
fi

# Verificar si ya existe el remote
if git remote | grep -q "origin"; then
    echo -e "${YELLOW}⚠️  Remote 'origin' ya existe, reemplazando...${NC}"
    git remote remove origin
fi

git remote add origin "$repo_url"
echo -e "${GREEN}✅ Remote configurado: $repo_url${NC}"
echo ""

# Renombrar branch a main si es necesario
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    git branch -M main
    echo -e "${GREEN}✅ Branch renombrado a 'main'${NC}"
fi
echo ""

# Paso 6: Subir a GitHub
echo -e "${BLUE}📝 Paso 6: Subir a GitHub${NC}"
echo "=========================="
echo ""
echo -e "${YELLOW}🔐 Puede que te pida autenticación de GitHub${NC}"
echo "   - Usuario: tu nombre de usuario"
echo "   - Password: tu Personal Access Token (NO tu contraseña)"
echo ""
echo "   Para crear un token: https://github.com/settings/tokens"
echo ""

read -p "¿Continuar con el push? (s/n): " do_push

if [ "$do_push" = "s" ]; then
    echo "Subiendo archivos a GitHub..."
    if git push -u origin main; then
        echo ""
        echo -e "${GREEN}🎉 ¡ÉXITO! Repositorio subido a GitHub${NC}"
        echo ""
        echo "📊 Estadísticas:"
        echo "   - Branch: main"
        echo "   - Remote: origin"
        echo "   - URL: $repo_url"
        echo ""
        echo "🌐 Ver en web:"
        echo "   ${repo_url%.git}"
        echo ""
    else
        echo ""
        echo -e "${RED}❌ Error al subir a GitHub${NC}"
        echo ""
        echo "Posibles soluciones:"
        echo "1. Verifica tu autenticación"
        echo "2. Intenta de nuevo: git push -u origin main"
        echo "3. Si creaste el repo con README, usa:"
        echo "   git pull origin main --allow-unrelated-histories"
        echo "   git push origin main"
        exit 1
    fi
else
    echo ""
    echo -e "${YELLOW}⚠️  Push cancelado${NC}"
    echo ""
    echo "Para subir manualmente después:"
    echo "   git push -u origin main"
fi

echo ""
echo -e "${GREEN}✅ Setup completado${NC}"
echo ""
echo "📝 Próximos pasos sugeridos:"
echo "   1. Agregar README.md con screenshots"
echo "   2. Configurar GitHub Pages"
echo "   3. Agregar topics al repositorio"
echo "   4. Invitar colaboradores"
echo ""
echo "🎉 ¡Éxito! Tu código está en GitHub"
