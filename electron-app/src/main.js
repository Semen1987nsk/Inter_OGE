const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');

let mainWindow;

// ============================================
// ПРОИЗВОДИТЕЛЬНОСТЬ: GPU ACCELERATION
// ============================================
// Принудительно включаем аппаратное ускорение
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-accelerated-video-decode');

// Отключаем VSync если видеокарта слабая (уменьшает лаги)
// app.commandLine.appendSwitch('disable-gpu-vsync');

// АЛЬТЕРНАТИВА: Если GPU тормозит - раскомментируйте это:
// app.disableHardwareAcceleration();

const APP_CONFIG = {
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    title: 'Inter OGE - Виртуальные эксперименты по физике',
    backgroundColor: '#1a1a2e'
};

function createWindow() {
    mainWindow = new BrowserWindow({
        width: APP_CONFIG.width,
        height: APP_CONFIG.height,
        minWidth: APP_CONFIG.minWidth,
        minHeight: APP_CONFIG.minHeight,
        icon: path.join(__dirname, '../assets/icons/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true,
            preload: path.join(__dirname, 'preload.js')
        },
        title: APP_CONFIG.title,
        backgroundColor: APP_CONFIG.backgroundColor,
        show: false,
        autoHideMenuBar: false
    });

    const startUrl = path.join(__dirname, '../app/index.html');
    
    mainWindow.loadFile(startUrl).catch(err => {
        console.error('Ошибка загрузки:', err);
        dialog.showErrorBox('Ошибка', 'Не удалось загрузить приложение');
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
        
        if (process.argv.includes('--enable-logging')) {
            mainWindow.webContents.openDevTools();
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    createMenu();
}

function createMenu() {
    const menuTemplate = [
        {
            label: 'Файл',
            submenu: [
                {
                    label: 'Перезагрузить',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        if (mainWindow) mainWindow.reload();
                    }
                },
                {
                    label: 'Принудительная перезагрузка',
                    accelerator: 'CmdOrCtrl+Shift+R',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.reloadIgnoringCache();
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Выход',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Вид',
            submenu: [
                {
                    label: 'Полноэкранный режим',
                    accelerator: 'F11',
                    type: 'checkbox',
                    checked: false,
                    click: (menuItem) => {
                        if (mainWindow) {
                            const isFullScreen = !mainWindow.isFullScreen();
                            mainWindow.setFullScreen(isFullScreen);
                            menuItem.checked = isFullScreen;
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Увеличить',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        if (mainWindow) {
                            const currentZoom = mainWindow.webContents.getZoomLevel();
                            mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
                        }
                    }
                },
                {
                    label: 'Уменьшить',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        if (mainWindow) {
                            const currentZoom = mainWindow.webContents.getZoomLevel();
                            mainWindow.webContents.setZoomLevel(currentZoom - 0.5);
                        }
                    }
                },
                {
                    label: 'Сбросить масштаб',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.setZoomLevel(0);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Инструменты разработчика',
                    accelerator: 'CmdOrCtrl+Shift+I',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.toggleDevTools();
                        }
                    }
                }
            ]
        },
        {
            label: 'Эксперименты',
            submenu: [
                {
                    label: 'Комплект №1 - Механика (плотность)',
                    click: () => navigateToKit(1)
                },
                {
                    label: 'Комплект №2 - Механика (пружины)',
                    click: () => navigateToKit(2)
                },
                {
                    label: 'Комплект №3 - Электричество',
                    click: () => navigateToKit(3)
                },
                {
                    label: 'Комплект №4 - Оптика',
                    click: () => navigateToKit(4)
                },
                { type: 'separator' },
                {
                    label: 'Вернуться на главную',
                    accelerator: 'Esc',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.loadFile(path.join(__dirname, '../app/index.html'));
                        }
                    }
                }
            ]
        },
        {
            label: 'Помощь',
            submenu: [
                {
                    label: 'О программе',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'О программе Inter OGE',
                            message: 'Inter OGE - Виртуальные эксперименты',
                            detail: `Версия: 1.0.0
Платформа: ${process.platform}
Electron: ${process.versions.electron}
Chrome: ${process.versions.chrome}
Node.js: ${process.versions.node}

Виртуальные эксперименты для подготовки к ОГЭ по физике.
Все 33 эксперимента согласно спецификации ФИПИ 2025.

© 2025 Inter OGE Team`,
                            buttons: ['OK']
                        });
                    }
                },
                {
                    label: 'Документация',
                    click: () => {
                        shell.openExternal('https://github.com/Semen1987nsk/Inter_OGE');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Сообщить о проблеме',
                    click: () => {
                        shell.openExternal('https://github.com/Semen1987nsk/Inter_OGE/issues');
                    }
                }
            ]
        }
    ];

    if (process.platform === 'darwin') {
        menuTemplate.splice(1, 0, {
            label: 'Правка',
            submenu: [
                { role: 'undo', label: 'Отменить' },
                { role: 'redo', label: 'Повторить' },
                { type: 'separator' },
                { role: 'cut', label: 'Вырезать' },
                { role: 'copy', label: 'Копировать' },
                { role: 'paste', label: 'Вставить' },
                { role: 'selectAll', label: 'Выделить всё' }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

function navigateToKit(kitNumber) {
    if (mainWindow) {
        mainWindow.webContents.executeJavaScript(`
            if (typeof selectKit === 'function') {
                selectKit(${kitNumber});
            }
        `).catch(err => {
            console.error('Ошибка навигации:', err);
        });
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

process.on('uncaughtException', (error) => {
    console.error('Необработанная ошибка:', error);
    dialog.showErrorBox(
        'Критическая ошибка',
        `Произошла непредвиденная ошибка:\n\n${error.message}`
    );
});

app.on('render-process-gone', (event, webContents, details) => {
    console.error('Процесс рендеринга завершился:', details);
    dialog.showErrorBox(
        'Ошибка рендеринга',
        'Процесс отрисовки приложения завершился неожиданно.'
    );
});
