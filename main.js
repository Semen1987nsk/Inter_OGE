const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Отключаем аппаратное ускорение, если есть проблемы с рендерингом на старых панелях
// app.disableHardwareAcceleration();

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        fullscreen: true, // Запуск в полноэкранном режиме для интерактивных панелей
        // icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            nodeIntegration: false, // Безопасность: запрещаем Node.js в браузере
            contextIsolation: true, // Безопасность: изоляция контекста
            sandbox: true          // Безопасность: песочница
        }
    });

    // Загружаем index.html из текущей папки (куда мы скопируем файлы)
    mainWindow.loadFile('index.html');

    // Разворачиваем на весь экран при запуске
    mainWindow.maximize();

    // Убираем стандартное меню (Файл, Правка и т.д.) для чистого вида
    mainWindow.setMenuBarVisibility(false);
    
    // Открываем DevTools только если это не продакшн (можно раскомментировать для отладки)
    // mainWindow.webContents.openDevTools();
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
