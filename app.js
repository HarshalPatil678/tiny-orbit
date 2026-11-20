(() => {
  'use strict';
  const KEY = 'tiny-orbit-v1';
  const starter = {
    lists: [{ id: 'personal', name: 'Personal', emoji: '☼', color: '#d7a85c' }, { id: 'work', name: 'Work', emoji: '◈', color: '#8d9bba' }, { id: 'errands', name: 'Errands', emoji: '↗', color: '#c796a4' }],
    tasks: [],
    filter: 'all', selectedList: 'all', activity: []
  };
  const $ = (s) => document.querySelector(s);
  const state = load();
  let toastTimer, timerInterval = null, secondsLeft = 25 * 60;
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && Array.isArray(saved.tasks) && Array.isArray(saved.lists)) {
        const demoTasks = new Set(['a1:Take a slow morning walk', 'a2:Send the project update', 'a3:Water the plants', 'a4:Read a few pages']);
        saved.tasks = saved.tasks.filter(task => !demoTasks.has(`${task.id}:${task.text}`));
        const oldList = saved.lists.find(list => list.id === 'life' && list.name === 'Little joys');
        if (oldList) { oldList.name = 'Errands'; oldList.emoji = '↗'; }
        return { ...starter, ...saved };
      }
    } catch { /* Start with a fresh little space if saved data is unavailable. */ }
    return structuredClone(starter);
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  function todayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  function escapeHTML(value) { return value.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]); }
  function render() {
    renderHeader(); renderLists(); renderTasks(); renderProgress(); renderRhythm();
  }
  function renderHeader() {
    const now = new Date();
    $('#today-label').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(now).toUpperCase();
    const hour = now.getHours();
    $('#greeting').textContent = hour < 12 ? 'A FRESH PAGE FOR THE MORNING' : hour < 17 ? 'A PLACE TO PAUSE AND RESET' : 'PUT THE DAY DOWN FOR A MOMENT';
  }
  function renderLists() {
    const host = $('#list-nav');
    host.innerHTML = `<button class="nav-link ${state.selectedList === 'all' ? 'active' : ''}" data-list="all"><span class="list-emoji">✳</span> All tasks <span class="nav-count">${state.tasks.length}</span></button>` + state.lists.map(list => `<button class="nav-link ${state.selectedList === list.id ? 'active' : ''}" data-list="${escapeHTML(list.id)}"><span class="list-emoji">${escapeHTML(list.emoji)}</span> ${escapeHTML(list.name)} <span class="list-dot" style="background:${escapeHTML(list.color)}"></span></button>`).join('');
    host.querySelectorAll('[data-list]').forEach(button => button.addEventListener('click', () => { state.selectedList = button.dataset.list; render(); }));
    const select = $('#task-list-select');
    const old = select.value;
    select.innerHTML = state.lists.map(list => `<option value="${escapeHTML(list.id)}">${escapeHTML(list.name)}</option>`).join('');
    if (state.lists.some(list => list.id === old)) select.value = old;
  }
  function renderTasks() {
    const visible = state.tasks.filter(task => (state.selectedList === 'all' || task.list === state.selectedList) && (state.filter === 'all' || (state.filter === 'active' ? !task.done : task.done)));
    const host = $('#task-list');
    host.innerHTML = visible.map(task => {
      const list = state.lists.find(item => item.id === task.list) || { name: 'Personal' };
      const tagClass = list.name.toLowerCase().includes('work') ? 'work' : list.name.toLowerCase().includes('errand') ? 'life' : '';
      return `<div class="task-row ${task.done ? 'done' : ''}" data-task="${escapeHTML(task.id)}"><button class="check-task" aria-label="${task.done ? 'Mark incomplete' : 'Complete task'}"></button><span class="task-name" role="button" tabindex="0">${escapeHTML(task.text)}</span><span class="task-tag ${tagClass}">${escapeHTML(list.name)}</span><button class="task-delete" aria-label="Delete task" title="Delete task">×</button></div>`;
    }).join('');
    $('#empty-state').hidden = visible.length !== 0;
    host.querySelectorAll('.task-row').forEach(row => {
      const task = state.tasks.find(item => item.id === row.dataset.task);
      row.querySelector('.check-task').addEventListener('click', () => toggleTask(task));
      const label = row.querySelector('.task-name');
      label.addEventListener('click', () => toggleTask(task));
      label.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleTask(task); } });
      row.querySelector('.task-delete').addEventListener('click', () => { state.tasks = state.tasks.filter(item => item.id !== task.id); save(); render(); showToast('Task gently let go.'); });
    });
    const total = state.tasks.length, done = state.tasks.filter(task => task.done).length, active = total - done;
    $('#task-total').textContent = total; $('#all-count').textContent = total; $('#active-count').textContent = active; $('#done-count').textContent = done;
    $('#focus-count').textContent = '25';
    $('#task-list-select').value = state.lists.some(item => item.id === state.selectedList) ? state.selectedList : (state.lists[0]?.id || '');
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.toggle('selected', tab.dataset.filter === state.filter));
  }
  function toggleTask(task) {
    task.done = !task.done;
    if (task.done) { state.activity = [...new Set([...state.activity, todayKey()])]; showToast('One little thing, done. ✳'); }
    save(); render();
  }
  function renderProgress() {
    const total = state.tasks.length, done = state.tasks.filter(task => task.done).length;
    const percent = total ? Math.round(done / total * 100) : 0;
    $('#progress-percent').textContent = `${percent}%`;
    $('#progress-ring').style.background = `conic-gradient(#81977d ${percent * 3.6}deg, #edf0e9 ${percent * 3.6}deg)`;
    $('#progress-detail').textContent = `${done} of ${total} ${total === 1 ? 'task' : 'tasks'} done`;
    $('#progress-title').textContent = percent === 100 && total ? 'That’s the list.' : percent > 0 ? 'You’ve got a start.' : 'Room to begin';
    $('#progress-caption').textContent = percent === 100 && total ? 'You can call it there, or add more.' : percent > 0 ? 'Keep going, or leave it here.' : 'Pick a place to start.';
    $('#progress-remaining').textContent = total === done && total ? 'All checked off ✓' : total - done ? `${total - done} left on the list →` : 'Add your first task →';
  }
  function renderRhythm() {
    const dates = [];
    for (let offset = 6; offset >= 0; offset--) { const date = new Date(); date.setDate(date.getDate() - offset); dates.push(date); }
    const names = ['S','M','T','W','T','F','S'];
    $('#week-dots').innerHTML = dates.map(date => `<span class="${state.activity.includes(todayKey(date)) ? 'active' : ''}" title="${new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date)}">${names[date.getDay()]}</span>`).join('');
    let streak = 0, check = new Date();
    if (!state.activity.includes(todayKey(check))) check.setDate(check.getDate() - 1);
    while (state.activity.includes(todayKey(check))) { streak++; check.setDate(check.getDate() - 1); }
    $('#streak-number').textContent = streak;
  }
  function showToast(message) {
    const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }
  $('#task-form').addEventListener('submit', event => {
    event.preventDefault();
    const input = $('#task-input'), text = input.value.trim();
    if (!text) { input.focus(); return; }
    state.tasks.unshift({ id: crypto.randomUUID(), text, list: $('#task-list-select').value || state.lists[0]?.id, done: false });
    input.value = ''; state.filter = 'all'; save(); render(); input.focus();
  });
  document.querySelectorAll('.filter-tab').forEach(tab => tab.addEventListener('click', () => {
    state.filter = tab.dataset.filter;
    document.querySelectorAll('.filter-tab').forEach(item => item.classList.toggle('selected', item === tab));
    renderTasks();
  }));
  document.querySelectorAll('[data-suggestion]').forEach(button => button.addEventListener('click', () => {
    $('#task-input').value = button.dataset.suggestion;
    $('#task-form').requestSubmit();
  }));
  $('#clear-completed').addEventListener('click', () => {
    const before = state.tasks.length; state.tasks = state.tasks.filter(task => !task.done);
    if (before !== state.tasks.length) { save(); render(); showToast('A little more breathing room.'); }
  });
  $('.add-list').addEventListener('click', () => {
    const name = prompt('What would you like to call your new list?');
    if (!name?.trim()) return;
    const id = crypto.randomUUID(); state.lists.push({ id, name: name.trim().slice(0, 24), emoji: '✳', color: '#97a989' });
    state.selectedList = id; save(); render(); $('#task-input').focus();
  });
  $('#reset-data').addEventListener('click', () => {
    if (!confirm('Start fresh? This will clear your tasks and lists from this browser.')) return;
    localStorage.removeItem(KEY); location.reload();
  });
  $('#focus-nav').addEventListener('click', () => $('#focus-dialog').showModal());
  $('#timer-start').addEventListener('click', () => {
    const button = $('#timer-start');
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; button.textContent = 'Resume'; return; }
    if (secondsLeft <= 0) secondsLeft = 25 * 60;
    button.textContent = 'Pause';
    timerInterval = setInterval(() => {
      secondsLeft--;
      $('#timer-display').textContent = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;
      if (secondsLeft <= 0) { clearInterval(timerInterval); timerInterval = null; button.textContent = 'Start again'; showToast('Time’s up. Take a moment before the next thing.'); }
    }, 1000);
  });
  $('#timer-reset').addEventListener('click', () => {
    clearInterval(timerInterval); timerInterval = null; secondsLeft = 25 * 60;
    $('#timer-display').textContent = '25:00'; $('#timer-start').textContent = 'Start timer';
  });
  $('#focus-dialog').addEventListener('click', event => { if (event.target === $('#focus-dialog')) $('#focus-dialog').close(); });
  render();
})();

