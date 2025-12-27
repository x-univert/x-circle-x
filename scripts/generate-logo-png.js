// Script pour convertir le logo SVG en PNG 200x200
// Usage: node scripts/generate-logo-png.js

const fs = require('fs');
const path = require('path');

async function convertSvgToPng() {
  try {
    // Essayer d'importer sharp
    const sharp = require('sharp');

    const svgPath = path.join(__dirname, '..', 'logo.svg');
    const pngPath = path.join(__dirname, '..', 'logo.png');

    const svgBuffer = fs.readFileSync(svgPath);

    await sharp(svgBuffer)
      .resize(200, 200)
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(pngPath);

    const stats = fs.statSync(pngPath);
    console.log(`✅ logo.png genere avec succes!`);
    console.log(`   Taille: ${(stats.size / 1024).toFixed(2)} Ko`);

    if (stats.size > 100 * 1024) {
      console.log(`⚠️  Attention: Le fichier depasse 100 Ko. Optimisation necessaire.`);
    }
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log('❌ Module "sharp" non trouve.');
      console.log('');
      console.log('Installation:');
      console.log('  npm install sharp');
      console.log('');
      console.log('Ou utilisez un outil en ligne:');
      console.log('  1. Ouvrez logo.svg dans un navigateur');
      console.log('  2. Utilisez https://svgtopng.com/');
      console.log('  3. Exportez en 200x200px');
    } else {
      console.error('Erreur:', err.message);
    }
  }
}

convertSvgToPng();
