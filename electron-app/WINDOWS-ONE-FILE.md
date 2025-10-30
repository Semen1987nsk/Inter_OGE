# 🖥️ СОЗДАНИЕ ОДНОГО ФАЙЛА ДЛЯ WINDOWS

## 📦 Варианты упаковки для Windows:

### ✅ Вариант 1: NSIS Installer (РЕКОМЕНДУЕТСЯ)
**Один файл установщика .exe (~100 MB)**

**На Windows машине:**
```bash
cd electron-app
npm install
npm run copy-files
npm run build-win-nsis
```

**Результат:**
```
dist/Inter OGE-Setup-1.0.0.exe    (~100 MB)
```

**Что делает:**
- Пользователь запускает один файл
- Мастер установки (с выбором папки)
- Создаёт ярлыки на рабочем столе
- Добавляет в меню Пуск
- Можно удалить через Панель управления

---

### ✅ Вариант 2: Portable версия
**Один исполняемый файл .exe (~120 MB)**

**На Windows машине:**
```bash
cd electron-app
npm install
npm run copy-files
npm run build-win-portable
```

**Результат:**
```
dist/Inter OGE-Portable-1.0.0.exe    (~120 MB)
```

**Что делает:**
- Запускается сразу (без установки)
- Не требует прав администратора
- Можно запускать с флешки
- Распаковывается во временную папку при первом запуске

---

### ⚠️ Вариант 3: На Linux (Codespace)
**Требует Wine для сборки Windows**

```bash
# Установить Wine
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install wine wine32 wine64 -y

# Собрать
cd electron-app
npm run build-win-nsis
```

**Проблема:** Wine работает нестабильно в Codespace

---

## 🎯 РЕКОМЕНДАЦИЯ:

### **Для демо заказчику:**

1. **Если у заказчика Windows:**
   - Соберите на Windows машине
   - Отправьте `Inter OGE-Setup-1.0.0.exe` (установщик)
   - Размер: ~100 MB
   - Один клик и всё установится

2. **Если заказчика нет Windows машины:**
   - Отправьте текущую Linux версию
   - Или используйте GitHub Actions для сборки Windows

---

## 🤖 GitHub Actions (Автоматическая сборка)

Создайте файл `.github/workflows/build.yml`:

\`\`\`yaml
name: Build Electron App

on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: |
          cd electron-app
          npm install
      - name: Build
        run: |
          cd electron-app
          npm run copy-files
          npm run build-win-nsis
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: windows-installer
          path: electron-app/dist/*.exe
\`\`\`

**Использование:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub автоматически соберёт Windows версию!

---

## 📊 РАЗМЕРЫ ФАЙЛОВ:

| Тип | Размер | Описание |
|-----|--------|----------|
| **NSIS Installer** | ~100 MB | Установщик с компрессией |
| **Portable EXE** | ~120 MB | Самораспаковывающийся |
| **ZIP архив** | ~80 MB | Нужно распаковать вручную |
| **Linux tar.gz** | ~98 MB | Текущая версия |

---

## ✅ ЧТО УЖЕ ГОТОВО:

✅ Electron приложение собрано для Linux  
✅ Конфигурация для Windows (NSIS + Portable)  
✅ Иконки 512x512 созданы  
✅ package.json настроен  
✅ Скрипты сборки готовы  

---

## 🚀 СЛЕДУЮЩИЙ ШАГ:

### **Соберите на Windows:**

1. Склонируйте репозиторий на Windows
2. Откройте PowerShell или CMD
3. Выполните:

```powershell
cd Inter_OGE\electron-app
npm install
npm run copy-files
npm run build-win-nsis
```

4. Получите файл:
   `dist\Inter OGE-Setup-1.0.0.exe`

5. Отправьте заказчику!

---

## 💡 АЛЬТЕРНАТИВА: Использовать текущую Linux версию

Если нет доступа к Windows:
- Отправьте `InterOGE-Demo-Linux-x64.tar.gz`
- Добавьте примечание: "Windows версия в разработке"
- Соберите Windows позже на Windows машине

---

**Вопросы? Нужна помощь с GitHub Actions?** 🚀
