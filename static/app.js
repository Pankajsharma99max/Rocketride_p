// ── Theme ────────────────────────────────────────────────────────────────
const root = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

(function initTheme() {
  const saved = localStorage.getItem('rti-theme');
  const preferred = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(preferred);
})();

themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('rti-theme', next);
});

// ── Toasts ───────────────────────────────────────────────────────────────
const toastStack = document.getElementById('toast-stack');

function showToast(message, type = 'success', duration = 3200) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastStack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

// ── Document categories & quick actions ───────────────────────────────────
// Labels/instructions live server-side (app.py CATEGORIES / QUICK_ACTIONS) --
// this just renders whatever the backend reports, so there is one source of
// truth for what each category/action actually means to the LLM.
const uploadCategorySelect = document.getElementById('upload-category');
const focusCategorySelect = document.getElementById('focus-category');
const quickActionsEl = document.getElementById('quick-actions');

let quickActionButtons = [];

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();

    const categoryOptions = data.categories.map((c) => `<option value="${c.id}">${escapeHtml(c.label)}</option>`).join('');
    uploadCategorySelect.innerHTML = categoryOptions;
    focusCategorySelect.innerHTML = categoryOptions;

    quickActionsEl.innerHTML = '';
    quickActionButtons = data.quick_actions.map((action) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quick-action-btn';
      btn.textContent = action.label;
      btn.dataset.actionId = action.id;
      btn.addEventListener('click', () => runQuickAction(action.id));
      quickActionsEl.appendChild(btn);
      return btn;
    });
  } catch {
    // Categories are a convenience layer; if this fails the app still works
    // as a plain general-purpose document assistant.
  }
}

loadCategories();

// ── Settings (API keys, OCR language, voice) ─────────────────────────────
const settingsBtn = document.getElementById('settings-btn');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsClose = document.getElementById('settings-close');
const settingsSave = document.getElementById('settings-save');
const settingsStatus = document.getElementById('settings-status');

const settingInputs = {
  rocketride_uri: document.getElementById('setting-rocketride-uri'),
  rocketride_apikey: document.getElementById('setting-rocketride-key'),
  gemini_apikey: document.getElementById('setting-gemini-key'),
  ocr_profile: document.getElementById('setting-ocr-language'),
  tts_voice: document.getElementById('setting-voice'),
};

function openSettings() {
  settingsOverlay.hidden = false;
  settingsStatus.textContent = '';
  settingsStatus.className = 'modal-status';
  loadSettings();
}

function closeSettings() {
  settingsOverlay.hidden = true;
}

settingsBtn.addEventListener('click', openSettings);
settingsClose.addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) closeSettings();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !settingsOverlay.hidden) closeSettings();
});

async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();

    settingInputs.rocketride_uri.value = data.rocketride_uri?.value || '';
    settingInputs.ocr_profile.value = data.ocr_profile?.value || 'devanagari';
    settingInputs.tts_voice.value = data.tts_voice?.value || 'af_heart';

    setKeyHint('rocketride_apikey', data.rocketride_apikey);
    setKeyHint('gemini_apikey', data.gemini_apikey);
  } catch {
    settingsStatus.textContent = 'Could not load current settings.';
    settingsStatus.className = 'modal-status error';
  }
}

function setKeyHint(field, info) {
  const hintEl = document.getElementById(`hint-${field.replace('_', '-')}`);
  const inputEl = settingInputs[field];
  inputEl.value = '';
  if (info && info.set) {
    hintEl.textContent = `Currently set (${info.masked})`;
    hintEl.classList.add('configured');
    inputEl.placeholder = 'Enter a new key to replace it';
  } else {
    hintEl.textContent = 'Not set';
    hintEl.classList.remove('configured');
    inputEl.placeholder = 'Not set';
  }
}

settingsSave.addEventListener('click', async () => {
  const payload = {};
  if (settingInputs.rocketride_uri.value.trim()) payload.rocketride_uri = settingInputs.rocketride_uri.value.trim();
  if (settingInputs.rocketride_apikey.value.trim()) payload.rocketride_apikey = settingInputs.rocketride_apikey.value.trim();
  if (settingInputs.gemini_apikey.value.trim()) payload.gemini_apikey = settingInputs.gemini_apikey.value.trim();
  payload.ocr_profile = settingInputs.ocr_profile.value;
  payload.ocr_script_family = settingInputs.ocr_profile.value;
  payload.tts_voice = settingInputs.tts_voice.value;

  settingsSave.disabled = true;
  settingsStatus.textContent = 'Saving and reconnecting…';
  settingsStatus.className = 'modal-status';

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      await loadSettings();
      if (data.reconnect_error) {
        settingsStatus.textContent = data.reconnect_error;
        settingsStatus.className = 'modal-status error';
        showToast('Saved, but could not reconnect', 'error');
      } else {
        settingsStatus.textContent = 'Saved.';
        settingsStatus.className = 'modal-status success';
        showToast('Settings saved', 'success');
      }
    } else {
      settingsStatus.textContent = data.error || 'Could not save settings.';
      settingsStatus.className = 'modal-status error';
    }
  } catch (err) {
    settingsStatus.textContent = `Error: ${err.message}`;
    settingsStatus.className = 'modal-status error';
  } finally {
    settingsSave.disabled = false;
  }
});

document.querySelectorAll('[data-clear-field]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const field = btn.dataset.clearField;
    btn.disabled = true;
    settingsStatus.textContent = 'Removing…';
    settingsStatus.className = 'modal-status';
    try {
      const res = await fetch('/api/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: [field] }),
      });
      const data = await res.json();
      if (res.ok) {
        await loadSettings();
        if (data.reconnect_error) {
          settingsStatus.textContent = data.reconnect_error;
          settingsStatus.className = 'modal-status error';
          showToast('Removed, but could not reconnect', 'error');
        } else {
          settingsStatus.textContent = 'Removed.';
          settingsStatus.className = 'modal-status success';
          showToast('Key removed', 'success');
        }
      } else {
        settingsStatus.textContent = data.error || 'Could not remove key.';
        settingsStatus.className = 'modal-status error';
      }
    } catch (err) {
      settingsStatus.textContent = `Error: ${err.message}`;
      settingsStatus.className = 'modal-status error';
    } finally {
      btn.disabled = false;
    }
  });
});

// ── Library (indexed documents) ──────────────────────────────────────────
const libraryList = document.getElementById('library-list');

const DOC_ICON = `<svg class="doc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/></svg>`;

// Short badge text per category (the full labels from /api/categories are
// used in the dropdowns; these stay compact in the narrow library list).
const CATEGORY_BADGE_LABELS = {
  general: 'General',
  rti_govt: 'RTI/Govt',
  finance: 'Finance',
  research: 'Research',
};

async function refreshLibrary() {
  try {
    const res = await fetch('/api/documents');
    const data = await res.json();
    renderLibrary(data.documents || []);
  } catch {
    // Silent -- the library panel is a convenience, not critical path.
  }
}

function renderLibrary(docs) {
  if (!docs.length) {
    libraryList.innerHTML = '<li class="library-empty">Nothing indexed yet</li>';
    return;
  }
  libraryList.innerHTML = docs
    .map((doc) => {
      const isError = doc.status !== 'indexed';
      const badgeLabel = CATEGORY_BADGE_LABELS[doc.category] || CATEGORY_BADGE_LABELS.general;
      return `<li class="library-item ${isError ? 'error' : ''}" title="${escapeHtml(doc.detail || doc.filename)}">
        ${DOC_ICON}
        <span class="doc-name">${escapeHtml(doc.filename)}</span>
        <span class="category-badge ${doc.category || 'general'}">${badgeLabel}</span>
        <span class="doc-status"></span>
      </li>`;
    })
    .join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

refreshLibrary();

// ── Upload (drag & drop + progress) ──────────────────────────────────────
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const uploadProgress = document.getElementById('upload-progress');
const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');

browseBtn.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('click', (e) => {
  if (e.target === browseBtn) return;
  fileInput.click();
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) uploadFile(fileInput.files[0]);
});

['dragenter', 'dragover'].forEach((evt) =>
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  })
);

['dragleave', 'drop'].forEach((evt) =>
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  })
);

dropZone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file) uploadFile(file);
});

function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', uploadCategorySelect.value || 'general');

  uploadProgress.hidden = false;
  progressFill.style.width = '0%';
  progressLabel.textContent = `Uploading ${file.name}…`;

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload');

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const pct = Math.round((e.loaded / e.total) * 100);
      progressFill.style.width = `${pct}%`;
    }
  });

  xhr.onload = () => {
    let data = {};
    try {
      data = JSON.parse(xhr.responseText);
    } catch {
      data = {};
    }

    if (xhr.status >= 200 && xhr.status < 300) {
      progressLabel.textContent = 'Indexed';
      showToast(`Indexed "${data.filename}"`, 'success');
    } else {
      progressLabel.textContent = 'Failed';
      showToast(data.detail || data.error || 'Upload failed', 'error');
    }
    fileInput.value = '';
    refreshLibrary();
    setTimeout(() => {
      uploadProgress.hidden = true;
    }, 1400);
  };

  xhr.onerror = () => {
    progressLabel.textContent = 'Failed';
    showToast('Upload failed -- check your connection', 'error');
    setTimeout(() => {
      uploadProgress.hidden = true;
    }, 1400);
  };

  xhr.send(formData);
}

// ── Chat ─────────────────────────────────────────────────────────────────
const chatForm = document.getElementById('chat-form');
const questionInput = document.getElementById('question-input');
const chatLog = document.getElementById('chat-log');
const emptyState = document.getElementById('empty-state');
const clearChatBtn = document.getElementById('clear-chat');
const exportChatBtn = document.getElementById('export-chat');
const answerAudio = document.getElementById('answer-audio');
const suggestions = document.getElementById('suggestions');

let activeWaveformPlayer = null;

// Conversation memory sent with each request (see rocketride.schema.QuestionHistory
// on the backend) so follow-up questions like "what about my case" work. Capped so
// the prompt doesn't grow unbounded over a long session.
const MAX_HISTORY_TURNS = 12;
let conversationHistory = [];

suggestions.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  questionInput.value = chip.textContent;
  chatForm.requestSubmit();
});

clearChatBtn.addEventListener('click', () => {
  chatLog.innerHTML = '';
  chatLog.appendChild(emptyState);
  emptyState.style.display = '';
  clearChatBtn.hidden = true;
  exportChatBtn.hidden = true;
  conversationHistory = [];
});

exportChatBtn.addEventListener('click', () => {
  if (!conversationHistory.length) return;
  const lines = ['# RTI Document Assistant -- conversation export', `_Exported ${new Date().toLocaleString()}_`, ''];
  conversationHistory.forEach((turn) => {
    lines.push(turn.role === 'user' ? `**You:** ${turn.content}` : `**Assistant:** ${turn.content}`, '');
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rti-conversation-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
});

function scrollToBottom() {
  chatLog.scrollTop = chatLog.scrollHeight;
}

function addUserMessage(text) {
  emptyState.style.display = 'none';
  clearChatBtn.hidden = false;
  exportChatBtn.hidden = false;
  const row = document.createElement('div');
  row.className = 'msg-row user';
  row.innerHTML = `<div class="bubble"></div>`;
  row.querySelector('.bubble').textContent = text;
  chatLog.appendChild(row);
  scrollToBottom();
}

function addTypingIndicator() {
  const row = document.createElement('div');
  row.className = 'msg-row assistant';
  row.dataset.typing = 'true';
  row.innerHTML = `<div class="bubble-group"><div class="bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div></div>`;
  chatLog.appendChild(row);
  scrollToBottom();
  return row;
}

function addErrorMessage(text) {
  const row = document.createElement('div');
  row.className = 'msg-row assistant error';
  row.innerHTML = `<div class="bubble"></div>`;
  row.querySelector('.bubble').textContent = text;
  chatLog.appendChild(row);
  scrollToBottom();
}

function addAssistantMessage({ answer, sources, audioBase64 }) {
  const row = document.createElement('div');
  row.className = 'msg-row assistant';

  const group = document.createElement('div');
  group.className = 'bubble-group';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = answer;
  group.appendChild(bubble);

  if (sources && sources.length) {
    group.appendChild(buildSourcesEl(sources));
  }

  group.appendChild(buildActionsEl(answer, audioBase64));

  row.appendChild(group);
  chatLog.appendChild(row);
  scrollToBottom();
}

function buildSourcesEl(sources) {
  const wrap = document.createElement('div');
  wrap.className = 'sources';

  sources.forEach((src) => {
    const card = document.createElement('div');
    card.className = 'source-card';
    card.innerHTML = `
      <button type="button" class="source-card-header">
        <svg class="source-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/></svg>
        <span class="source-name">${escapeHtml(src.document || 'Source passage')}</span>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="source-body"></div>
    `;
    card.querySelector('.source-body').textContent = src.snippet || '';
    card.querySelector('.source-card-header').addEventListener('click', () => {
      card.classList.toggle('open');
    });
    wrap.appendChild(card);
  });

  return wrap;
}

function buildActionsEl(answerText, audioBase64) {
  const actions = document.createElement('div');
  actions.className = 'msg-actions';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'copy-btn';
  copyBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg><span>Copy</span>`;
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(answerText);
      copyBtn.querySelector('span').textContent = 'Copied';
      setTimeout(() => (copyBtn.querySelector('span').textContent = 'Copy'), 1500);
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  });
  actions.appendChild(copyBtn);

  if (audioBase64) {
    actions.appendChild(buildWaveformPlayer(audioBase64));
  }

  return actions;
}

function buildWaveformPlayer(audioBase64) {
  const player = document.createElement('div');
  player.className = 'waveform-player';

  const bars = Array.from({ length: 22 })
    .map(() => {
      const delay = (Math.random() * 0.8).toFixed(2);
      const duration = (0.7 + Math.random() * 0.6).toFixed(2);
      return `<span style="animation-delay:${delay}s;animation-duration:${duration}s"></span>`;
    })
    .join('');

  player.innerHTML = `
    <button type="button" class="play-btn" aria-label="Play answer aloud">
      <svg class="icon icon-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      <svg class="icon icon-pause" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>
    </button>
    <div class="waveform">${bars}</div>
  `;

  const playBtn = player.querySelector('.play-btn');
  playBtn.addEventListener('click', () => {
    const isThisPlaying = activeWaveformPlayer === player && !answerAudio.paused;
    answerAudio.pause();
    if (activeWaveformPlayer) {
      activeWaveformPlayer.classList.remove('playing');
      activeWaveformPlayer.querySelector('.play-btn').classList.remove('playing');
    }
    if (isThisPlaying) {
      activeWaveformPlayer = null;
      return;
    }
    answerAudio.src = `data:audio/wav;base64,${audioBase64}`;
    answerAudio.play();
    player.classList.add('playing');
    playBtn.classList.add('playing');
    activeWaveformPlayer = player;
  });

  return player;
}

answerAudio.addEventListener('ended', () => {
  if (activeWaveformPlayer) {
    activeWaveformPlayer.classList.remove('playing');
    activeWaveformPlayer.querySelector('.play-btn').classList.remove('playing');
    activeWaveformPlayer = null;
  }
});

async function askQuestion({ question, action, displayText }) {
  addUserMessage(displayText || question);
  const sendBtn = chatForm.querySelector('.send-btn');
  sendBtn.disabled = true;
  quickActionButtons.forEach((btn) => (btn.disabled = true));
  const typingRow = addTypingIndicator();

  try {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        action,
        category: focusCategorySelect.value || 'general',
        history: conversationHistory.slice(-MAX_HISTORY_TURNS * 2),
      }),
    });
    const data = await res.json();
    typingRow.remove();

    if (res.ok) {
      addAssistantMessage({ answer: data.answer, sources: data.sources, audioBase64: data.audio_base64 });
      conversationHistory.push(
        { role: 'user', content: displayText || question },
        { role: 'assistant', content: data.answer }
      );
    } else {
      addErrorMessage(data.error || 'Something went wrong.');
    }
  } catch (err) {
    typingRow.remove();
    addErrorMessage(`Error: ${err.message}`);
  } finally {
    sendBtn.disabled = false;
    quickActionButtons.forEach((btn) => (btn.disabled = false));
    questionInput.focus();
  }
}

function runQuickAction(actionId) {
  const btn = quickActionButtons.find((b) => b.dataset.actionId === actionId);
  askQuestion({ question: '', action: actionId, displayText: btn ? btn.textContent : actionId });
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const question = questionInput.value.trim();
  if (!question) return;
  questionInput.value = '';
  askQuestion({ question });
});
