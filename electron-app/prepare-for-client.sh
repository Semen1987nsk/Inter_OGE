#!/bin/bash

echo "📦 ПОДГОТОВКА ДЕМО ДЛЯ ОТПРАВКИ ЗАКАЗЧИКУ"
echo "========================================="
echo ""

cd /workspaces/Inter_OGE/electron-app/dist

# Проверка наличия архива
if [ -f "InterOGE-Demo-Linux-x64.tar.gz" ]; then
    echo "✅ Найден архив для Linux:"
    ls -lh InterOGE-Demo-Linux-x64.tar.gz
    echo ""
else
    echo "❌ Архив не найден! Запустите сборку:"
    echo "   cd /workspaces/Inter_OGE/electron-app"
    echo "   npm run package-linux"
    exit 1
fi

# Копирование инструкции
echo "📋 Копирование инструкции для заказчика..."
cp ../ИНСТРУКЦИЯ-ДЛЯ-ЗАКАЗЧИКА.md ./

echo ""
echo "✅ ГОТОВО К ОТПРАВКЕ!"
echo ""
echo "📤 Файлы для отправки заказчику:"
echo ""
echo "   📦 InterOGE-Demo-Linux-x64.tar.gz (98 MB)"
echo "   📋 ИНСТРУКЦИЯ-ДЛЯ-ЗАКАЗЧИКА.md"
echo ""
echo "📍 Расположение:"
echo "   /workspaces/Inter_OGE/electron-app/dist/"
echo ""
echo "🚀 Способы отправки:"
echo ""
echo "1️⃣  Email (если позволяет размер):"
echo "   - Прикрепите оба файла"
echo ""
echo "2️⃣  Google Drive / Dropbox / OneDrive:"
echo "   - Загрузите файлы"
echo "   - Отправьте ссылку на скачивание"
echo ""
echo "3️⃣  GitHub Release:"
echo "   - Создайте Release в репозитории"
echo "   - Прикрепите архив"
echo ""
echo "4️⃣  Wetransfer (бесплатно до 2 GB):"
echo "   - https://wetransfer.com/"
echo "   - Загрузите и отправьте"
echo ""
echo "💡 РЕКОМЕНДАЦИЯ:"
echo ""
echo "   Для Windows заказчика лучше собрать на Windows машине:"
echo ""
echo "   1. Склонируйте репозиторий на Windows"
echo "   2. cd electron-app"
echo "   3. npm install"
echo "   4. npm run copy-files"
echo "   5. npm run package-win"
echo "   6. Архив: dist/InterOGE-win32-x64/"
echo ""
echo "   Windows версия будет ~200 MB (в ZIP ~80 MB)"
echo ""
