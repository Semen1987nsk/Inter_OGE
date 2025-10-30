const fs = require('fs');
const path = require('path');

// Создание SVG иконки 512x512 (electron-builder примет это)
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6c5ce7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a29bfe;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Фон с градиентом -->
  <rect width="512" height="512" rx="80" fill="url(#grad1)"/>
  
  <!-- Тень для текста -->
  <text x="256" y="340" font-family="Arial, sans-serif" font-size="240" font-weight="bold" 
        fill="rgba(0,0,0,0.2)" text-anchor="middle">IO</text>
  
  <!-- Основной текст -->
  <text x="256" y="335" font-family="Arial, sans-serif" font-size="240" font-weight="bold" 
        fill="white" text-anchor="middle">IO</text>
  
  <!-- Подпись -->
  <text x="256" y="440" font-family="Arial, sans-serif" font-size="50" 
        fill="rgba(255,255,255,0.9)" text-anchor="middle">ОГЭ Физика</text>
</svg>`;

const iconPath = path.join(__dirname, '../assets/icons/icon.svg');
fs.writeFileSync(iconPath, svg);
console.log('✅ Улучшенная иконка создана: assets/icons/icon.svg');

// Информация
console.log('');
console.log('⚠️  Для лучшего качества на Windows рекомендуется:');
console.log('   1. Создать PNG 512x512 в графическом редакторе');
console.log('   2. Конвертировать в .ico через https://www.icoconverter.com/');
console.log('   3. Заменить assets/icons/icon.png');
console.log('');
console.log('Пока что electron-builder может использовать SVG (автоматически сконвертирует)');
