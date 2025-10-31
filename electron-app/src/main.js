const { app, BrowserWindow, Menu, dialog, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// ============================================
// ПРОИЗВОДИТЕЛЬНОСТЬ: АГРЕССИВНАЯ ОПТИМИЗАЦИЯ ДЛЯ СТАРОГО ЖЕЛЕЗА
// ============================================
// По умолчанию отключаем аппаратное ускорение (стабильнее на старых GPU)
const TRY_GPU = process.argv.includes('--try-gpu');
if (!TRY_GPU) {
    app.disableHardwareAcceleration();
} else {
    // РЕЖИМ ПРОБЫ GPU (только по флагу) — может зависнуть на старых видеокартах
    app.commandLine.appendSwitch('ignore-gpu-blacklist');
    app.commandLine.appendSwitch('enable-gpu-rasterization');
}

// V8 оптимизации для старого железа
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// Отключаем лишние фичи Chromium
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('disable-features', 'TranslateUI');
app.commandLine.appendSwitch('disable-ipc-flooding-protection');

// Для более новых карт можете попробовать эти флаги (закомментировано):
// app.commandLine.appendSwitch('enable-gpu-rasterization');
// app.commandLine.appendSwitch('ignore-gpu-blacklist');

const APP_CONFIG = {
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    title: 'Inter OGE - Виртуальные эксперименты по физике',
    backgroundColor: '#1a1a2e'
};

function createWindow() {
    // Подбираем окно под реальное рабочее пространство пользователя,
    // чтобы не рендерить лишние пиксели (1920x1080 может быть избыточно)
    const display = screen.getPrimaryDisplay();
    const workArea = display && display.workAreaSize ? display.workAreaSize : { width: APP_CONFIG.width, height: APP_CONFIG.height };

    mainWindow = new BrowserWindow({
        width: Math.max(APP_CONFIG.minWidth, Math.min(workArea.width, APP_CONFIG.width)),
        height: Math.max(APP_CONFIG.minHeight, Math.min(workArea.height, APP_CONFIG.height)),
        minWidth: APP_CONFIG.minWidth,
        minHeight: APP_CONFIG.minHeight,
        icon: path.join(__dirname, '../assets/icons/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true,
            preload: path.join(__dirname, 'preload.js'),
            // КРИТИЧНО для производительности на старом железе:
            backgroundThrottling: false, // Не замедляем фоновые вкладки
            offscreen: false,
            spellcheck: false // Отключаем проверку орфографии
        },
        title: APP_CONFIG.title,
        backgroundColor: APP_CONFIG.backgroundColor,
        show: false,
        autoHideMenuBar: false,
        useContentSize: true
    });

    // ============================================
    // ТЕСТ: Переключение между полной и минимальной версией
    // ============================================
    const USE_MINIMAL = process.argv.includes('--minimal');
    const startUrl = USE_MINIMAL 
        ? path.join(__dirname, '../app/index-minimal.html')
        : path.join(__dirname, '../app/index.html');
    
    if (USE_MINIMAL) {
        console.log('🎯 ЗАПУСК В РЕЖИМЕ MINIMAL (для теста производительности)');
    }
    
    mainWindow.loadFile(startUrl).catch(err => {
        console.error('Ошибка загрузки:', err);
        dialog.showErrorBox('Ошибка', 'Не удалось загрузить приложение');
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
        
        // ВАЖНО: НЕ открываем DevTools - они жрут ресурсы!
        // if (process.argv.includes('--enable-logging')) {
        //     mainWindow.webContents.openDevTools();
        // }
    });

    // Логируем консоль рендера в файл для диагностики
    try {
        const logDir = path.join(app.getPath('userData'), 'logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        const logFile = path.join(logDir, 'app.log');
        const log = (msg) => {
            try { fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`); } catch { /* ignore */ }
        };

        mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
            log(`[console:${level}] ${message} (${sourceId}:${line})`);
        });
        mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
            log(`[did-fail-load] ${errorCode} ${errorDescription} url=${validatedURL}`);
        });
        mainWindow.webContents.on('render-process-gone', (event, details) => {
            log(`[render-process-gone] ${JSON.stringify(details)}`);
        });
        mainWindow.on('unresponsive', () => log('[window] unresponsive'));
        app.on('child-process-gone', (event, details) => log(`[child-process-gone] ${JSON.stringify(details)}`));
        process.on('uncaughtException', (err) => log(`[uncaughtException] ${err.stack || err.message}`));
    } catch (e) {
        // ignore logging errors
    }

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
