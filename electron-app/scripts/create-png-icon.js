const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createIcon() {
    const size = 512;
    
    // Создание SVG с градиентом
    const svgBuffer = Buffer.from(`
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#6c5ce7;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#a29bfe;stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="${size}" height="${size}" rx="80" fill="url(#grad1)"/>
            <text x="${size/2}" y="${size*0.66}" font-family="Arial, sans-serif" font-size="240" font-weight="bold" 
                  fill="rgba(0,0,0,0.2)" text-anchor="middle">IO</text>
            <text x="${size/2}" y="${size*0.65}" font-family="Arial, sans-serif" font-size="240" font-weight="bold" 
                  fill="white" text-anchor="middle">IO</text>
            <text x="${size/2}" y="${size*0.86}" font-family="Arial, sans-serif" font-size="50" 
                  fill="rgba(255,255,255,0.9)" text-anchor="middle">ОГЭ Физика</text>
        </svg>
    `);
    
    const iconDir = path.join(__dirname, '../assets/icons');
    
    try {
        // Создать PNG 512x512
        await sharp(svgBuffer)
            .resize(512, 512)
            .png()
            .toFile(path.join(iconDir, 'icon.png'));
        
        console.log('✅ Иконка PNG 512x512 создана');
        
        // Создать PNG 256x256 (для некоторых случаев)
        await sharp(svgBuffer)
            .resize(256, 256)
            .png()
            .toFile(path.join(iconDir, 'icon-256.png'));
        
        console.log('✅ Иконка PNG 256x256 создана');
        
        console.log('');
        console.log('📁 Созданные файлы:');
        console.log('   assets/icons/icon.png (512x512) - основная');
        console.log('   assets/icons/icon-256.png (256x256) - запасная');
        
    } catch (error) {
        console.error('❌ Ошибка создания иконки:', error.message);
    }
}

createIcon();
