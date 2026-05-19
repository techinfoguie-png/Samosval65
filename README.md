# 🚛 Грузовоз — Сайт с CMS на Google Sheets

Сайт-калькулятор для перевозки сыпучих материалов с полноценной CMS-системой на Google Таблицах. Меняйте тексты, цены, цвета, телефон прямо из таблицы — без редактирования кода!

## 📦 Структура проекта

```
gruzovoz-site/
├── index.html                    # Главная страница
├── assets/
│   ├── css/
│   │   └── style.css            # Стили
│   ├── js/
│   │   └── main.js              # JavaScript + CMS логика
│   └── images/                   # Локальные изображения
├── google-apps-script-cms.js     # Код для Google Apps Script
├── google-apps-script.js         # Упрощённая версия (только заявки)
└── README.md                     # Этот файл
```

## 🚀 Быстрый старт

### Шаг 1: GitHub Pages

1. Создайте репозиторий на [GitHub](https://github.com/new)
2. Название: `gruzovoz-site` (или любое)
3. **Важно:** поставьте галочку **Public**
4. Загрузите все файлы из папки `gruzovoz-site`
5. Settings → Pages → Source: `main`, Folder: `/ (root)`
6. Сайт будет доступен: `https://ваш-ник.github.io/gruzovoz-site/`

### Шаг 2: Google Таблица (CMS + Заявки)

#### 2.1 Создайте таблицу
1. Откройте [Google Sheets](https://sheets.google.com)
2. Создайте новую таблицу
3. Переименуйте первый лист в **"CMS"**
4. Создайте второй лист — **"Заявки"**

#### 2.2 Заполните лист CMS

| Ключ | Значение | Тип |
|------|----------|-----|
| site_title | Грузовоз — Доставка сыпучих материалов | text |
| phone | +7 (999) 123-45-67 | text |
| email | info@gruzovoz.ru | text |
| address | Москва, ул. Строителей, 15 | text |
| color_primary | #1a5f2a | color |
| color_accent | #f4a261 | color |
| hero_title | Доставка сыпучих материалов самосвалами 6 м³ | text |
| price_pesok | 4500 | number |
| price_sheben | 5200 | number |
| delivery_price | 1000 | number |
| delivery_step | 10 | number |
| map_coords | 55.7558, 37.6173 | text |

**Полный список ключей** смотрите в файле `google-apps-script-cms.js` (функция `createDefaultCMS`).

#### 2.3 Подключите Apps Script

1. В таблице: **Расширения → Apps Script**
2. Удалите весь код, вставьте код из `google-apps-script-cms.js`
3. Сохраните (Ctrl+S)
4. **Развернуть → Новое развертывание**
5. Тип: **Веб-приложение**
6. Доступ: **Все**
7. Скопируйте URL

### Шаг 3: Подключите к сайту

1. Откройте `assets/js/main.js`
2. Найдите `CONFIG.CMS_SHEET_ID` и вставьте ID таблицы
3. Найдите `GOOGLE_SCRIPT_URL` и вставьте URL из шага 2.3
4. Закоммитьте изменения

## 🎨 Что можно менять через CMS

### Цвета темы
- `color_primary` — основной цвет (зелёный)
- `color_primary_dark` — тёмный оттенок
- `color_primary_light` — светлый оттенок
- `color_accent` — акцентный цвет (оранжевый)

### Контакты
- `phone` — телефон (меняется везде на сайте)
- `email` — email
- `address` — адрес
- `work_hours` — режим работы
- `whatsapp_number` — номер для WhatsApp

### Тексты
- `site_title` — заголовок вкладки браузера
- `meta_description` — описание для поисковиков
- `hero_title` — главный заголовок
- `hero_subtitle` — подзаголовок
- `cta_title`, `cta_text` — текст в блоке призыва к действию

### Цены материалов
- `price_pesok` — песок
- `price_sheben` — щебень гранитный
- `price_grunt` — грунт
- `price_torf` — торф
- `price_beton` — бетон

### Настройки доставки
- `delivery_price` — цена за шаг (по умолчанию 1000)
- `delivery_step` — шаг в км (по умолчанию 10)
- `delivery_radius` — радиус доставки в км
- `map_coords` — координаты базы (широта, долгота)

## 📊 Лист "Заявки"

Заявки с сайта автоматически сохраняются в лист "Заявки" с колонками:
- Дата | Имя | Телефон | Материал | Количество | Адрес | Комментарий | Источник

## 🔧 Расширенная настройка

### Добавить новый текстовый блок

1. В листе CMS добавьте строку:
   - Ключ: `my_new_text`
   - Значение: `Ваш текст`
   - Тип: `text`

2. В `index.html` добавьте элемент с id:
   ```html
   <p id="cms-my-new-text">Дефолтный текст</p>
   ```

3. В `main.js` в функции `applyCMSData()` добавьте:
   ```javascript
   if (cmsData.my_new_text) {
       document.getElementById('cms-my-new-text').textContent = cmsData.my_new_text.value;
   }
   ```

### Сделать таблицу приватной

Если таблица приватная, нужен API ключ:
1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Создайте API Key
3. В `main.js` добавьте в `CONFIG.API_KEY`
4. Измените `fetchSheetData` для использования API

## 📱 Админ-панель

На сайте в правом нижнем углу есть кнопка ⚙️ — нажмите её, чтобы увидеть статус CMS.

## 🆘 Проблемы?

1. **CMS не загружается** — проверьте, что таблица опубликована (Файл → Опубликовать в интернете)
2. **Заявки не приходят** — проверьте URL Apps Script и права доступа
3. **Цвета не меняются** — убедитесь, что формат цвета: `#1a5f2a` (HEX)

---
© 2025 Грузовоз
