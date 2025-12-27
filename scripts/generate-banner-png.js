const fs = require('fs');
const path = require('path');

async function convertBannerToPng() {
  try {
    const sharp = require('sharp');

    const svgPath = path.join(__dirname, '..', 'branding', 'twitter-banner.svg');
    const pngPath = path.join(__dirname, '..', 'branding', 'twitter-banner.png');

    const svgBuffer = fs.readFileSync(svgPath);

    await sharp(svgBuffer)
      .resize(1500, 500)
      .png({ quality: 95 })
      .toFile(pngPath);

    const stats = fs.statSync(pngPath);
    console.log(`✅ twitter-banner.png genere!`);
    console.log(`   Taille: ${(stats.size / 1024).toFixed(2)} Ko`);
  } catch (err) {
    console.error('Erreur:', err.message);
  }
}

convertBannerToPng();
