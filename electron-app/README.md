# 📦 Inter OGE - Electron Демо-приложение

Десктопная версия виртуальных экспериментов для подготовки к ОГЭ по физике.

---

## 🚀 Быстрый старт

### Установка зависимостей

```bash
npm install
```

### Запуск в режиме разработки

```bash
npm start
```

### Запуск с логами (для отладки)

```bash
npm run dev
```

---

## 📦 Сборка исполняемых файлов

### Копирование файлов проекта

```bash
npm run copy-files
```

### Сборка для Windows

```bash
npm run package-win
```

**Результат:** `dist/InterOGE-win32-x64/InterOGE.exe`

### Сборка для macOS

```bash
npm run package-mac
```

**Результат:** `dist/InterOGE-darwin-x64/InterOGE.app`

### Сборка для Linux

```bash
npm run package-linux
```

**Результат:** `dist/InterOGE-linux-x64/InterOGE`

### Сборка для всех платформ

```bash
npm run build
```

---

## 📁 Структура проекта

```
electron-app/
├── src/
│   ├── main.js          # Главный процесс Electron
│   └── preload.js       # Preload скрипт (безопасность)
├── scripts/
│   └── copy-files.js    # Скрипт копирования файлов
├── app/                 # Файлы веб-приложения (копируются автоматически)
│   ├── index-new.html
│   ├── experiments/
│   ├── assets/
│   └── ...
├── assets/
│   └── icons/           # Иконки приложения
├── dist/                # Собранные приложения
├── package.json
└── README.md
```

---

## 🎨 Иконки приложения

Поместите иконки в папку `assets/icons/`:

- **Windows:** `icon.ico` (256x256)
- **macOS:** `icon.icns` (512x512)
- **Linux:** `icon.png` (512x512)

---

## 🔧 Горячие клавиши

| Комбинация | Действие |
|------------|----------|
| `Ctrl+R` / `Cmd+R` | Перезагрузить |
| `Ctrl+Shift+R` | Принудительная перезагрузка |
| `F11` | Полноэкранный режим |
| `Ctrl+Shift+I` | DevTools |
| `Ctrl++` / `Cmd++` | Увеличить масштаб |
| `Ctrl+-` / `Cmd+-` | Уменьшить масштаб |
| `Ctrl+0` / `Cmd+0` | Сбросить масштаб |
| `Esc` | Вернуться на главную |
| `Ctrl+Q` / `Cmd+Q` | Выход |

---

## 📤 Отправка демо заказчику

### Вариант 1: ZIP архив

```bash
cd dist
zip -r InterOGE-Demo-Windows.zip InterOGE-win32-x64/
```

Отправьте файл `InterOGE-Demo-Windows.zip` заказчику.

---

## 📊 Системные требования

### Минимальные

- **ОС:** Windows 10, macOS 10.13, Ubuntu 18.04
- **RAM:** 4 GB
- **Диск:** 500 MB

### Рекомендуемые

- **ОС:** Windows 11, macOS 13+, Ubuntu 22.04+
- **RAM:** 8 GB
- **Диск:** 1 GB
- **Разрешение:** 1920x1080

---

## 🔒 Безопасность

- ✅ Отключен `nodeIntegration`
- ✅ Включен `contextIsolation`
- ✅ Отключен `enableRemoteModule`
- ✅ Preload скрипт для безопасного API
- ✅ Внешние ссылки открываются в браузере

---

## 📝 Лицензия

MIT License

---

## 🆘 Поддержка

- **GitHub:** https://github.com/Semen1987nsk/Inter_OGE
- **Issues:** https://github.com/Semen1987nsk/Inter_OGE/issues
