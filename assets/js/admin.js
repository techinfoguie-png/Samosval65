(function() {
  'use strict';
  
  console.log('🟢 admin.js загружен');
  
    const CONFIG = {
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

  let configData = {};

  function init() {
    UI.sheetLink.href = CFG.SHEET;
    if (sessionStorage.getItem('auth') === '1') { showPanel(); loadAll(); }
    UI.loginBtn.onclick = login;
    UI.pass.onkeydown = e => e.key === 'Enter' && login();
    UI.savePricesBtn.onclick = savePrices;
    UI.backupBtn.onclick = createBackup;
  }

  function login() {
    if (UI.pass.value.trim() === CFG.PASS) {
      sessionStorage.setItem('auth', '1');
      UI.err.style.display = 'none';
      showPanel();
      loadAll();
    } else UI.err.style.display = 'block';
  }

  function showPanel() { UI.loginBox.classList.add('hidden'); UI.dashboard.classList.remove('hidden'); }
  window.logout = () => { sessionStorage.removeItem('auth'); location.reload(); };

  async function loadAll() {
    setStatus('🔄 Загрузка...', 'info');
    try {
      const [cfgRes, leadsRes] = await Promise.all([
        fetch(`${CFG.URL}?mode=config`),
        fetch(`${CFG.URL}?mode=leads`)
      ]);
      configData = await cfgRes.json();
      const leads = await leadsRes.json();
      renderOverview(configData);
      fillForm(configData);
      renderLeads(leads.leads || []);
      setStatus(`✅ Обновлено: ${new Date().toLocaleTimeString('ru-RU')}`, 'ok');
    } catch (e) {
      setStatus(`❌ Ошибка сети. Проверьте URL и права доступа.`, 'err');
    }
  }
  window.loadAll = loadAll;

  function setStatus(msg, type) { UI.status.textContent = msg; UI.status.className = `status ${type}`; }

  function renderOverview(c) {
    UI.overview.innerHTML = `
      <p>📞 ${c.phone || '—'} | ✉️ ${c.email || '—'}</p>
      <p>📍 ${c.address || '—'}</p>
      <p>🎨 Цвета: <span style="color:${c.color_primary};font-weight:bold">${c.color_primary}</span> / ${c.color_accent}</p>
      <p>🚛 Доставка: ${c.delivery_price}₽ за каждые ${c.delivery_step} км (до ${c.delivery_radius} км)</p>
    `;
  }

  function fillForm(c) {
    ['price_pesok','price_sheben','price_grunt','price_torf','price_beton','delivery_price','delivery_step','delivery_radius'].forEach(k => {
      if (UI.form[k]) UI.form[k].value = c[k] ?? '';
    });
  }

  async function savePrices() {
    UI.savePricesBtn.disabled = true;
    UI.savePricesBtn.textContent = 'Сохранение...';
    const data = new URLSearchParams();
    data.append('action', 'update_config');
    Array.from(UI.form.elements).forEach(el => {
      if (el.name && el.value !== '') data.append(el.name, el.value);
    });
    try {
      await fetch(CFG.URL, { method: 'POST', body: data });
      setStatus('💾 Цены успешно обновлены!', 'ok');
      loadAll(); // Перезагрузить кэш
    } catch { setStatus('❌ Ошибка сохранения', 'err'); }
    finally { UI.savePricesBtn.disabled = false; UI.savePricesBtn.textContent = '💾 Сохранить изменения'; }
  }

  function renderLeads(leads) {
    UI.leadsBody.innerHTML = leads.map(l => `
      <tr>
        <td>${l.Timestamp || '—'}</td>
        <td>${l.Name || '—'}</td>
        <td>${l.Phone || '—'}</td>
        <td>${l.Material || '—'}</td>
        <td>${l.Total_price ? l.Total_price + '₽' : '—'}</td>
        <td>
          <select class="status-select" data-row="${l._row}" onchange="updateStatus(this)">
            <option ${l.Status==='new'?'selected':''}>new</option>
            <option ${l.Status==='called'?'selected':''}>called</option>
            <option ${l.Status==='done'?'selected':''}>done</option>
            <option ${l.Status==='cancel'?'selected':''}>cancel</option>
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
    UI.backupBtn.disabled = true;
    UI.backupStatus.className = 'status info';
    UI.backupStatus.textContent = '⏳ Создаю копию в Drive...';
    UI.backupStatus.classList.remove('hidden');
    try {
      await fetch(CFG.URL, { method: 'POST', body: new URLSearchParams({ action: 'backup' }) });
      UI.backupStatus.className = 'status ok';
      UI.backupStatus.textContent = '✅ Бэкап успешно создан! Проверьте Google Drive.';
    } catch { UI.backupStatus.className = 'status err'; UI.backupStatus.textContent = '❌ Ошибка создания бэкапа.'; }
    finally { UI.backupBtn.disabled = false; }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
