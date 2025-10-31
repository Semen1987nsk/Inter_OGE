# 🌐 Настройка GitHub Pages для сравнения производительности

## Проблема
Electron тормозит даже на minimal версии → нужно проверить работу в чистом браузере

## Решение
Выложить на GitHub Pages и сравнить производительность:
- Electron (desktop app)
- Веб-версия (чистый браузер)

---

## ⚙️ НАСТРОЙКА (5 минут):

### Шаг 1: Проверь настройки GitHub Pages
1. Откройте: https://github.com/Semen1987nsk/Inter_OGE/settings/pages
2. В разделе **"Build and deployment"**:
   - Source: **Deploy from a branch**
   - Branch: **gh-pages** / (root)
3. Если там другие настройки - измените на gh-pages

✅ **Деплой уже работает!** Файлы автоматически публикуются при push в main.

### Шаг 2: ~~Дождаться деплоя~~ (УЖЕ ГОТОВО ✅)
~~1. Откройте: https://github.com/Semen1987nsk/Inter_OGE/actions~~
~~2. Найдите workflow **"Deploy to GitHub Pages"**~~
~~3. Подождите ~2-3 минуты (должен появиться ✅)~~

### Шаг 3: Открой сайт и протестируй
Сайт уже доступен:

🔗 **https://semen1987nsk.github.io/Inter_OGE/index.html** (ПОЛНАЯ версия - 744 элемента)

🔗 **https://semen1987nsk.github.io/Inter_OGE/index-minimal.html** (MINIMAL версия - 30 элементов)

---

## 🧪 ТЕСТИРОВАНИЕ:

### Вариант 1: Полная версия
🔗 https://semen1987nsk.github.io/Inter_OGE/index.html

Скроллируйте, проверьте FPS (нажмите F12 → Performance)

### Вариант 2: Minimal версия  
🔗 https://semen1987nsk.github.io/Inter_OGE/index-minimal.html

FPS показывается в заголовке окна

### Вариант 3: Эксперименты
🔗 https://semen1987nsk.github.io/Inter_OGE/experiments/kit2/experiment-1-spring.html

Проверьте перетаскивание оборудования

---

## 📊 СРАВНЕНИЕ:

| Версия | Платформа | FPS | Описание |
|--------|-----------|-----|----------|
| Full HTML | Браузер | ? | 744 DOM элемента |
| Full HTML | Electron | ? | То же + overhead |
| Minimal | Браузер | ? | 30 DOM элементов |
| Minimal | Electron | ? | То же + overhead |

Заполните таблицу после тестов!

---

## 💡 ВЫВОДЫ:

### Если браузер летает, а Electron тормозит:
→ Проблема в Electron
→ Решение: **Tauri** (Rust + системный WebView)

### Если и браузер тормозит:
→ Проблема в коде/стилях
→ Решение: **Lazy load** + упрощение HTML

### Если minimal летает везде, а full тормозит:
→ Проблема в количестве DOM
→ Решение: **Lazy load комплектов**

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ:

1. **Включите Pages** (см. Шаг 1)
2. **Подождите деплой** (~3 минуты)
3. **Откройте сайт** и протестируйте
4. **Заполните таблицу** выше
5. **Напишите результаты** → я предложу решение

---

## 🔧 ЕСЛИ НУЖЕН TAURI:

Если выяснится что проблема в Electron:

```bash
# Установка Tauri
npm install -g @tauri-apps/cli

# Инициализация
cd electron-app
tauri init

# Сборка
tauri build
```

Результат: 3-10 MB вместо 150-250 MB + нативная скорость

---

## ❓ ПОМОЩЬ:

Если что-то не работает:
1. Проверьте: https://github.com/Semen1987nsk/Inter_OGE/actions
2. Найдите ошибки в логах
3. Напишите мне текст ошибки
