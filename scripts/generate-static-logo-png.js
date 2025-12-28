// Script pour convertir le logo-static.svg en PNG 200x200
// Usage: node scripts/generate-static-logo-png.js

const fs = require('fs');
const path = require('path');

async function convertStaticLogoToPng() {
  try {
    const sharp = require('sharp');

    const svgPath = path.join(__dirname, '..', 'branding', 'logo-static.svg');
    const pngPath = path.join(__dirname, '..', 'branding', 'logo-static.png');

    const svgBuffer = fs.readFileSync(svgPath);

    await sharp(svgBuffer)
      .resize(200, 200)
      .png({ quality: 95, compressionLevel: 9 })
      .toFile(pngPath);

    const stats = fs.statSync(pngPath);
    console.log(`logo-static.png genere avec succes!`);
    console.log(`   Chemin: ${pngPath}`);
    console.log(`   Taille: ${(stats.size / 1024).toFixed(2)} Ko`);

    if (stats.size > 100 * 1024) {
      console.log(`   Attention: Le fichier depasse 100 Ko.`);
    } else {
      console.log(`   OK pour MultiversX (< 100 Ko)`);
    }
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log('Module "sharp" non trouve.');
      console.log('');
      console.log('Installation:');
      console.log('  npm install sharp');
    } else {
      console.error('Erreur:', err.message);
    }
  }
}

convertStaticLogoToPng();
