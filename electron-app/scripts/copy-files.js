const fs = require('fs');
const path = require('path');

console.log('📋 Копирование файлов проекта...');

const sourceDir = path.join(__dirname, '../../');
const targetDir = path.join(__dirname, '../app');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

const itemsToCopy = [
    'index.html',
    'index-new.html',
    'app.js',
    'main-screen.js',
    'styles.css',
    'styles-main.css',
    'equipment-kits.js',
    'labosfera-config.js',
    'image-loader.js',
    'experiments',
    'assets',
    'images'
];

function copyDirectory(source, target) {
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }

    const files = fs.readdirSync(source);

    files.forEach(file => {
        const sourcePath = path.join(source, file);
        const targetPath = path.join(target, file);

        if (fs.statSync(sourcePath).isDirectory()) {
            copyDirectory(sourcePath, targetPath);
        } else {
            fs.copyFileSync(sourcePath, targetPath);
        }
    });
}

function copyFile(source, target) {
    const targetDir = path.dirname(target);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.copyFileSync(source, target);
}

itemsToCopy.forEach(item => {
    const sourcePath = path.join(sourceDir, item);
    const targetPath = path.join(targetDir, item);

    if (!fs.existsSync(sourcePath)) {
        console.warn(`⚠️  Пропущен: ${item} (не найден)`);
        return;
    }

    try {
        if (fs.statSync(sourcePath).isDirectory()) {
            copyDirectory(sourcePath, targetPath);
            console.log(`✅ Скопирована папка: ${item}`);
        } else {
            copyFile(sourcePath, targetPath);
            console.log(`✅ Скопирован файл: ${item}`);
        }
    } catch (error) {
        console.error(`❌ Ошибка копирования ${item}:`, error.message);
    }
});

console.log('✅ Копирование завершено!');
