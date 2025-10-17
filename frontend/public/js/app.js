const API = 'http://localhost:8082/api/v1';
const STORAGE_TOKEN = 'token';
const STORAGE_PROFILE = 'wellnessProfile';
const STORAGE_NAMES_PREFIX = 'wellnessProfileName:';

const views = Array.from(document.querySelectorAll('.view'));

const elements = {
  loginForm: document.getElementById('loginForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  loginStatus: document.getElementById('loginStatus'),
  registerForm: document.getElementById('registerForm'),
  registerStatus: document.getElementById('registerStatus'),
  dashboardGreeting: document.getElementById('dashboardGreeting'),
  dashboardDate: document.getElementById('dashboardDate'),
  btnLogout: document.getElementById('btnLogout'),
  btnStartGad7: document.getElementById('btnStartGad7'),
  btnStartPhq9: document.getElementById('btnStartPhq9'),
  btnOpenHistory: document.getElementById('btnOpenHistory'),
  btnCloseHistory: document.getElementById('btnCloseHistory'),
  historyPanel: document.getElementById('historyPanel'),
  historyList: document.getElementById('historyList'),
  btnBackToDashboard: document.getElementById('btnBackToDashboard'),
  assessmentTitle: document.getElementById('assessmentTitle'),
  assessmentStep: document.getElementById('assessmentStep'),
  assessmentProgress: document.getElementById('assessmentProgress'),
  questionCard: document.getElementById('questionCard'),
  btnPrevQuestion: document.getElementById('btnPrevQuestion'),
  btnNextQuestion: document.getElementById('btnNextQuestion'),
  resultTitle: document.getElementById('resultTitle'),
  resultSummary: document.getElementById('resultSummary'),
  resultDetails: document.getElementById('resultDetails'),
  btnResultDashboard: document.getElementById('btnResultDashboard'),
  btnResultHistory: document.getElementById('btnResultHistory'),
  toast: document.getElementById('toast'),
};

let currentUser = null;
let currentAssessment = null;
let lastResultType = null;

// --- Utility helpers ---
function showView(id) {
  views.forEach(v => v.classList.toggle('view--active', v.id === id));
}

function getToken() {
  return localStorage.getItem(STORAGE_TOKEN) || '';
}

function setToken(token) {
  localStorage.setItem(STORAGE_TOKEN, token);
}

function clearToken() {
  localStorage.removeItem(STORAGE_TOKEN);
}

function storeProfile(profile) {
  localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
}

function loadStoredProfile() {
  const raw = localStorage.getItem(STORAGE_PROFILE);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function clearProfile() {
  localStorage.removeItem(STORAGE_PROFILE);
}

function storeDisplayName(email, name) {
  if (!email || !name) return;
  localStorage.setItem(STORAGE_NAMES_PREFIX + email.toLowerCase(), name);
}

function getDisplayName(email) {
  if (!email) return '';
  const stored = localStorage.getItem(STORAGE_NAMES_PREFIX + email.toLowerCase());
  return stored || email.split('@')[0];
}

function setStatus(el, message, type) {
  if (!el) return;
  el.textContent = message || '';
  el.classList.remove('is-error', 'is-success');
  if (type === 'error') el.classList.add('is-error');
  if (type === 'success') el.classList.add('is-success');
}

function showToast(message, duration = 3000) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  setTimeout(() => elements.toast.classList.remove('is-visible'), duration);
}

function formatToday() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return formatter.format(now);
}

function ensureAuth() {
  const token = getToken();
  const profile = loadStoredProfile();
  if (token && profile) {
    currentUser = profile;
    updateDashboard();
    showView('view-dashboard');
  } else {
    showView('view-login');
  }
}

function updateDashboard() {
  if (!currentUser) return;
  if (elements.dashboardGreeting) {
    elements.dashboardGreeting.textContent = `Hola, ${currentUser.name}`;
  }
  if (elements.dashboardDate) {
    elements.dashboardDate.textContent = formatToday();
  }
}

// --- API helpers ---
async function apiLogin(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error ${res.status}`);
  }
  return res.json();
}

async function apiRegister(email, password) {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error ${res.status}`);
  }
  return res.json();
}

async function apiGad7(answers, userId, options = {}) {
  const payload = { answers };
  if (userId !== undefined && userId !== null) {
    payload.userId = userId;
  }
  if (options && typeof options.save === 'boolean') {
    payload.save = options.save;
  }
  if (options && options.notes) {
    payload.notes = options.notes;
  }
  const res = await fetch(`${API}/assessments/gad7`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error ${res.status}`);
  }
  return res.json();
}

async function apiPhq9(answers, userId, options = {}) {
  const payload = { answers };
  if (userId !== undefined && userId !== null) {
    payload.userId = userId;
  }
  if (options && typeof options.save === 'boolean') {
    payload.save = options.save;
  }
  if (options && options.notes) {
    payload.notes = options.notes;
  }
  const res = await fetch(`${API}/assessments/phq9`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error ${res.status}`);
  }
  return res.json();
}

async function apiHistory(userId) {
  const params = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const res = await fetch(`${API}/assessments/history${params}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error ${res.status}`);
  }
  return res.json();
}

// --- Assessment data ---
const OPTION_SET = [
  { label: 'Nunca', value: 0 },
  { label: 'Varios días', value: 1 },
  { label: 'Más de la mitad de los días', value: 2 },
  { label: 'Casi todos los días', value: 3 }
];

const GAD7_QUESTIONS = [
  { emoji: '🙂', title: '¿Cómo te sientes hoy?', subtitle: 'Tu estado de ánimo general', options: OPTION_SET, tint: 'linear-gradient(160deg, #ffe9f3, #f3f4ff)' },
  { emoji: '🧠', title: 'Preocupación o ansiedad', subtitle: '¿Cuánto te inquietaste por cosas diversas?', options: OPTION_SET, tint: 'linear-gradient(160deg, #e8f5ff, #f3edff)' },
  { emoji: '💤', title: 'Dificultad para relajarte', subtitle: '¿Te costó relajarte durante la semana?', options: OPTION_SET, tint: 'linear-gradient(160deg, #fff2de, #f7edff)' },
  { emoji: '⚡', title: 'Inquietud', subtitle: '¿Sentiste nerviosismo o agitación?', options: OPTION_SET, tint: 'linear-gradient(160deg, #ffe8e8, #fff1f7)' },
  { emoji: '🧭', title: 'Miedo o preocupación', subtitle: '¿Cuánto temiste que algo terrible pudiera suceder?', options: OPTION_SET, tint: 'linear-gradient(160deg, #e9fff1, #f0f3ff)' },
  { emoji: '🌙', title: 'Dificultad para dormir', subtitle: '¿Tu descanso se vio afectado por la ansiedad?', options: OPTION_SET, tint: 'linear-gradient(160deg, #f0efff, #e0f7ff)' },
  { emoji: '🤝', title: 'Control de tus preocupaciones', subtitle: '¿Te resultó complicado controlar tus preocupaciones?', options: OPTION_SET, tint: 'linear-gradient(160deg, #fff0e6, #f5ebff)' }
];

const PHQ9_QUESTIONS = [
  { emoji: '🌤️', title: 'Interés o placer', subtitle: '¿Tuviste poco interés en hacer cosas?', options: OPTION_SET, tint: 'linear-gradient(160deg, #fff0e6, #f8e9ff)' },
  { emoji: '🙂', title: 'Estado de ánimo', subtitle: '¿Te sentiste decaído o sin esperanza?', options: OPTION_SET, tint: 'linear-gradient(160deg, #e8f4ff, #fff0f8)' },
  { emoji: '😴', title: 'Sueño', subtitle: '¿Tuviste dificultades para dormir o dormiste demasiado?', options: OPTION_SET, tint: 'linear-gradient(160deg, #f0f4ff, #fff3e6)' },
  { emoji: '🍽️', title: 'Apetito', subtitle: '¿Tuviste poco apetito o comiste en exceso?', options: OPTION_SET, tint: 'linear-gradient(160deg, #fff0f5, #edf6ff)' },
  { emoji: '💨', title: 'Energía', subtitle: '¿Te sentiste cansado o con poca energía?', options: OPTION_SET, tint: 'linear-gradient(160deg, #f4e9ff, #fff4ea)' },
  { emoji: '🤔', title: 'Autoestima', subtitle: '¿Te sentiste mal contigo o que eres un fracaso?', options: OPTION_SET, tint: 'linear-gradient(160deg, #f0ffef, #f4ebff)' },
  { emoji: '🧠', title: 'Concentración', subtitle: '¿Tuviste problemas para concentrarte?', options: OPTION_SET, tint: 'linear-gradient(160deg, #e8f9ff, #f5f0ff)' },
  { emoji: '🚶', title: 'Movimiento o lentitud', subtitle: '¿Te notaron inquieto o demasiado lento?', options: OPTION_SET, tint: 'linear-gradient(160deg, #ffeef2, #eef6ff)' },
  { emoji: '❤️', title: 'Pensamientos', subtitle: '¿Pensaste que estarías mejor muerto o lastimándote?', options: OPTION_SET, tint: 'linear-gradient(160deg, #ffe8e8, #fff4f7)' }
];

// --- Assessment flow ---
function startAssessment(type) {
  const dataset = type === 'phq9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
  currentAssessment = {
    type,
    questions: dataset,
    answers: Array(dataset.length).fill(undefined),
    index: 0,
    title: type === 'phq9' ? 'Evaluación PHQ-9' : 'Check-in de Bienestar (GAD-7)'
  };
  renderAssessment();
  showView('view-assessment');
}

function renderAssessment() {
  if (!currentAssessment) return;
  const { questions, index, title, answers } = currentAssessment;
  const question = questions[index];
  elements.assessmentTitle.textContent = title;
  elements.assessmentStep.textContent = `Pregunta ${index + 1} de ${questions.length}`;
  const percent = ((index + 1) / questions.length) * 100;
  elements.assessmentProgress.style.width = `${percent}%`;

  elements.questionCard.innerHTML = '';
  elements.questionCard.style.background = question.tint || '';
  elements.questionCard.style.color = question.textColor || 'var(--text-primary)';

  const header = document.createElement('div');
  header.className = 'question-header';
  const emoji = document.createElement('div');
  emoji.className = 'question-emoji';
  emoji.textContent = question.emoji || '😊';
  const titleEl = document.createElement('h3');
  titleEl.className = 'question-title';
  titleEl.textContent = question.title;
  const subtitleEl = document.createElement('p');
  subtitleEl.className = 'question-subtitle';
  subtitleEl.textContent = question.subtitle || '';

  header.append(emoji, titleEl, subtitleEl);
  elements.questionCard.append(header);

  if (question.options) {
    const list = document.createElement('div');
    list.className = 'option-list';
    question.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-button';
      btn.textContent = opt.label;
      if (answers[index] === opt.value) {
        btn.classList.add('is-selected');
      }
      btn.addEventListener('click', () => {
        currentAssessment.answers[index] = opt.value;
        renderAssessment();
        updateAssessmentControls();
      });
      list.append(btn);
    });
    elements.questionCard.append(list);
  }

  updateAssessmentControls();
}

function updateAssessmentControls() {
  if (!currentAssessment) return;
  const { index, answers, questions } = currentAssessment;
  const hasAnswer = typeof answers[index] === 'number';
  if (elements.btnPrevQuestion) {
    elements.btnPrevQuestion.disabled = index === 0;
  }
  if (elements.btnNextQuestion) {
    elements.btnNextQuestion.disabled = !hasAnswer;
    elements.btnNextQuestion.textContent = index === questions.length - 1 ? 'Finalizar' : 'Siguiente';
  }
}

async function submitAssessment() {
  if (!currentAssessment) return;
  const { type, answers } = currentAssessment;
  const payload = answers.map(a => Number(a ?? 0));
  try {
    elements.btnNextQuestion.disabled = true;
    elements.btnNextQuestion.textContent = 'Enviando...';
    let response;
    const userId = currentUser?.userId;
    if (type === 'phq9') {
      response = await apiPhq9(payload, userId);
    } else {
      response = await apiGad7(payload, userId);
    if (type === 'phq9') {
      response = await apiPhq9(payload);
    } else {
      response = await apiGad7(payload);
    }
    lastResultType = type;
    showResult(response, type);
    await loadHistory();
  } catch (error) {
    console.error(error);
    showToast('No se pudo enviar la evaluación. Inténtalo nuevamente.');
    elements.btnNextQuestion.disabled = false;
    updateAssessmentControls();
  } finally {
    if (elements.btnNextQuestion) {
      elements.btnNextQuestion.textContent = 'Finalizar';
    }
  }
}

function showResult(result, type) {
  showView('view-result');
  const isPhq = type === 'phq9';
  elements.resultTitle.textContent = isPhq ? 'Resultados PHQ-9' : 'Resultados GAD-7';
  elements.resultSummary.textContent = `Tu puntaje total fue ${result.total} (${result.category}).`;
  elements.resultDetails.innerHTML = '';

  const items = [
    `Interpretación: ${result.message || 'Consulta con un especialista si lo necesitas.'}`
  ];
  if (result.createdAt) {
    items.push(`Registrado el ${new Date(result.createdAt).toLocaleString('es-ES')}`);
  }
  items.forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    elements.resultDetails.append(li);
  });
}

function goToDashboard() {
  showView('view-dashboard');
  updateDashboard();
}

}

function goToDashboard() {
  showView('view-dashboard');
  updateDashboard();
}

async function loadHistory() {
  if (!currentUser) return;
  try {
    const items = await apiHistory(currentUser.userId);
    renderHistory(items);
  } catch (error) {
    console.error(error);
    showToast('No se pudo cargar el historial.');
  }
}

function renderHistory(items) {
  if (!elements.historyList) return;
  elements.historyList.innerHTML = '';
  if (!items || !items.length) {
    const li = document.createElement('li');
    li.textContent = 'Aún no tienes evaluaciones registradas.';
    elements.historyList.append(li);
    return;
  }
  items.slice().reverse().forEach(item => {
    const li = document.createElement('li');
    li.className = 'history-item';
    const left = document.createElement('div');
    left.innerHTML = `<strong>${item.type}</strong><br><span>${new Date(item.createdAt).toLocaleString('es-ES')}</span>`;
    const right = document.createElement('div');
    right.innerHTML = `<strong>${item.total}</strong><br><span>${item.category}</span>`;
    li.append(left, right);
    elements.historyList.append(li);
  });
}

function toggleHistory(show) {
  if (!elements.historyPanel) return;
  elements.historyPanel.classList.toggle('hidden', !show);
  if (show) {
    loadHistory();
  }
}

// --- Event bindings ---
if (elements.loginForm) {
  elements.loginForm.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    const email = elements.loginEmail.value.trim();
    const password = elements.loginPassword.value;
    setStatus(elements.loginStatus, 'Iniciando sesión...');
    try {
      const data = await apiLogin(email, password);
      setToken(data.token);
      const name = getDisplayName(data.email);
      currentUser = { email: data.email, userId: data.userId, name };
      storeProfile(currentUser);
      updateDashboard();
      showToast('¡Bienvenido de vuelta!');
      showView('view-dashboard');
      elements.loginForm.reset();
      setStatus(elements.loginStatus, '', null);
    } catch (error) {
      console.error(error);
      setStatus(elements.loginStatus, 'Credenciales inválidas. Verifica tus datos.', 'error');
    }
  });
}

if (elements.registerForm) {
  elements.registerForm.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    const name = document.getElementById('registerName').value.trim();

    if (password !== confirm) {
      setStatus(elements.registerStatus, 'Las contraseñas no coinciden.', 'error');
      return;
    }

    setStatus(elements.registerStatus, 'Creando cuenta...');
    try {
      await apiRegister(email, password);
      if (name) {
        storeDisplayName(email, name);
      }
      setStatus(elements.registerStatus, 'Cuenta creada correctamente. Ahora puedes iniciar sesión.', 'success');
      elements.registerForm.reset();
      setTimeout(() => {
        showView('view-login');
        setStatus(elements.registerStatus, '', null);
      }, 1200);
    } catch (error) {
      console.error(error);
      setStatus(elements.registerStatus, 'No se pudo registrar. ¿El correo ya existe?', 'error');
    }
  });
}


if (elements.registerForm) {
  elements.registerForm.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    const name = document.getElementById('registerName').value.trim();

    if (password !== confirm) {
      setStatus(elements.registerStatus, 'Las contraseñas no coinciden.', 'error');
      return;
    }

    setStatus(elements.registerStatus, 'Creando cuenta...');
    try {
      await apiRegister(email, password);
      if (name) {
        storeDisplayName(email, name);
      }
      setStatus(elements.registerStatus, 'Cuenta creada correctamente. Ahora puedes iniciar sesión.', 'success');
      elements.registerForm.reset();
      setTimeout(() => {
        showView('view-login');
        setStatus(elements.registerStatus, '', null);
      }, 1200);
    } catch (error) {
      console.error(error);
      setStatus(elements.registerStatus, 'No se pudo registrar. ¿El correo ya existe?', 'error');
    }
  });
}

Array.from(document.querySelectorAll('[data-switch]')).forEach(button => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-switch');
    if (target === 'register') {
      showView('view-register');
    } else {
      showView('view-login');
    }
  });
});

if (elements.btnLogout) {
  elements.btnLogout.addEventListener('click', () => {
    clearToken();
    clearProfile();
    currentUser = null;
    toggleHistory(false);
    showView('view-login');
    showToast('Sesión cerrada.');
  });
}

if (elements.btnStartGad7) {
  elements.btnStartGad7.addEventListener('click', () => startAssessment('gad7'));
}

if (elements.btnStartPhq9) {
  elements.btnStartPhq9.addEventListener('click', () => startAssessment('phq9'));
}

if (elements.btnBackToDashboard) {
  elements.btnBackToDashboard.addEventListener('click', () => {
    if (!currentAssessment) {
      showView('view-dashboard');
      return;
    }
    const hasProgress = currentAssessment.answers.some(a => typeof a === 'number');
    if (!hasProgress || confirm('¿Deseas salir de la evaluación actual?')) {
      currentAssessment = null;
      showView('view-dashboard');
    }
  });
}

if (elements.btnPrevQuestion) {
  elements.btnPrevQuestion.addEventListener('click', () => {
    if (!currentAssessment || currentAssessment.index === 0) return;
    currentAssessment.index -= 1;
    renderAssessment();
  });
}

if (elements.btnNextQuestion) {
  elements.btnNextQuestion.addEventListener('click', () => {
    if (!currentAssessment) return;
    const { index, questions, answers } = currentAssessment;
    if (typeof answers[index] !== 'number') return;
    if (index === questions.length - 1) {
      submitAssessment();
    } else {
      currentAssessment.index += 1;
      renderAssessment();
    }
  });
}

if (elements.btnOpenHistory) {
  elements.btnOpenHistory.addEventListener('click', () => toggleHistory(true));
}

if (elements.btnCloseHistory) {
  elements.btnCloseHistory.addEventListener('click', () => toggleHistory(false));
}

if (elements.btnResultDashboard) {
  elements.btnResultDashboard.addEventListener('click', () => {
    goToDashboard();
  });
}

if (elements.btnResultHistory) {
  elements.btnResultHistory.addEventListener('click', () => {
    goToDashboard();
    toggleHistory(true);
  });
}

ensureAuth();
