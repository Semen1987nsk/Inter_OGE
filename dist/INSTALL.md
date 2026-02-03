# 📦 Инструкция по установке виртуальной лаборатории

**Для программиста / системного администратора**

---

## 📋 Содержимое пакета

```
labosfera-labs.zip (~300 KB)
│
└── labs/
    ├── spring/                    # Физика: Измерение жёсткости пружины
    │   ├── index.html             # Главная страница опыта
    │   ├── experiment-1-spring.js # Логика (ES6 модули)
    │   ├── experiment-1-spring.css
    │   └── experiment-config.js   # Конфигурация пружин/грузов
    │
    ├── friction/                  # Физика: Коэффициент трения
    │   ├── index.html
    │   ├── experiment-2-friction.js
    │   ├── experiment-2-friction.css
    │   └── friction-config.js
    │
    ├── chemistry-23/              # 🆕 Химия ОГЭ: Задание 23
    │   └── index.html             # Качественный анализ веществ (self-contained)
    │
    ├── shared/                    # Общие модули
    │   ├── physics-engine-v2.js   # Физический движок
    │   ├── freeform-manager.js    # Drag & Drop
    │   ├── particle-effects.js    # Визуальные эффекты
    │   ├── realistic-renderer.js  # Canvas рендеринг
    │   ├── magnifier.js           # Лупа
    │   └── ...                    # Другие утилиты
    │
    ├── styles/
    │   └── experiment-common.css  # Общие стили
    │
    └── assets/equipment/          # SVG изображения оборудования
        ├── weight-100g-double-hook.svg
        ├── composite-weights/
        └── ...
```

---

## 🚀 Установка

### Требования
- Веб-сервер (Apache/Nginx) с поддержкой статических файлов
- HTTPS рекомендуется (для touch-событий на мобильных)
- Никаких зависимостей от PHP/Node/Python — **чистая статика**

### Шаг 1: Загрузка на сервер

```bash
# SSH на сервер
ssh user@labosfera.ru

# Переход в корень сайта
cd /var/www/labosfera.ru/public_html/

# Создание директории (если нужно)
mkdir -p labs

# Загрузка архива (или через FTP/SFTP)
wget https://example.com/labosfera-labs.zip

# Распаковка
unzip labosfera-labs.zip
mv labs/* ./labs/
rm labosfera-labs.zip
```

### Шаг 2: Проверка прав

```bash
# Права на чтение для веб-сервера
chmod -R 755 labs/
chown -R www-data:www-data labs/  # для Apache/Nginx
```

### Шаг 3: Настройка MIME-типов (если нужно)

Для Nginx добавьте в конфиг:
```nginx
location /labs/ {
    # ES6 модули
    types {
        application/javascript js mjs;
    }
    
    # Кеширование статики
    location ~* \.(js|css|svg|png)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

Для Apache (.htaccess в папке labs/):
```apache
AddType application/javascript .js .mjs
<FilesMatch "\.(js|css|svg|png)$">
    Header set Cache-Control "max-age=604800, public"
</FilesMatch>
```

---

## 🔗 Интеграция в сайт

### Вариант A: Прямые ссылки

```html
<!-- В меню сайта -->
<nav>
    <a href="/labs/spring/">Опыт: Жёсткость пружины</a>
    <a href="/labs/friction/">Опыт: Коэффициент трения</a>
</nav>
```

### Вариант B: iframe (изоляция стилей)

```html
<iframe 
    src="/labs/spring/" 
    width="100%" 
    height="900px" 
    frameborder="0"
    allow="fullscreen">
</iframe>
```

### Вариант C: Карточки с превью

```html
<div class="experiments-grid">
    <a href="/labs/spring/" class="experiment-card">
        <h3>🌀 Опыт 1: Жёсткость пружины</h3>
        <p>Закон Гука: k = F / Δl</p>
    </a>
    <a href="/labs/friction/" class="experiment-card">
        <h3>📦 Опыт 2: Коэффициент трения</h3>
        <p>Формула: μ = F_тр / N</p>
    </a>
</div>
```

---

## ⚙️ Кастомизация

### Изменить URL кнопки "На главную"

В файлах `labs/spring/index.html` и `labs/friction/index.html`:

```javascript
// Найти строку:
window.location.href='/'

// Заменить на нужный URL:
window.location.href='/main-page/'
```

### Изменить путь установки

Если устанавливаете НЕ в `/labs/`, нужно обновить относительные пути в JS:

```javascript
// В experiment-config.js найти:
icon: '../assets/equipment/...'

// Если папка называется /virtual-lab/, пути остаются теми же
// (они относительные от текущей директории)
```

### Отключить кнопку "На главную"

```css
/* Добавить в CSS */
.btn-back { display: none !important; }
```

---

## 🧪 Тестирование

### Локальная проверка

```bash
cd /var/www/labosfera.ru/public_html/labs/
python3 -m http.server 8080
# Открыть http://localhost:8080/spring/
```

### Чек-лист после установки

- [ ] https://labosfera.ru/labs/spring/ — загружается
- [ ] https://labosfera.ru/labs/friction/ — загружается  
- [ ] Грузы перетаскиваются (drag & drop работает)
- [ ] Кнопка "На главную" ведёт на нужную страницу
- [ ] На мобильном: touch работает корректно
- [ ] Консоль браузера (F12) — нет ошибок 404/CORS

---

## 🔒 Безопасность

| Аспект | Статус |
|--------|--------|
| XSS | ✅ Нет пользовательского ввода, отправляемого на сервер |
| CSRF | ✅ Нет форм/запросов к бэкенду |
| SQL Injection | ✅ Нет базы данных |
| Зависимости | ⚠️ CDN библиотеки (Chart.js, interact.js, anime.js) |

### Внешние зависимости (CDN)

Опыты загружают библиотеки с CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
<script src="https://cdn.jsdelivr.net/npm/interactjs@1.10.19/dist/interact.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>
```

**Для полной изоляции:** скачайте эти файлы и положите в `labs/vendor/`

---

## 🐛 Troubleshooting

### Ошибка: "Failed to load module script"
**Причина:** Сервер отдаёт .js файлы с неправильным MIME-типом  
**Решение:** Добавьте `AddType application/javascript .js` в .htaccess

### Ошибка: "CORS policy"
**Причина:** Файлы загружаются с другого домена  
**Решение:** Все файлы должны быть на одном домене, или настройте CORS headers

### Drag & Drop не работает на iOS
**Причина:** Safari требует HTTPS для touch-событий  
**Решение:** Установите SSL-сертификат

### Грузы "прилипают" к курсору
**Причина:** Конфликт с другими JS библиотеками на странице  
**Решение:** Используйте iframe для изоляции

---

## 📞 Контакты

При возникновении технических проблем:
- GitHub Issues: https://github.com/Semen1987nsk/Inter_OGE
- Email: [контакт разработчика]

---

**Версия пакета:** 1.0  
**Дата сборки:** 30 января 2026  
**Совместимость:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
