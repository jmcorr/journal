(() => {
  'use strict';

  const STORAGE_KEY = 'fau-owls-journal:entries';

  /** @typedef {{id:string,title:string,content:string,date:string,mood:string,tags:string[],createdAt:string,updatedAt:string}} Entry */

  const form = document.getElementById('entryForm');
  const entryIdInput = document.getElementById('entryId');
  const titleInput = document.getElementById('title');
  const dateInput = document.getElementById('entryDate');
  const moodInput = document.getElementById('mood');
  const contentInput = document.getElementById('content');
  const tagsInput = document.getElementById('tags');
  const saveBtn = document.getElementById('saveBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

  const searchInput = document.getElementById('searchInput');
  const moodFilter = document.getElementById('moodFilter');
  const entryCount = document.getElementById('entryCount');
  const entryList = document.getElementById('entryList');
  const emptyState = document.getElementById('emptyState');
  const entryTemplate = document.getElementById('entryTemplate');

  const exportBtn = document.getElementById('exportBtn');
  const importInput = document.getElementById('importInput');

  /** @returns {Entry[]} */
  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /** @param {Entry[]} entries */
  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function uid() {
    return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  }

  function todayISO() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 10);
  }

  function formatDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }

  let entries = loadEntries();

  function resetForm() {
    form.reset();
    entryIdInput.value = '';
    dateInput.value = todayISO();
    cancelEditBtn.hidden = true;
    saveBtn.textContent = 'Save entry';
  }

  function startEdit(entry) {
    entryIdInput.value = entry.id;
    titleInput.value = entry.title;
    dateInput.value = entry.date;
    moodInput.value = entry.mood || '';
    contentInput.value = entry.content;
    tagsInput.value = (entry.tags || []).join(', ');
    cancelEditBtn.hidden = false;
    saveBtn.textContent = 'Update entry';
    titleInput.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function render() {
    const query = searchInput.value.trim().toLowerCase();
    const moodQ = moodFilter.value;

    const visible = entries
      .filter((e) => {
        const matchesQuery =
          !query ||
          e.title.toLowerCase().includes(query) ||
          e.content.toLowerCase().includes(query) ||
          (e.tags || []).some((t) => t.toLowerCase().includes(query));
        const matchesMood = !moodQ || e.mood === moodQ;
        return matchesQuery && matchesMood;
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)));

    entryList.innerHTML = '';
    emptyState.hidden = entries.length > 0;
    entryList.hidden = visible.length === 0;

    entryCount.textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;

    for (const entry of visible) {
      const node = entryTemplate.content.firstElementChild.cloneNode(true);
      node.dataset.id = entry.id;
      node.querySelector('.entry-title').textContent = entry.title;
      node.querySelector('.entry-date').textContent = formatDate(entry.date);
      const moodEl = node.querySelector('.entry-mood');
      if (entry.mood) {
        moodEl.textContent = entry.mood;
      } else {
        moodEl.remove();
      }
      node.querySelector('.entry-content').textContent = entry.content;

      const tagsWrap = node.querySelector('.entry-tags');
      for (const tag of entry.tags || []) {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.textContent = `#${tag}`;
        tagsWrap.appendChild(chip);
      }

      node.querySelector('.edit-btn').addEventListener('click', () => startEdit(entry));
      node.querySelector('.delete-btn').addEventListener('click', () => deleteEntry(entry.id));

      entryList.appendChild(node);
    }
  }

  function deleteEntry(id) {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    entries = entries.filter((e) => e.id !== id);
    saveEntries(entries);
    if (entryIdInput.value === id) resetForm();
    render();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const tags = tagsInput.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const id = entryIdInput.value;
    const nowISO = new Date().toISOString();

    if (id) {
      const existing = entries.find((e) => e.id === id);
      if (existing) {
        existing.title = titleInput.value.trim();
        existing.date = dateInput.value;
        existing.mood = moodInput.value;
        existing.content = contentInput.value.trim();
        existing.tags = tags;
        existing.updatedAt = nowISO;
      }
    } else {
      /** @type {Entry} */
      const entry = {
        id: uid(),
        title: titleInput.value.trim(),
        date: dateInput.value,
        mood: moodInput.value,
        content: contentInput.value.trim(),
        tags,
        createdAt: nowISO,
        updatedAt: nowISO,
      };
      entries.push(entry);
    }

    saveEntries(entries);
    resetForm();
    render();
  });

  cancelEditBtn.addEventListener('click', resetForm);
  searchInput.addEventListener('input', render);
  moodFilter.addEventListener('change', render);

  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fau-owls-journal-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  importInput.addEventListener('change', async () => {
    const file = importInput.files && importInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Invalid backup file');

      const existingIds = new Set(entries.map((e) => e.id));
      let imported = 0;
      for (const item of parsed) {
        if (!item || typeof item !== 'object') continue;
        const safe = {
          id: typeof item.id === 'string' && !existingIds.has(item.id) ? item.id : uid(),
          title: String(item.title || 'Untitled'),
          content: String(item.content || ''),
          date: typeof item.date === 'string' ? item.date : todayISO(),
          mood: typeof item.mood === 'string' ? item.mood : '',
          tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
          createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
          updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
        };
        existingIds.add(safe.id);
        entries.push(safe);
        imported++;
      }
      saveEntries(entries);
      render();
      alert(`Imported ${imported} entr${imported === 1 ? 'y' : 'ies'}.`);
    } catch (err) {
      alert('Could not import that file. Make sure it is a valid journal backup JSON.');
    } finally {
      importInput.value = '';
    }
  });

  resetForm();
  render();
})();
