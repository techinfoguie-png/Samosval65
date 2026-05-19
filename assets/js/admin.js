// assets/js/admin.js
(function () {
  'use strict';

  // 🔧 НАСТРОЙКИ (замените на свои)
  const CONFIG = {
    CMS_URL: 'https://script.google.com/macros/s/AKfycbzk4T_aLnTlEq-q5v4rGqFWtENTEvSvZ1wqOyKKMLBuh0HG6rwxkbYognua149x9Hze3Q/exec', // ← URL из Apps Script
    PASSWORD: 'Samosval65!@#', // ← Пароль для входа
    SHEET_URL: 'https://docs.google.com/spreadsheets/d/17bbtzt_kGkVFlWZeVTP0yLvWFT0kies9qEdPTjm66NE/edit' // ← Ссылка на таблицу
  };

  // 🎯 DOM-элементы
  const UI = {
    loginBox: document.getElementById('loginBox'),
    dashboard: document.getElementById('dashboard'),
    passInput: document.getElementById('adminPass'),
    loginBtn: document.getElementById('loginBtn'),
    loginError: document.getElementById('loginError'),
    statusBox: document.getElementById('cmsStatus'),
    refreshBtn: document.getElementById('refreshBtn'),
    sheetLink: document.getElementById('sheetLink'),
    logoutBtn: document.getElementById('logoutBtn'),
    fields: {
      phone: document.getElementById('adm-phone'),
      wa: document.getElementById('adm-wa'),
      email: document.getElementById('adm-email'),
      address: document.getElementById('adm-address'),
      pesok: document.getElementById('adm-pesok'),
      sheben: document.getElementById('adm-sheben'),
      grunt: document.getElementById('adm-grunt'),
      torf: document.getElementById('adm-torf'),
      beton: document.getElementById('adm-beton'),
      delivery: document.getElementById('adm-delivery'),
      step: document.getElementById('adm-step'),
      radius: document.getElementById('adm-radius'),
      color1: document.getElementById('adm-color1'),
      color2: document.getElementById('adm-color2')
    }
  };

  // 🚀 Инициализация
  function init() {
    UI.sheetLink.href = CONFIG.SHEET_URL;
    
    // Проверяем сессию
    if (sessionStorage.getItem('admin_auth') === 'true') {
      showDashboard();
      loadData();
    }
    
    bindEvents();
  }

  // 🎛️ Привязка событий
  function bindEvents() {
    UI.loginBtn.addEventListener('click', handleLogin);
    UI.passInput.addEventListener('keypress', e => e.key === 'Enter' && handleLogin());
    UI.refreshBtn.addEventListener('click', loadData);
    UI.logoutBtn.addEventListener('click', handleLogout);
  }

  // 🔐 Вход
  function handleLogin() {
    if (UI.passInput.value.trim() === CONFIG.PASSWORD) {
      sessionStorage.setItem('admin_auth', 'true');
      UI.loginError.style.display = 'none';
      showDashboard();
      loadData();
    } else {
      UI.loginError.style.display = 'block';
      UI.passInput.value = '';
      UI.passInput.focus();
    }
  }

  // 🚪 Выход
  function handleLogout() {
    sessionStorage.removeItem('admin_auth');
    location.reload();
  }

  // 📊 Показать панель
  function showDashboard() {
    UI.loginBox.classList.add('hidden');
    UI.dashboard.classList.remove('hidden');
  }

  // 📥 Загрузка данных
  async function loadData() {
    showStatus('🔄 Загрузка...', 'info');
    try {
      const res = await fetch(CONFIG.CMS_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderData(data);
      showStatus(`✅ Обновлено: ${new Date().toLocaleTimeString('ru-RU')}`, 'ok');
    } catch (err) {
      console.error('CMS load error:', err);
      showStatus(`❌ Ошибка: ${err.message}. Проверьте URL и права доступа в Apps Script.`, 'err');
    }
  }

  // 🎨 Рендер данных
  function renderData(c) {
    // Контакты
    UI.fields.phone.textContent = c.phone || '—';
    UI.fields.wa.textContent = c.whatsapp_number ? `+${c.whatsapp_number}` : '—';
    UI.fields.email.textContent = c.email || '—';
    UI.fields.address.textContent = c.address || '—';

    // Цены
    ['pesok', 'sheben', 'grunt', 'torf', 'beton'].forEach(k => {
      const val = c[`price_${k}`];
      UI.fields[k].textContent = val != null ? `${Number(val).toLocaleString('ru-RU')} ₽` : '—';
    });

    // Доставка
    UI.fields.delivery.textContent = c.delivery_price != null ? `${c.delivery_price} ₽` : '—';
    UI.fields.step.textContent = c.delivery_step != null ? `${c.delivery_step} км` : '—';
    UI.fields.radius.textContent = c.delivery_radius != null ? `${c.delivery_radius} км` : '—';

    // Дизайн
    UI.fields.color1.textContent = c.color_primary || '—';
    UI.fields.color2.textContent = c.color_accent || '—';
  }

  // 💬 Статус-бар
  function showStatus(msg, type) {
    UI.statusBox.textContent = msg;
    UI.statusBox.className = `status ${type}`;
  }

  // 🟢 Запуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
