// ===== НАСТРОЙКИ =====
const CMS_URL = 'https://script.google.com/macros/s/AKfycbzk4T_aLnTlEq-q5v4rGqFWtENTEvSvZ1wqOyKKMLBuh0HG6rwxkbYognua149x9Hze3Q/exec'; // ← ВСТАВЬТЕ СВОЙ URL
const CACHE_KEY = 'gruzovoz_cms';
const CACHE_TTL = 20 * 60 * 1000; // 20 минут

let cms = {};
let calc = null;

// ===== ЗАГРУЗКА CMS =====
async function loadCMS() {
  // 1. Кэш
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, ts } = JSON.parse(cached);
    if (Date.now() - ts < CACHE_TTL) return data;
  }
  
  // 2. Сервер
  try {
    const res = await fetch(CMS_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    return data;
  } catch (e) {
    console.warn('CMS load error, using fallback', e);
    return getFallback();
  }
}

function getFallback() {
  return {
    site_title: 'Грузовоз', phone: '+7 (999) 123-45-67',
    price_pesok: 4500, price_sheben: 5200, price_grunt: 3800,
    price_torf: 5500, price_beton: 6500,
    delivery_price: 1000, delivery_step: 10, delivery_radius: 150,
    color_primary: '#1a5f2a', color_accent: '#f4a261',
    show_calculator: true, show_map: true, show_order_form: true
  };
}

// ===== ПРИМЕНЕНИЕ CMS =====
function applyCMS(c) {
  cms = c;
  
  // Тексты по ID
  Object.entries(c).forEach(([k, v]) => {
    const el = document.getElementById('cms-' + k);
    if (el) el.textContent = v;
  });
  
  // Ссылки
  const phone = c.phone?.replace(/\D/g, '');
  if (phone) {
    document.getElementById('cms-phone-link').href = 'tel:' + phone;
  }
  if (c.whatsapp_number) {
    document.querySelectorAll('[href*="wa.me"]').forEach(a => {
      a.href = 'https://wa.me/' + c.whatsapp_number;
    });
  }
  
  // Цвета
  if (c.color_primary) document.documentElement.style.setProperty('--primary', c.color_primary);
  if (c.color_accent) document.documentElement.style.setProperty('--accent', c.color_accent);
  
  // Цены в бейджах
  const minPrice = Math.min(c.price_pesok, c.price_grunt, c.price_sheben);
  const badge = document.getElementById('cms-price_badge');
  if (badge && minPrice) badge.textContent = `💰 От ${minPrice.toLocaleString('ru-RU')} ₽`;
  
  // Карта
  if (c.show_map !== false && typeof ymaps !== 'undefined') initMap(c);
  
  // Скрыть лоадер
  document.getElementById('cms-loader').style.opacity = '0';
  setTimeout(() => document.getElementById('cms-loader').remove(), 300);
  
  // Год
  document.getElementById('year').textContent = new Date().getFullYear();
  
  // Калькулятор
  if (c.show_calculator !== false) initCalc(c);
}

// ===== КАЛЬКУЛЯТОР =====
function initCalc(c) {
  const mat = document.getElementById('material');
  const dist = document.getElementById('distance');
  const range = document.getElementById('distance-range');
  const qty = document.getElementById('quantity');
  const rangeVal = document.getElementById('range-val');
  const result = document.getElementById('result');
  const totalEl = document.getElementById('total-price');
  const detailEl = document.getElementById('result-detail');
  
  const syncDist = (v) => {
    const val = Math.min(Number(v) || 0, c.delivery_radius || 150);
    dist.value = val; range.value = val;
    rangeVal.textContent = val + ' км';
    return val;
  };
  
  dist.oninput = () => syncDist(dist.value);
  range.oninput = () => syncDist(range.value);
  
  window.recalc = () => {
    const key = mat.value;
    const base = key ? (c['price_' + key] || 0) : 0;
    const d = syncDist(dist.value);
    const q = Math.max(1, Number(qty.value) || 1);
    
    if (!key) { result.style.display = 'none'; return; }
    result.style.display = 'block';
    
    if (d > (c.delivery_radius || 150)) {
      totalEl.textContent = '❌ Вне зоны';
      detailEl.textContent = `Макс: ${c.delivery_radius} км`;
      calc = null; return;
    }
    
    const step = c.delivery_step || 10;
    const rate = c.delivery_price || 1000;
    const delivery = Math.ceil(d / step) * rate;
    const total = (base + delivery) * q;
    
    totalEl.textContent = total.toLocaleString('ru-RU') + ' ₽';
    detailEl.innerHTML = `<b>${mat.options[mat.selectedIndex].text}</b><br>База: ${base}₽ + Доставка: ${delivery}₽ (×${q})`;
    
    calc = { material: mat.options[mat.selectedIndex].text, distance: d, quantity: q, total };
  };
  
  [mat, dist, range, qty].forEach(el => el.oninput = recalc);
  recalc();
}

window.scrollToOrder = () => {
  document.getElementById('order').scrollIntoView({ behavior: 'smooth' });
  // Автозаполнение формы
  if (calc) {
    document.getElementById('order-material').value = calc.material;
  }
};

// ===== ОТПРАВКА ФОРМЫ =====
window.submitOrder = async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const form = e.target;
  
  // Honeypot
  if (form.querySelector('input[name="website"]').value) return;
  
  // Валидация телефона
  const phone = form.phone.value.replace(/\D/g, '');
  if (phone.length < 10) { alert('Введите корректный телефон'); return; }
  
  btn.disabled = true; btn.textContent = 'Отправка...';
  
  const data = new FormData(form);
  if (calc) {
    data.append('calc_material', calc.material);
    data.append('calc_distance', calc.distance);
    data.append('calc_quantity', calc.quantity);
    data.append('calc_total', calc.total);
  }
  
  try {
    const res = await fetch(CMS_URL, { method: 'POST', body: new URLSearchParams(data) });
    const json = await res.json();
    
    if (json.status === 'ok') {
      document.getElementById('orderForm').style.display = 'none';
      document.getElementById('formSuccess').style.display = 'block';
      form.reset(); calc = null;
    } else {
      throw new Error(json.error || 'Ошибка');
    }
  } catch (err) {
    console.error(err);
    alert('⚠️ Не удалось отправить. Позвоните нам: ' + (cms.phone || '+7 (999) 123-45-67'));
  } finally {
    btn.disabled = false; btn.textContent = '📤 Отправить заявку';
  }
};

window.resetForm = () => {
  document.getElementById('orderForm').style.display = 'block';
  document.getElementById('formSuccess').style.display = 'none';
};

// ===== КАРТА =====
function initMap(c) {
  ymaps.ready(() => {
    const coords = (c.map_coords || '46.9588,142.7387').split(',').map(Number);
    const map = new ymaps.Map('yandex-map', { center: coords, zoom: 10, controls: ['zoomControl'] });
    
    map.geoObjects.add(new ymaps.Placemark(coords, {
      hintContent: c.address || 'База',
      balloonContent: `<b>${c.site_title}</b><br>${c.address}<br>${c.phone}`
    }, { preset: 'islands#greenCircleIcon' }));
    
    // Круг доставки
    const r = (c.delivery_radius || 150) * 900;
    map.geoObjects.add(new ymaps.Circle([coords, r], { hintContent: `Зона: ${c.delivery_radius} км` }, {
      fillColor: 'rgba(26,95,42,0.1)', strokeColor: '#1a5f2a', strokeWidth: 2
    }));
    
    // Адаптив
    const resize = () => {
      const h = Math.max(400, window.innerHeight * 0.5);
      document.getElementById('yandex-map').style.height = h + 'px';
      map.container.fitToViewport();
    };
    resize(); window.onresize = resize;
  });
}

// ===== ЗАПУСК =====
document.addEventListener('DOMContentLoaded', async () => {
  const config = await loadCMS();
  applyCMS(config);
});
