const fs = require('fs');
const path = require('path');

// Конфигурация путей
const SOURCE_ROOT = path.resolve(__dirname, '..'); // Корневая папка проекта
const DEST_ROOT = __dirname; // Папка electron-app

// Список файлов и папок для копирования
const FILES_TO_COPY = [
    'index.html',
    'app.js',
    'styles.css',
    'freemium-styles.css',
    'equipment-kits.js',
    'labosfera-config.js',
    'image-loader.js',
    'svg-placeholders.js',
    'experiments',
    'assets',
    'фото оборудования'
];

console.log('🚀 Начало копирования файлов проекта...');

FILES_TO_COPY.forEach(item => {
    const sourcePath = path.join(SOURCE_ROOT, item);
    console.log(`Checking: ${sourcePath}`);
    const destPath = path.join(DEST_ROOT, item);

    try {
        if (fs.existsSync(sourcePath)) {
            const stats = fs.statSync(sourcePath);
            
            if (stats.isDirectory()) {
                console.log(`📂 Копирование папки: ${item}`);
                copyDirRecursive(sourcePath, destPath);
            } else {
                console.log(`📄 Копирование файла: ${item}`);
                fs.copyFileSync(sourcePath, destPath);
            }
        } else {
            console.warn(`⚠️ Внимание: Исходный файл/папка не найден: ${item}`);
        }
    } catch (err) {
        console.error(`❌ Ошибка при копировании ${item}:`, err.message);
    }
});

console.log('✅ Копирование завершено!');

// Вспомогательная функция для рекурсивного копирования папок
function copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        // Игнорируем node_modules и .git если они вдруг попадутся
        if (entry.name === 'node_modules' || entry.name === '.git') continue;

        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
