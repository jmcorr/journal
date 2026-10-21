(() => {
  'use strict';

  const LEGACY_STORAGE_KEY = 'fau-owls-journal:entries';
  const TABLE = 'journal_entries';

  const { createClient } = window.supabase;
  const supabaseClient = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.publishableKey);

  /** @typedef {{id:string,title:string,content:string,date:string,mood:string,tags:string[],createdAt:string,updatedAt:string}} Entry */

  // Auth elements
  const authScreen = document.getElementById('authScreen');
  const authForm = document.getElementById('authForm');
  const authTitle = document.getElementById('authTitle');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const authError = document.getElementById('authError');
  const authNotice = document.getElementById('authNotice');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authToggleBtn = document.getElementById('authToggleBtn');
  const appMain = document.getElementById('appMain');
  const appTopbarActions = document.getElementById('appTopbarActions');
  const userEmailEl = document.getElementById('userEmail');
  const logoutBtn = document.getElementById('logoutBtn');

  // App elements
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

  const locationInput = document.getElementById('location');
  const useLocationBtn = document.getElementById('useLocationBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');

  let isSignupMode = false;
  /** @type {Entry[]} */
  let entries = [];

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

  function rowToEntry(row) {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      date: row.entry_date,
      mood: row.mood || '',
      tags: row.tags || [],
      location: row.location || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ---------- Theme ----------

  const THEME_KEY = 'fau-owls-journal:theme';

  function applyTheme(theme) {
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.dataset.theme = theme;
    } else {
      delete document.documentElement.dataset.theme;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme !== 'light' && prefersDark);
    themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
  }

  themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentlyDark = current === 'dark' || (!current && prefersDark);
    const next = currentlyDark ? 'light' : 'dark';
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore storage failures (private browsing, etc.)
    }
    applyTheme(next);
  });

  (() => {
    let saved = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch {
      saved = null;
    }
    applyTheme(saved);
  })();

  // ---------- Geolocation ----------

  useLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Your browser does not support location lookup.');
      return;
    }
    useLocationBtn.disabled = true;
    useLocationBtn.textContent = '📍 Locating...';
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`
          );
          const data = await res.json();
          const addr = data.address || {};
          const label =
            addr.suburb || addr.neighbourhood || addr.city || addr.town || addr.village || data.display_name || '';
          locationInput.value = label || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        } catch {
          alert('Could not look up your location name. Please type it manually.');
        } finally {
          useLocationBtn.disabled = false;
          useLocationBtn.textContent = '📍 Use my location';
        }
      },
      () => {
        alert('Could not get your location. Please allow location access, or type it manually.');
        useLocationBtn.disabled = false;
        useLocationBtn.textContent = '📍 Use my location';
      },
      { timeout: 10000 }
    );
  });

  // ---------- Auth ----------

  function setAuthMode(signup) {
    isSignupMode = signup;
    authTitle.textContent = signup ? 'Create your journal account' : 'Log in to your journal';
    authSubmitBtn.textContent = signup ? 'Sign up' : 'Log in';
    authToggleBtn.textContent = signup ? 'Already have an account? Log in' : 'Need an account? Sign up';
    authError.hidden = true;
    authNotice.hidden = true;
  }

  authToggleBtn.addEventListener('click', () => setAuthMode(!isSignupMode));

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.hidden = true;
    authNotice.hidden = true;
    authSubmitBtn.disabled = true;

    const email = authEmail.value.trim();
    const password = authPassword.value;

    try {
      if (isSignupMode) {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          authNotice.textContent = 'Account created. Check your email to confirm it, then log in.';
          authNotice.hidden = false;
          setAuthMode(false);
        }
      } else {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      authError.textContent = err.message || 'Something went wrong. Please try again.';
      authError.hidden = false;
    } finally {
      authSubmitBtn.disabled = false;
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
  });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session && session.user) {
      showApp(session.user);
    } else {
      showAuthScreen();
    }
  });

  function showAuthScreen() {
    entries = [];
    authScreen.hidden = false;
    appMain.hidden = true;
    appTopbarActions.hidden = true;
    authForm.reset();
    setAuthMode(false);
  }

  async function showApp(user) {
    authScreen.hidden = true;
    appMain.hidden = false;
    appTopbarActions.hidden = false;
    userEmailEl.textContent = user.email;
    resetForm();
    await loadEntries();
    await maybeOfferLocalImport();
  }

  // ---------- Data access (Supabase) ----------

  async function loadEntries() {
    const { data, error } = await supabaseClient
      .from(TABLE)
      .select('*')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load entries', error);
      entries = [];
    } else {
      entries = (data || []).map(rowToEntry);
    }
    render();
  }

  async function maybeOfferLocalImport() {
    let local = [];
    try {
      local = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '[]');
    } catch {
      local = [];
    }
    if (!Array.isArray(local) || local.length === 0 || entries.length > 0) return;

    const wantsImport = confirm(
      `We found ${local.length} entr${local.length === 1 ? 'y' : 'ies'} saved in this browser from before. Import ${
        local.length === 1 ? 'it' : 'them'
      } into your account?`
    );
    if (!wantsImport) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    const rows = local.map((item) => ({
      user_id: user.id,
      title: String(item.title || 'Untitled'),
      content: String(item.content || ''),
      entry_date: typeof item.date === 'string' ? item.date : todayISO(),
      mood: typeof item.mood === 'string' ? item.mood : '',
      tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      location: typeof item.location === 'string' ? item.location : null,
    }));

    const { error } = await supabaseClient.from(TABLE).insert(rows);
    if (error) {
      alert('Import failed: ' + error.message);
    } else {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      await loadEntries();
    }
  }

  // ---------- Entry form ----------

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
    locationInput.value = entry.location || '';
    cancelEditBtn.hidden = false;
    saveBtn.textContent = 'Update entry';
    titleInput.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function render() {
    const query = searchInput.value.trim().toLowerCase();
    const moodQ = moodFilter.value;

    const visible = entries.filter((e) => {
      const matchesQuery =
        !query ||
        e.title.toLowerCase().includes(query) ||
        e.content.toLowerCase().includes(query) ||
        (e.tags || []).some((t) => t.toLowerCase().includes(query));
      const matchesMood = !moodQ || e.mood === moodQ;
      return matchesQuery && matchesMood;
    });

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

      const locationEl = node.querySelector('.entry-location');
      if (entry.location) {
        locationEl.textContent = entry.location;
      } else {
        locationEl.remove();
      }

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

  async function deleteEntry(id) {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    const { error } = await supabaseClient.from(TABLE).delete().eq('id', id);
    if (error) {
      alert('Could not delete entry: ' + error.message);
      return;
    }
    if (entryIdInput.value === id) resetForm();
    await loadEntries();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tags = tagsInput.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const id = entryIdInput.value;
    const payload = {
      title: titleInput.value.trim(),
      content: contentInput.value.trim(),
      entry_date: dateInput.value,
      mood: moodInput.value,
      tags,
      location: locationInput.value.trim() || null,
    };

    saveBtn.disabled = true;
    try {
      if (id) {
        const { error } = await supabaseClient.from(TABLE).update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const { error } = await supabaseClient.from(TABLE).insert({ ...payload, user_id: user.id });
        if (error) throw error;
      }
      resetForm();
      await loadEntries();
    } catch (err) {
      alert('Could not save entry: ' + err.message);
    } finally {
      saveBtn.disabled = false;
    }
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

      const { data: { user } } = await supabaseClient.auth.getUser();
      const rows = parsed
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          user_id: user.id,
          title: String(item.title || 'Untitled'),
          content: String(item.content || ''),
          entry_date: typeof item.date === 'string' ? item.date : todayISO(),
          mood: typeof item.mood === 'string' ? item.mood : '',
          tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
          location: typeof item.location === 'string' ? item.location : null,
        }));

      if (rows.length === 0) throw new Error('No entries found in that file');

      const { error } = await supabaseClient.from(TABLE).insert(rows);
      if (error) throw error;

      await loadEntries();
      alert(`Imported ${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}.`);
    } catch (err) {
      alert('Could not import that file: ' + err.message);
    } finally {
      importInput.value = '';
    }
  });

  // ---------- Boot ----------

  (async () => {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session && data.session.user) {
      await showApp(data.session.user);
    } else {
      showAuthScreen();
    }
  })();
})();
