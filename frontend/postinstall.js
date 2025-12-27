// Postinstall script to fix framer-motion/motion-utils build issues
// Creates missing files that cause Rollup resolution errors

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixes = [
  {
    source: path.join(__dirname, 'node_modules/motion-utils/dist/es/global-config.mjs'),
    target: path.join(__dirname, 'node_modules/motion-utils/dist/es/globalThis-config.mjs')
  }
];

console.log('🔧 Running postinstall fixes for framer-motion/motion-utils...');

fixes.forEach(({ source, target }) => {
  try {
    if (fs.existsSync(source) && !fs.existsSync(target)) {
      fs.copyFileSync(source, target);
      console.log(`✅ Created ${path.basename(target)}`);
    }
  } catch (error) {
    console.warn(`⚠️  Could not create ${path.basename(target)}:`, error.message);
  }
});

console.log('✅ Postinstall fixes complete!');
