(() => {
  'use strict';
  const routes = '/api/backups';
  const el = id => document.getElementById(id);
  const card = el('authAdminCard');
  if (!card) return;
  const dialog = el('backupSetup');
  const fields = Array.from(el('backupContents').querySelectorAll('input'));
  const presets = {
    full: fields.map(field => field.value),
    workspace: ['workspace'],
    alarms: ['alarms']
  };
  const labels = {
    workspace: 'Workspace', alarms: 'Alarm Configuration', settings: 'Server and Data Configuration',
    credentials: 'Credentials', history: 'Alarm History', historian: 'Historian'
  };
  const presetLabels = { full: 'Full Configuration and Data', workspace: 'Workspace', alarms: 'Alarm Configuration', custom: 'Custom' };
  let current;
  let mode;
  let poll;

  async function request(suffix = '', method = 'GET', body) {
    const raw = body instanceof File;
    const response = await fetch(routes + suffix, {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: raw ? body : body ? JSON.stringify(body) : undefined
    });
    const result = await response.json();
    if (!response.ok || result.ok === false) throw new Error(result.error || 'Backup request failed.');
    return result;
  }

  const status = message => { el('backupLibraryStatus').textContent = message; };
  const date = value => new Date(value).toLocaleString();

  function action(label, callback) {
    const button = document.createElement('button');
    button.className = 'btn';
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', async () => {
      button.disabled = true;
      try { await callback(); }
      catch (err) { status(err.message); }
      finally { button.disabled = false; }
    });
    return button;
  }

  async function restore(id, file) {
    const query = id ? '?id=' + encodeURIComponent(id) : '';
    const preview = await request('/preview' + query, 'POST', file);
    const sections = Object.entries(preview.sections).map(([name, section]) =>
      name.replaceAll('_', ' ') + ' (' + section.files + ' files)');
    const lines = [
      'Restore this backup?', date(preview.created_at),
      'Source: ' + (preview.host || 'Unknown') + ' · Suite ' + (preview.suite_version || 'Unknown'),
      ...sections, '', 'Matching files will be replaced. A recovery copy of existing files will appear in the backup list.'
    ];
    if (preview.historian_download_only) lines.push('Historian SQL requires a separate database import.');
    if (!window.confirm(lines.join('\n'))) return;
    status('Restoring backup…');
    const result = await request('/restore' + query, 'POST', file);
    await refresh();
    status(result.message + (result.historian_download_only ? ' Historian SQL was skipped.' : ''));
  }

  function renderRows(items) {
    const rows = el('backupLibraryRows');
    rows.replaceChildren();
    if (!items.length) {
      const row = rows.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 6;
      cell.textContent = 'No saved backups.';
    }
    for (const item of items) {
      const row = rows.insertRow();
      const summary = (item.contents || []).map(key => labels[key]).filter(Boolean).join(', ');
      const kind = { manual: 'Manual', automatic: 'Automatic', recovery: 'Before Restore' }[item.kind];
      for (const value of [date(item.created_at), kind, presetLabels[item.preset], item.host + ' · ' + item.suite_version,
        new Intl.NumberFormat(undefined, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1 }).format(item.bytes / 1000000)]) {
        row.insertCell().textContent = value;
      }
      row.cells[2].title = summary;
      const actions = row.insertCell();
      const id = encodeURIComponent(item.id);
      const download = document.createElement('a');
      download.className = 'btn';
      download.href = routes + '/download?id=' + id;
      download.download = '';
      download.textContent = 'Download';
      actions.append(download, action('Restore', () => restore(item.id)), action('Delete', async () => {
        if (!window.confirm('Delete the ' + kind.toLowerCase() + ' backup from ' + date(item.created_at) + '?')) return;
        await request('?id=' + id, 'DELETE');
        await refresh();
        status('Backup deleted.');
      }));
      if (item.has_historian) {
        const sql = document.createElement('a');
        sql.className = 'btn';
        sql.href = routes + '/historian?id=' + id;
        sql.download = '';
        sql.textContent = 'Download Historian SQL';
        actions.append(sql);
      }
    }
  }

  async function refresh() {
    current = await request();
    renderRows(current.backups);
    const settings = current.settings;
    const automatic = current.automatic;
    const lastRun = automatic?.started_at ? ' Last attempt: ' + date(automatic.started_at) + ' (' + automatic.state + ').' : '';
    const lastSuccess = current.backups.find(item => item.kind === 'automatic');
    const success = lastSuccess ? ' Latest saved copy: ' + date(lastSuccess.created_at) + '.' : '';
    const next = current.next_automatic_at ? ' Next backup: ' + date(current.next_automatic_at) + '.' : '';
    el('backupAutomaticStatus').textContent = (settings.enabled
      ? 'Daily at ' + settings.time + ' (' + current.timezone + '). Keep ' + settings.keep + ' automatic copies.'
      : 'Automatic backups are off.') + next + lastRun + success + (automatic?.error ? ' ' + automatic.error : '');
    const job = current.job;
    if (job?.state === 'running') status('Creating backup…');
    if (job?.state === 'done') status('Backup saved.');
    if (job?.state === 'error') status('Backup failed: ' + job.error);
    el('backupNow').disabled = job?.state === 'running';
    window.clearTimeout(poll);
    if (job?.state === 'running') poll = window.setTimeout(load, 1000);
  }

  function load() {
    return refresh().catch(err => status(err.message));
  }

  async function open(nextMode) {
    try {
      await refresh();
      mode = nextMode;
      const automatic = mode === 'automatic';
      const settings = current.settings;
      el('backupSetupTitle').textContent = automatic ? 'Automatic Backup Settings' : 'Back Up Now';
      el('backupScheduleFields').hidden = !automatic;
      el('backupEnabled').checked = settings.enabled;
      el('backupTime').value = settings.time;
      el('backupKeep').value = settings.keep;
      el('backupTimezone').textContent = current.timezone;
      el('backupPreset').value = automatic ? settings.preset : 'full';
      for (const field of fields) field.checked = (automatic ? settings.contents : presets.full).includes(field.value);
      el('backupSetupStatus').textContent = '';
      el('backupSetupSubmit').textContent = automatic ? 'Save Settings' : 'Create Backup';
      dialog.showModal();
    } catch (err) { status(err.message); }
  }

  el('backupPreset').addEventListener('change', event => {
    const preset = presets[event.target.value];
    if (preset) for (const field of fields) field.checked = preset.includes(field.value);
  });
  for (const field of fields) field.addEventListener('change', () => { el('backupPreset').value = 'custom'; });
  el('backupSetupCancel').addEventListener('click', () => dialog.close());
  el('backupNow').addEventListener('click', () => open('manual'));
  el('backupSchedule').addEventListener('click', () => open('automatic'));
  el('backupRefresh').addEventListener('click', load);
  el('backupUpload').addEventListener('change', async event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try { await restore(null, file); }
    catch (err) { status(err.message); }
  });
  el('backupSetupForm').addEventListener('submit', async event => {
    event.preventDefault();
    const button = el('backupSetupSubmit');
    button.disabled = true;
    try {
      const options = {
        preset: el('backupPreset').value,
        contents: fields.filter(field => field.checked).map(field => field.value)
      };
      if (!options.contents.length) throw new Error('Choose at least one item to back up.');
      if (mode === 'automatic') {
        await request('/schedule', 'POST', {
          ...options, enabled: el('backupEnabled').checked, time: el('backupTime').value, keep: Number(el('backupKeep').value)
        });
      } else {
        await request('/start', 'POST', options);
      }
      dialog.close();
      await refresh();
    } catch (err) {
      if (dialog.open) el('backupSetupStatus').textContent = err.message;
      else status(err.message);
    } finally {
      button.disabled = false;
    }
  });
  new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) load();
  }).observe(card);
})();
