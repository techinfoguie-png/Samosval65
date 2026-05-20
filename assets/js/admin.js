(function() {
  'use strict';
  
  // 🔧 НАСТРОЙКИ
  const CFG = {
    CMS_URL: 'https://script.google.com/macros/s/AKfycbzk4T_aLnTlEq-q5v4rGqFWtENTEvSvZ1wqOyKKMLBuh0HG6rwxkbYognua149x9Hze3Q/exec', // ← URL из Apps Script
    PASSWORD: 'admin123', // ← Пароль для входа
    SHEET_URL: 'https://docs.google.com/spreadsheets/d/17bbtzt_kGkVFlWZeVTP0yLvWFT0kies9qEdPTjm66NE/edit' // ← Ссылка на таблицу
    DEBUG: false       // ← Поставьте true, чтобы войти БЕЗ пароля для теста
  };

  document.addEventListener('DOMContentLoaded', function() {
    console.log('🟢 admin.js загружен. Режим отладки:', CFG.DEBUG);

    const passInput = document.getElementById('adminPass');
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('loginError');
    const loginBox = document.getElementById('loginBox');
    const dashboard = document.getElementById('dashboard');
    const statusBox = document.getElementById('globalStatus');
    const sheetLink = document.getElementById('sheetLink');
    const priceForm = document.getElementById('priceForm');

    if (!passInput || !loginBtn) {
      console.error('❌ Ошибка: Не найдены поля ввода. Проверьте, что admin.html загружен корректно.');
      return;
    }

    sheetLink.href = CFG.SHEET;

    // 🔐 ЛОГИКА ВХОДА
    function attemptLogin() {
      const entered = passInput.value.trim();
      console.log('🔑 Введено:', `"${entered}"`);
      console.log('🔑 Ожидается:', `"${CFG.PASS}"`);
      console.log('🔑 Совпадение:', entered === CFG.PASS);

      if (CFG.DEBUG || entered === CFG.PASS) {
        sessionStorage.setItem('auth', '1');
        loginBox.classList.add('hidden');
        dashboard.classList.remove('hidden');
        errorMsg.style.display = 'none';
        console.log('✅ Вход выполнен успешно');
        loadAll();
      } else {
        errorMsg.style.display = 'block';
        passInput.value = '';
        passInput.focus();
        console.warn('❌ Пароль неверный');
      }
    }

    loginBtn.addEventListener('click', attemptLogin);
    passInput.addEventListener('keydown', e => e.key === 'Enter' && attemptLogin());

    // 🔄 АВТО-ВХОД
    if (sessionStorage.getItem('auth') === '1') {
      loginBox.classList.add('hidden');
      dashboard.classList.remove('hidden');
      loadAll();
    }

    // 📥 ЗАГРУЗКА ДАННЫХ
    async function loadAll() {
      if (!statusBox) return;
      statusBox.textContent = '🔄 Загрузка...';
      statusBox.className = 'status info';
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
        statusBox.textContent = `✅ Обновлено: ${new Date().toLocaleTimeString('ru-RU')}`;
        statusBox.className = 'status ok';
      } catch (e) {
        console.error('🌐 Ошибка загрузки:', e);
        statusBox.textContent = `⚠️ Ошибка сети (${e.message}). Проверьте CMS_URL`;
        statusBox.className = 'status err';
      }
    }
    window.loadAll = loadAll;

    function renderOverview(c) {
      const el = document.getElementById('overview');
      if (!el) return;
      el.innerHTML = `<p>📞 ${c.phone||'—'} | ✉️ ${c.email||'—'}</p><p>📍 ${c.address||'—'}</p><p>🚛 Доставка: ${c.delivery_price||0}₽ / ${c.delivery_step||10} км (до ${c.delivery_radius||150} км)</p>`;
    }

    function fillForm(c) {
      if (!priceForm) return;
      ['price_pesok','price_sheben','price_grunt','price_torf','price_beton','delivery_price','delivery_step','delivery_radius'].forEach(k => {
        const input = priceForm.querySelector(`[name="${k}"]`);
        if (input) input.value = c[k] ?? '';
      });
    }

    function renderLeads(leads) {
      const tbody = document.getElementById('leadsBody');
      if (!tbody) return;
      tbody.innerHTML = leads.length === 0 
        ? '<tr><td colspan="6" style="text-align:center;padding:20px;color:#64748b">Пока нет заявок</td></tr>'
        : leads.map(l => `<tr>
            <td>${l.Timestamp||'—'}</td><td>${l.Name||'—'}</td><td>${l.Phone||'—'}</td>
            <td>${l.Material||'—'}</td><td>${l.Total_price?l.Total_price+'₽':'—'}</td>
            <td><select class="status-select" data-row="${l._row}" onchange="window.updateStatus(this)">
              <option value="new" ${l.Status==='new'?'selected':''}>new</option>
              <option value="called" ${l.Status==='called'?'selected':''}>called</option>
              <option value="done" ${l.Status==='done'?'selected':''}>done</option>
              <option value="cancel" ${l.Status==='cancel'?'selected':''}>cancel</option>
            </select></td></tr>`).join('');
    }

    async function savePrices() {
      const btn = document.getElementById('savePricesBtn');
      if (!btn || !priceForm) return;
      btn.disabled = true; btn.textContent = '⏳ Сохранение...';
      const data = new URLSearchParams({ action: 'update_config' });
      Array.from(priceForm.elements).forEach(el => { if (el.name && el.value !== '') data.append(el.name, el.value); });
      try {
        await fetch(CFG.URL, { method: 'POST', body: data });
        statusBox.textContent = '💾 Сохранено! Обновляю...'; statusBox.className = 'status ok';
        setTimeout(loadAll, 800);
      } catch { statusBox.textContent = '❌ Ошибка сохранения'; statusBox.className = 'status err'; }
      finally { btn.disabled = false; btn.textContent = '💾 Сохранить изменения'; }
    }
    document.getElementById('savePricesBtn')?.addEventListener('click', savePrices);

    async function updateStatus(select) {
      select.disabled = true;
      try {
        await fetch(CFG.URL, { method: 'POST', body: new URLSearchParams({ action: 'update_lead_status', row: select.dataset.row, status: select.value }) });
        statusBox.textContent = `📝 Заявка #${select.dataset.row} → ${select.value}`; statusBox.className = 'status ok';
      } catch { statusBox.textContent = '❌ Не удалось обновить'; statusBox.className = 'status err'; }
      finally { select.disabled = false; }
    }
    window.updateStatus = updateStatus;

    async function createBackup() {
      const btn = document.getElementById('backupBtn');
      const st = document.getElementById('backupStatus');
      if (!btn || !st) return;
      btn.disabled = true; st.className = 'status info'; st.textContent = '⏳ Создаю копию...'; st.classList.remove('hidden');
      try {
        await fetch(CFG.URL, { method: 'POST', body: new URLSearchParams({ action: 'backup' }) });
        st.className = 'status ok'; st.textContent = '✅ Бэкап создан!';
      } catch { st.className = 'status err'; st.textContent = '❌ Ошибка бэкапа.'; }
      finally { btn.disabled = false; }
    }
    document.getElementById('backupBtn')?.addEventListener('click', createBackup);

    window.logout = () => { sessionStorage.removeItem('auth'); location.reload(); };
  });
})();
