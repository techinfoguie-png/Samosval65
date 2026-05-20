
    CMS_URL: 'https://script.google.com/macros/s/AKfycbzk4T_aLnTlEq-q5v4rGqFWtENTEvSvZ1wqOyKKMLBuh0HG6rwxkbYognua149x9Hze3Q/exec', // ← URL из Apps Script
    PASSWORD: 'admin123', // ← Пароль для входа
    SHEET_URL: 'https://docs.google.com/spreadsheets/d/17bbtzt_kGkVFlWZeVTP0yLvWFT0kies9qEdPTjm66NE/edit' // ← Ссылка на таблицу
(function() {
  'use strict';
  console.log('🟢 admin.js v4 loaded');

  // 🔧 1. КОНФИГ (запятые проверены!)
  const CFG = {
    CMS_URL: 'https://script.google.com/macros/s/AKfycbzk4T_aLnTlEq-q5v4rGqFWtENTEvSvZ1wqOyKKMLBuh0HG6rwxkbYognua149x9Hze3Q/exec', // ← URL из Apps Script
    PASSWORD: 'admin123', // ← Пароль для входа
    SHEET_URL: 'https://docs.google.com/spreadsheets/d/17bbtzt_kGkVFlWZeVTP0yLvWFT0kies9qEdPTjm66NE/edit',
    DEBUG: false
  };

  // 🎯 2. DOM
  const UI = {
    loginBox: document.getElementById('loginBox'),
    dashboard: document.getElementById('dashboard'),
    pass: document.getElementById('adminPass'),
    loginForm: document.getElementById('loginForm'),
    loginError: document.getElementById('loginError'),
    status: document.getElementById('globalStatus'),
    savePricesBtn: document.getElementById('savePricesBtn'),
    leadsBody: document.getElementById('leadsBody'),
    backupBtn: document.getElementById('backupBtn'),
    backupStatus: document.getElementById('backupStatus'),
    overview: document.getElementById('overview'),
    sheetLink: document.getElementById('sheetLink'),
    priceForm: document.getElementById('priceForm')
  };

  if (!UI.loginBox) return;
  UI.sheetLink.href = CFG.SHEET;

  // 🔐 3. ВХОД (глобальная функция для HTML)
  window.handleLogin = function(e) {
    if (e) e.preventDefault();
    const val = UI.pass.value.trim();
    console.log('🔑 Введено:', val, '| Ожидалось:', CFG.PASS);
    
    if (CFG.DEBUG || val === CFG.PASS) {
      sessionStorage.setItem('auth', '1');
      UI.loginError.style.display = 'none';
      UI.loginBox.classList.add('hidden');
      UI.dashboard.classList.remove('hidden');
      loadAll();
    } else {
      UI.loginError.style.display = 'block';
      UI.pass.value = '';
      UI.pass.focus();
    }
  };

  // 🔄 4. ЗАГРУЗКА
  async function loadAll() {
    if (!UI.status) return;
    UI.status.textContent = '🔄 Загрузка...';
    UI.status.className = 'status info';
    try {
      const [cfgRes, leadsRes] = await Promise.all([
        fetch(CFG.URL + '?mode=config'),
        fetch(CFG.URL + '?mode=leads')
      ]);
      const config = cfgRes.ok ? await cfgRes.json() : {};
      const leads = leadsRes.ok ? (await leadsRes.json()).leads || [] : [];
      renderOverview(config);
      fillForm(config);
      renderLeads(leads);
      UI.status.textContent = '✅ Обновлено: ' + new Date().toLocaleTimeString('ru-RU');
      UI.status.className = 'status ok';
    } catch (err) {
      console.error('🌐 Error:', err);
      UI.status.textContent = '⚠️ Ошибка сети: ' + err.message;
      UI.status.className = 'status err';
    }
  }
  window.loadAll = loadAll;

  // 🎨 5. РЕНДЕР
  function renderOverview(c) {
    if (!UI.overview) return;
    UI.overview.innerHTML = '<p>📞 ' + (c.phone||'—') + ' | ✉️ ' + (c.email||'—') + '</p>' +
      '<p>📍 ' + (c.address||'—') + '</p>' +
      '<p>🚛 Доставка: ' + (c.delivery_price||0) + '₽ / ' + (c.delivery_step||10) + ' км (до ' + (c.delivery_radius||150) + ' км)</p>';
  }

  function fillForm(c) {
    if (!UI.priceForm) return;
    ['price_pesok','price_sheben','price_grunt','price_torf','price_beton','delivery_price','delivery_step','delivery_radius'].forEach(function(k) {
      var el = UI.priceForm.querySelector('[name="' + k + '"]');
      if (el) el.value = c[k] !== undefined ? c[k] : '';
    });
  }

  function renderLeads(leads) {
    if (!UI.leadsBody) return;
    if (!leads.length) {
      UI.leadsBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#64748b">Пока нет заявок</td></tr>';
      return;
    }
    UI.leadsBody.innerHTML = leads.map(function(l) {
      return '<tr>' +
        '<td>' + (l.Timestamp||'—') + '</td>' +
        '<td>' + (l.Name||'—') + '</td>' +
        '<td>' + (l.Phone||'—') + '</td>' +
        '<td>' + (l.Material||'—') + '</td>' +
        '<td>' + (l.Total_price ? l.Total_price + '₽' : '—') + '</td>' +
        '<td><select class="status-select" data-row="' + l._row + '" onchange="window.updateStatus(this)">' +
          '<option value="new"' + (l.Status==='new'?' selected':'') + '>new</option>' +
          '<option value="called"' + (l.Status==='called'?' selected':'') + '>called</option>' +
          '<option value="done"' + (l.Status==='done'?' selected':'') + '>done</option>' +
          '<option value="cancel"' + (l.Status==='cancel'?' selected':'') + '>cancel</option>' +
        '</select></td></tr>';
    }).join('');
  }

  // 💾 6. ДЕЙСТВИЯ
  async function savePrices() {
    if (!UI.savePricesBtn || !UI.priceForm) return;
    UI.savePricesBtn.disabled = true;
    UI.savePricesBtn.textContent = '⏳ Сохранение...';
    var data = new URLSearchParams({ action: 'update_config' });
    Array.from(UI.priceForm.elements).forEach(function(el) {
      if (el.name && el.value !== '') data.append(el.name, el.value);
    });
    try {
      await fetch(CFG.URL, { method: 'POST', body: data });
      UI.status.textContent = '💾 Сохранено!';
      UI.status.className = 'status ok';
      setTimeout(loadAll, 800);
    } catch {
      UI.status.textContent = '❌ Ошибка сохранения';
      UI.status.className = 'status err';
    } finally {
      UI.savePricesBtn.disabled = false;
      UI.savePricesBtn.textContent = '💾 Сохранить изменения';
    }
  }

  window.updateStatus = async function(select) {
    select.disabled = true;
    try {
      await fetch(CFG.URL, {
        method: 'POST',
        body: new URLSearchParams({ action: 'update_lead_status', row: select.dataset.row, status: select.value })
      });
      UI.status.textContent = '📝 Заявка #' + select.dataset.row + ' → ' + select.value;
      UI.status.className = 'status ok';
    } catch {
      UI.status.textContent = '❌ Ошибка обновления';
      UI.status.className = 'status err';
    } finally {
      select.disabled = false;
    }
  };

  async function createBackup() {
    if (!UI.backupBtn) return;
    UI.backupBtn.disabled = true;
    UI.backupStatus.className = 'status info';
    UI.backupStatus.textContent = '⏳ Создаю копию...';
    UI.backupStatus.classList.remove('hidden');
    try {
      await fetch(CFG.URL, { method: 'POST', body: new URLSearchParams({ action: 'backup' }) });
      UI.backupStatus.className = 'status ok';
      UI.backupStatus.textContent = '✅ Бэкап создан!';
    } catch {
      UI.backupStatus.className = 'status err';
      UI.backupStatus.textContent = '❌ Ошибка бэкапа';
    } finally {
      UI.backupBtn.disabled = false;
    }
  }

  // 🔗 7. СОБЫТИЯ
  if (UI.loginForm) UI.loginForm.addEventListener('submit', window.handleLogin);
  if (UI.savePricesBtn) UI.savePricesBtn.addEventListener('click', savePrices);
  if (UI.backupBtn) UI.backupBtn.addEventListener('click', createBackup);

  // 🚪 ВЫХОД
  window.logout = function() { sessionStorage.removeItem('auth'); location.reload(); };

  // 🚀 АВТО-ВХОД
  if (sessionStorage.getItem('auth') === '1') {
    UI.loginBox.classList.add('hidden');
    UI.dashboard.classList.remove('hidden');
    loadAll();
  }
})();
