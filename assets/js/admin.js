(function() {
  'use strict';
  console.log('🟢 admin.js v3 загружен');

  // 🔧 1. КОНФИГУРАЦИЯ (всегда самая первая!)
  const CFG = {
    CMS_URL: 'https://script.google.com/macros/s/AKfycbzk4T_aLnTlEq-q5v4rGqFWtENTEvSvZ1wqOyKKMLBuh0HG6rwxkbYognua149x9Hze3Q/exec', // ← URL из Apps Script
    PASSWORD: 'admin123', // ← Пароль для входа
    SHEET_URL: 'https://docs.google.com/spreadsheets/d/17bbtzt_kGkVFlWZeVTP0yLvWFT0kies9qEdPTjm66NE/edit' // ← Ссылка на таблицу
  };

  // 🎯 2. КЭШ DOM-ЭЛЕМЕНТОВ
  const UI = {
    loginBox: document.getElementById('loginBox'),
    dashboard: document.getElementById('dashboard'),
    pass: document.getElementById('adminPass'),
    loginBtn: document.getElementById('loginBtn'),
    err: document.getElementById('loginError'),
    status: document.getElementById('globalStatus'),
    savePricesBtn: document.getElementById('savePricesBtn'),
    leadsBody: document.getElementById('leadsBody'),
    backupBtn: document.getElementById('backupBtn'),
    backupStatus: document.getElementById('backupStatus'),
    overview: document.getElementById('overview'),
    sheetLink: document.getElementById('sheetLink'),
    form: document.getElementById('priceForm')
  };

  if (!UI.loginBox) { console.error('❌ Не найден loginBox. Проверьте admin.html'); return; }
  
  UI.sheetLink.href = CFG.SHEET;
  console.log('🔑 Пароль для входа:', CFG.PASS);

  // 🔐 3. ФУНКЦИИ ВХОДА
  function handleLogin() {
    const input = UI.pass.value.trim();
    if (input === CFG.PASS) {
      sessionStorage.setItem('auth', '1');
      UI.err.style.display = 'none';
      UI.loginBox.classList.add('hidden');
      UI.dashboard.classList.remove('hidden');
      loadAll();
    } else {
      UI.err.style.display = 'block';
      UI.pass.value = '';
      UI.pass.focus();
    }
  }

  // 📥 4. ЗАГРУЗКА ДАННЫХ
  async function loadAll() {
    if (!UI.status) return;
    UI.status.textContent = '🔄 Загрузка...';
    UI.status.className = 'status info';
    try {
      const [cfgRes, leadsRes] = await Promise.all([
        fetch(`${CFG.URL}?mode=config`),
        fetch(`${CFG.URL}?mode=leads`)
      ]);
      
      const config = cfgRes.ok ? await cfgRes.json() : {};
      const leads = leadsRes.ok ? (await leadsRes.json()).leads || [] : [];
      
      renderOverview(config);
      fillForm(config);
      renderLeads(leads);
      
      UI.status.textContent = `✅ Обновлено: ${new Date().toLocaleTimeString('ru-RU')}`;
      UI.status.className = 'status ok';
    } catch (e) {
      console.error('🌐 Ошибка сети:', e);
      UI.status.textContent = `⚠️ Ошибка загрузки (${e.message})`;
      UI.status.className = 'status err';
      // Демо-данные, чтобы панель не была пустой
      renderOverview({ phone: CFG.PASS, email: 'demo@site.ru', address: 'Демо-режим', delivery_price: 1000, delivery_step: 10, delivery_radius: 150 });
    }
  }

  // 🎨 5. РЕНДЕР ИНТЕРФЕЙСА
  function renderOverview(c) {
    if (!UI.overview) return;
    UI.overview.innerHTML = `
      <p>📞 ${c.phone || '—'} | ✉️ ${c.email || '—'}</p>
      <p>📍 ${c.address || '—'}</p>
      <p>🚛 Доставка: ${c.delivery_price}₽ / ${c.delivery_step} км (макс ${c.delivery_radius} км)</p>
    `;
  }

  function fillForm(c) {
    if (!UI.form) return;
    const fields = ['price_pesok','price_sheben','price_grunt','price_torf','price_beton','delivery_price','delivery_step','delivery_radius'];
    fields.forEach(k => {
      const el = UI.form.querySelector(`[name="${k}"]`);
      if (el) el.value = c[k] ?? '';
    });
  }

  function renderLeads(leads) {
    if (!UI.leadsBody) return;
    UI.leadsBody.innerHTML = leads.length === 0
      ? '<tr><td colspan="6" style="text-align:center;padding:20px;color:#64748b">Пока нет заявок</td></tr>'
      : leads.map(l => `
      <tr>
        <td>${l.Timestamp || '—'}</td>
        <td>${l.Name || '—'}</td>
        <td>${l.Phone || '—'}</td>
        <td>${l.Material || '—'}</td>
        <td>${l.Total_price ? l.Total_price + '₽' : '—'}</td>
        <td>
          <select class="status-select" data-row="${l._row}" onchange="window.updateStatus(this)">
            <option value="new" ${l.Status==='new'?'selected':''}>new</option>
            <option value="called" ${l.Status==='called'?'selected':''}>called</option>
            <option value="done" ${l.Status==='done'?'selected':''}>done</option>
            <option value="cancel" ${l.Status==='cancel'?'selected':''}>cancel</option>
          </select>
        </td>
      </tr>
    `).join('');
  }

  // 💾 6. ДЕЙСТВИЯ
  async function savePrices() {
    if (!UI.savePricesBtn || !UI.form) return;
    UI.savePricesBtn.disabled = true;
    UI.savePricesBtn.textContent = '⏳ Сохранение...';
    const data = new URLSearchParams({ action: 'update_config' });
    Array.from(UI.form.elements).forEach(el => { if (el.name && el.value !== '') data.append(el.name, el.value); });
    
    try {
      await fetch(CFG.URL, { method: 'POST', body: data });
      UI.status.textContent = '💾 Цены сохранены! Перезагрузка...';
      UI.status.className = 'status ok';
      setTimeout(loadAll, 1000);
    } catch { UI.status.textContent = '❌ Ошибка сохранения'; UI.status.className = 'status err'; }
    finally { UI.savePricesBtn.disabled = false; UI.savePricesBtn.textContent = '💾 Сохранить изменения'; }
  }

  async function updateStatus(select) {
    const row = select.dataset.row;
    const status = select.value;
    select.disabled = true;
    try {
      await fetch(CFG.URL, { method: 'POST', body: new URLSearchParams({ action: 'update_lead_status', row, status }) });
      UI.status.textContent = `📝 Заявка #${row} → ${status}`; 
      UI.status.className = 'status ok';
    } catch { UI.status.textContent = '❌ Ошибка обновления'; UI.status.className = 'status err'; }
    finally { select.disabled = false; }
  }

  async function createBackup() {
    if (!UI.backupBtn) return;
    UI.backupBtn.disabled = true;
    UI.backupStatus.className = 'status info'; UI.backupStatus.textContent = '⏳ Создаю копию...'; UI.backupStatus.classList.remove('hidden');
    try {
      await fetch(CFG.URL, { method: 'POST', body: new URLSearchParams({ action: 'backup' }) });
      UI.backupStatus.className = 'status ok'; UI.backupStatus.textContent = '✅ Бэкап создан!';
    } catch { UI.backupStatus.className = 'status err'; UI.backupStatus.textContent = '❌ Ошибка бэкапа.'; }
    finally { UI.backupBtn.disabled = false; }
  }

  // 🔗 7. ПРИВЯЗКА СОБЫТИЙ
  UI.loginBtn.addEventListener('click', handleLogin);
  UI.pass.addEventListener('keypress', e => e.key === 'Enter' && handleLogin());
  if (UI.savePricesBtn) UI.savePricesBtn.addEventListener('click', savePrices);
  if (UI.backupBtn) UI.backupBtn.addEventListener('click', createBackup);

  // 🌍 8. ЭКСПОРТ ДЛЯ HTML (onclick="...")
  window.logout = () => { sessionStorage.removeItem('auth'); location.reload(); };
  window.updateStatus = updateStatus;
  window.loadAll = loadAll;

  // 🚀 9. АВТО-ВХОД
  if (sessionStorage.getItem('auth') === '1') {
    UI.loginBox.classList.add('hidden');
    UI.dashboard.classList.remove('hidden');
    loadAll();
  }
})();
