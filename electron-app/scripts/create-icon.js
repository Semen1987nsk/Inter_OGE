const fs = require('fs');
const path = require('path');

// Создание простой SVG иконки
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#6c5ce7"/>
  <text x="256" y="320" font-family="Arial" font-size="200" font-weight="bold" fill="white" text-anchor="middle">IO</text>
</svg>`;

const iconPath = path.join(__dirname, '../assets/icons/icon.svg');
fs.writeFileSync(iconPath, svg);
console.log('✅ Иконка создана: assets/icons/icon.svg');

// Также создаём placeholder PNG (пустой файл, чтобы не было ошибок)
const pngPath = path.join(__dirname, '../assets/icons/icon.png');
const placeholderData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(pngPath, placeholderData);
console.log('✅ Placeholder иконка создана: assets/icons/icon.png');
console.log('⚠️  Замените её на профессиональную иконку перед релизом!');
