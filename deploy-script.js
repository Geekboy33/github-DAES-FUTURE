const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando despliegue en Netlify...\n');

try {
  // Comprimir dist en formato tar.gz para netlify
  console.log('📦 Preparando archivos...');
  
  const distPath = path.join(__dirname, 'dist');
  
  if (!fs.existsSync(distPath)) {
    console.error('❌ Error: La carpeta dist no existe');
    console.log('Ejecuta primero: npm run build');
    process.exit(1);
  }

  console.log('\n✅ Archivos listos en la carpeta dist/');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 OPCIONES DE DESPLIEGUE:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('Opción 1️⃣ - NETLIFY DROP (MÁS RÁPIDO):');
  console.log('  1. Abre: https://app.netlify.com/drop');
  console.log('  2. Arrastra la carpeta "dist" completa');
  console.log('  3. ¡Listo en 30 segundos!\n');
  
  console.log('Opción 2️⃣ - DESDE GITHUB:');
  console.log('  1. Abre: https://app.netlify.com/start');
  console.log('  2. Conecta: Geekboy33/github-DAES-FUTURE');
  console.log('  3. Netlify detectará la config automáticamente\n');
  
  console.log('Opción 3️⃣ - ZIP MANUAL:');
  const zipPath = path.join(__dirname, 'netlify-deploy.zip');
  if (fs.existsSync(zipPath)) {
    console.log(`  ✅ Archivo listo: ${zipPath}`);
    console.log('  1. Abre: https://app.netlify.com/drop');
    console.log('  2. Arrastra: netlify-deploy.zip\n');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 CONTENIDO DE DIST:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const files = fs.readdirSync(distPath);
  files.forEach(file => {
    const stats = fs.statSync(path.join(distPath, file));
    const size = (stats.size / 1024).toFixed(2);
    console.log(`  ${stats.isDirectory() ? '📁' : '📄'} ${file.padEnd(30)} ${size} KB`);
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ TODO LISTO PARA DESPLEGAR!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Abrir Netlify Drop
  console.log('🌐 Abriendo Netlify Drop en tu navegador...\n');
  
  if (process.platform === 'win32') {
    execSync('start https://app.netlify.com/drop', { stdio: 'inherit' });
    execSync(`explorer "${distPath}"`, { stdio: 'inherit' });
    console.log('✅ Ventanas abiertas:');
    console.log('   - Netlify Drop (navegador)');
    console.log('   - Carpeta dist (explorador)\n');
  } else if (process.platform === 'darwin') {
    execSync('open https://app.netlify.com/drop', { stdio: 'inherit' });
    execSync(`open "${distPath}"`, { stdio: 'inherit' });
  } else {
    execSync('xdg-open https://app.netlify.com/drop', { stdio: 'inherit' });
    execSync(`xdg-open "${distPath}"`, { stdio: 'inherit' });
  }
  
  console.log('👉 AHORA: Arrastra el contenido de "dist" a Netlify Drop');
  console.log('\n🎉 ¡Tu app estará en vivo en ~1 minuto!\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}


