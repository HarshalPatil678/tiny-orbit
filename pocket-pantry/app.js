(() => {
  'use strict';
  const KEY = 'pocket-pantry-v1';
  const $ = (selector) => document.querySelector(selector);
  const form = $('#item-form');
  const list = $('#item-list');
  let items = loadItems();
  let filter = 'all';
  let toastTimer;

  function loadItems() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(value) ? value.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string') : [];
    } catch { return []; }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(items)); }
  function dateOnly(value) {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  function daysUntil(value) {
    const date = dateOnly(value);
    if (!date) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((date - today) / 86400000);
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  }
  function dateLabel(value) {
    const remaining = daysUntil(value);
    if (remaining === null) return { text: 'No date', className: 'none' };
    if (remaining < 0) return { text: `${Math.abs(remaining)}d past`, className: 'today' };
    if (remaining === 0) return { text: 'Today', className: 'today' };
    if (remaining === 1) return { text: 'Tomorrow', className: 'soon' };
    if (remaining <= 3) return { text: `In ${remaining} days`, className: 'soon' };
    return { text: dateOnly(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), className: '' };
  }
  function filteredItems() {
    const query = $('#search').value.trim().toLocaleLowerCase();
    return [...items].filter(item => {
      const remaining = daysUntil(item.date);
      const matchesFilter = filter === 'all' || (filter === 'soon' && remaining !== null && remaining >= 0 && remaining <= 3) || (filter === 'dated' && Boolean(item.date));
      return matchesFilter && (!query || `${item.name} ${item.amount}`.toLocaleLowerCase().includes(query));
    }).sort((a, b) => {
      if (!a.date) return b.date ? 1 : a.name.localeCompare(b.name);
      if (!b.date) return -1;
      return a.date.localeCompare(b.date) || a.name.localeCompare(b.name);
    });
  }
  function render() {
    const soon = items.filter(item => { const days = daysUntil(item.date); return days !== null && days >= 0 && days <= 3; }).length;
    $('#item-count').textContent = items.length;
    $('#soon-count').textContent = soon;
    $('#all-count').textContent = items.length;
    $('#filter-soon-count').textContent = soon;
    const visible = filteredItems();
    list.innerHTML = visible.map(item => {
      const date = dateLabel(item.date);
      return `<article class="item-row"><div class="item-main"><span class="item-glyph" aria-hidden="true">${item.date && daysUntil(item.date) !== null && daysUntil(item.date) <= 3 ? '◷' : '✳'}</span><span class="item-name">${escapeHTML(item.name)}</span></div><span class="item-amount">${escapeHTML(item.amount || '')}</span><span class="date-pill ${date.className}">${date.text}</span><button class="remove" type="button" data-remove="${escapeHTML(item.id)}" aria-label="Remove ${escapeHTML(item.name)}">×</button></article>`;
    }).join('');
    const empty = $('#empty-state');
    empty.classList.toggle('visible', visible.length === 0);
    if (items.length === 0) {
      empty.querySelector('strong').textContent = 'Nothing on the list yet.';
      empty.querySelector('p').textContent = 'Add one thing you already have. You can fill this in as you go.';
    } else if (visible.length === 0) {
      empty.querySelector('strong').textContent = 'No matches this time.';
      empty.querySelector('p').textContent = 'Try another search or choose a different filter.';
    }
    document.querySelectorAll('.filter').forEach(button => button.classList.toggle('active', button.dataset.filter === filter));
  }
  function toast(message) {
    const el = $('#toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name')).trim();
    if (!name) return;
    items.push({ id: crypto.randomUUID(), name, amount: String(data.get('amount')).trim(), date: String(data.get('date')) });
    save(); form.reset(); render(); $('#item-name').focus(); toast('Added to the cupboard list.');
  });
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; render(); }));
  $('#search').addEventListener('input', render);
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-remove]');
    if (!button) return;
    const item = items.find(entry => entry.id === button.dataset.remove);
    items = items.filter(entry => entry.id !== button.dataset.remove); save(); render();
    if (item) toast(`${item.name} removed.`);
  });
  $('#clear-all').addEventListener('click', () => {
    if (!items.length) { toast('The list is already clear.'); return; }
    if (!confirm('Clear every item from this browser?')) return;
    items = []; save(); render(); toast('Your list is clear.');
  });
  render();
})();

