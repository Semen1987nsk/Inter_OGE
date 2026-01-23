const { app, BrowserWindow, Menu, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

// ===================================================================
// КОНФИГУРАЦИЯ: Загрузка из родительской директории
// ===================================================================
// Вместо копирования файлов, загружаем их напрямую из корня проекта.
// Это устраняет дублирование кода и гарантирует актуальность.
// ===================================================================

const PROJECT_ROOT = path.resolve(__dirname, '..');

// Проверяем режим работы:
// - Development: загружаем из родительской папки
// - Production (после сборки): файлы будут скопированы в app.asar
const isDevelopment = fs.existsSync(path.join(PROJECT_ROOT, 'index.html'));

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        // icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            nodeIntegration: false, // Безопасность: запрещаем Node.js в браузере
            contextIsolation: true, // Безопасность: изоляция контекста
            sandbox: true          // Безопасность: песочница
        }
    });

    // Загружаем index.html
    // В development режиме - из родительской папки
    // В production (после упаковки) - из текущей папки (файлы копируются при сборке)
    if (isDevelopment) {
        mainWindow.loadFile(path.join(PROJECT_ROOT, 'index.html'));
        console.log('[Electron] Loading from project root:', PROJECT_ROOT);
    } else {
        mainWindow.loadFile('index.html');
        console.log('[Electron] Loading from packaged app');
    }

    // Разворачиваем на весь экран при запуске
    mainWindow.maximize();

    // Убираем стандартное меню (Файл, Правка и т.д.) для чистого вида
    mainWindow.setMenuBarVisibility(false);
    
    // Открываем DevTools только в development режиме
    if (isDevelopment && process.env.DEBUG) {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
