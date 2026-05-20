(function() {
  'use strict';
  
  console.log('🟢 admin.js загружен');
  
  // 🔧 НАСТРОЙКИ (проверьте, что они совпадают с вашими!)
  const CFG = {
    CMS_URL: 'https://script.google.com/macros/s/AKfycbzk4T_aLnTlEq-q5v4rGqFWtENTEvSvZ1wqOyKKMLBuh0HG6rwxkbYognua149x9Hze3Q/exec', // ← URL из Apps Script
    PASSWORD: 'Samosval65!@#', // ← Пароль для входа
    SHEET_URL: 'https://docs.google.com/spreadsheets/d/17bbtzt_kGkVFlWZeVTP0yLvWFT0kies9qEdPTjm66NE/edit' // ← Ссылка на таблицу
  };

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

  if (!UI.loginBox || !UI.pass) {
    console.error('❌ Не найдены DOM-элементы админки. Проверьте admin.html');
    return;
  }

  UI.sheetLink.href = CFG.SHEET;
  console.log('🔐 Пароль в скрипте:', CFG.PASS);

  // 🟢 Вход
  function handleLogin() {
    const input = UI.pass.value.trim();
    console.log('📝 Попытка входа. Введено:', input);
    
    if (input === CFG.PASS) {
      console.log('✅ Пароль верный');
      sessionStorage.setItem('auth', '1');
      UI.err.style.display = 'none';
      showPanel();
      loadAll();
    } else {
      console.warn('❌ Неверный пароль. Ожидалось:', CFG.PASS);
      UI.err.style.display = 'block';
      UI.pass.value = '';
      UI.pass.focus();
    }
  }

  UI.loginBtn.addEventListener('click', handleLogin);
  UI.pass.addEventListener('keypress', e => e.key === 'Enter' && handleLogin());

  // 🖥️ Показать панель
  function showPanel() {
    console.log('📊 Переключение на dashboard');
    UI.loginBox.classList.add('hidden');
    UI.dashboard.classList.remove('hidden');
  }

  // 🔄 Загрузка данных (не ломает UI при ошибке сети)
  async function loadAll() {
    setStatus('🔄 Загрузка данных...', 'info');
    try {
      const [cfgRes, leadsRes] = await Promise.all([
        fetch(`${CFG.URL}?mode=config`),
        fetch(`${CFG.URL}?mode=leads`)
      ]);
      
      if (!cfgRes.ok) throw new Error(`Config HTTP ${cfgRes.status}`);
      const configData = await cfgRes.json();
      const leadsData = leadsRes.ok ? await leadsRes.json() : { leads: [] };
      
      renderOverview(configData);
      fillForm(configData);
      renderLeads(leadsData.leads || []);
      setStatus(`✅ Обновлено: ${new Date().toLocaleTimeString('ru-RU')}`, 'ok');
    } catch (e) {
      console.error('🌐 Ошибка загрузки:', e);
      setStatus(`⚠️ Данные не загрузились (${e.message}). Проверьте CMS_URL в admin.js и права Apps Script. Панель работает в демо-режиме.`, 'err');
      // Демо-данные, чтобы админка не была пустой
      renderOverview({ phone: CFG.PASS, email: 'demo@site.ru', address: 'Демо-режим', color_primary: '#1a5f2a', color_accent: '#f4a261', delivery_price: 1000, delivery_step: 10, delivery_radius: 150 });
    }
  }
  window.loadAll = loadAll;

  function setStatus(msg, type) { 
    UI.status.textContent = msg; 
    UI.status.className = `status ${type}`; 
  }

  function renderOverview(c) {
    UI.overview.innerHTML = `
      <p>📞 ${c.phone || '—'} | ✉️ ${c.email || '—'}</p>
      <p>📍 ${c.address || '—'}</p>
      <p>🎨 Цвета: <span style="color:${c.color_primary};font-weight:bold">${c.color_primary}</span> / ${c.color_accent}</p>
      <p>🚛 Доставка: ${c.delivery_price}₽ за ${c.delivery_step} км (до ${c.delivery_radius} км)</p>
    `;
  }

  function fillForm(c) {
    if (!UI.form) return;
    ['price_pesok','price_sheben','price_grunt','price_torf','price_beton','delivery_price','delivery_step','delivery_radius'].forEach(k => {
      const el = UI.form.querySelector(`[name="${k}"]`);
      if (el) el.value = c[k] ?? '';
    });
  }

  async function savePrices() {
    if (!UI.savePricesBtn) return;
    UI.savePricesBtn.disabled = true;
    UI.savePricesBtn.textContent = 'Сохранение...';
    const data = new URLSearchParams();
    data.append('action', 'update_config');
    Array.from(UI.form.elements).forEach(el => {
      if (el.name && el.value !== '') data.append(el.name, el.value);
    });
    try {
      await fetch(CFG.URL, { method: 'POST', body: data });
      setStatus('💾 Цены сохранены! Перезагрузка...', 'ok');
      setTimeout(loadAll, 800);
    } catch { setStatus('❌ Ошибка сохранения', 'err'); }
    finally { UI.savePricesBtn.disabled = false; UI.savePricesBtn.textContent = '💾 Сохранить изменения'; }
  }

  function renderLeads(leads) {
    if (!UI.leadsBody) return;
    UI.leadsBody.innerHTML = leads.length === 0 
      ? '<tr><td colspan="6" style="text-align:center;color:#64748b">Пока нет заявок</td></tr>'
      : leads.map(l => `
      <tr>
        <td>${l.Timestamp || '—'}</td>
        <td>${l.Name || '—'}</td>
        <td>${l.Phone || '—'}</td>
        <td>${l.Material || '—'}</td>
        <td>${l.Total_price ? l.Total_price + '₽' : '—'}</td>
        <td>
          <select class="status-select" data-row="${l._row}" onchange="updateStatus(this)">
            <option value="new" ${l.Status==='new'?'selected':''}>new</option>
            <option value="called" ${l.Status==='called'?'selected':''}>called</option>
            <option value="done" ${l.Status==='done'?'selected':''}>done</option>
            <option value="cancel" ${l.Status==='cancel'?'selected':''}>cancel</option>
          </select>
        </td>
      </tr>
    `).join('');
  }

  async function updateStatus(select) {
    const row = select.dataset.row;
    const status = select.value;
    select.disabled = true;
    try {
      await fetch(CFG.URL, {
        method: 'POST',
        body: new URLSearchParams({ action: 'update_lead_status', row, status })
      });
      setStatus(`📝 Заявка #${row} → ${status}`, 'ok');
    } catch { setStatus('❌ Не удалось обновить статус', 'err'); }
    finally { select.disabled = false; }
  }
  window.updateStatus = updateStatus;

  async function createBackup() {
    if (!UI.backupBtn) return;
    UI.backupBtn.disabled = true;
    UI.backupStatus.className = 'status info';
    UI.backupStatus.textContent = '⏳ Создаю копию в Drive...';
    UI.backupStatus.classList.remove('hidden');
    try {
      await fetch(CFG.URL, { method: 'POST', body: new URLSearchParams({ action: 'backup' }) });
      UI.backupStatus.className = 'status ok';
      UI.backupStatus.textContent = '✅ Бэкап создан! Проверьте Google Drive.';
    } catch { UI.backupStatus.className = 'status err'; UI.backupStatus.textContent = '❌ Ошибка бэкапа.'; }
    finally { UI.backupBtn.disabled = false; }
  }

  // 🚪 Выход
  window.logout = () => { sessionStorage.removeItem('auth'); location.reload(); };

  // 🟢 Авто-вход
  if (sessionStorage.getItem('auth') === '1') {
    showPanel();
    loadAll();
  }
})();
