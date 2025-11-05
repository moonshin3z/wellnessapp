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
  statsSection: document.getElementById('statsSection'),
  statsEmpty: document.getElementById('statsEmpty'),
  statsTotalEvaluations: document.getElementById('statsTotalEvaluations'),
  statsAverageGad7: document.getElementById('statsAverageGad7'),
  statsAveragePhq9: document.getElementById('statsAveragePhq9'),
  statsLastGad7: document.getElementById('statsLastGad7'),
  statsLastPhq9: document.getElementById('statsLastPhq9'),
  statsTrend: document.getElementById('statsTrend'),
  statsSeverity: document.getElementById('statsSeverity'),
  statsTrendEmpty: document.querySelector('[data-chart-empty="trend"]'),
  statsSeverityEmpty: document.querySelector('[data-chart-empty="severity"]'),
};

let currentUser = null;
let currentAssessment = null;
let lastResultType = null;

const statsCharts = {
  trend: null,
  severity: null
};

function destroyStatsCharts() {
  if (statsCharts.trend) {
    statsCharts.trend.destroy();
    statsCharts.trend = null;
  }
  if (statsCharts.severity) {
    statsCharts.severity.destroy();
    statsCharts.severity = null;
  }
}

function toggleChartCards(hasData) {
  const chartPairs = [
    { canvas: elements.statsTrend, empty: elements.statsTrendEmpty },
    { canvas: elements.statsSeverity, empty: elements.statsSeverityEmpty }
  ];

  chartPairs.forEach(({ canvas, empty }) => {
    if (!canvas) return;
    const card = canvas.closest('.chart-card');
    if (card) {
      card.classList.toggle('is-empty', !hasData);
    }
    if (empty) {
      empty.classList.toggle('is-hidden', hasData);
    }
  });
}

const chartColors = {
  gad7: '#5d5fef',
  phq9: '#ff8ec5'
};

const severityOrder = [
  'Sin síntomas', 'Mínimo', 'Leve', 'Moderado', 'Moderadamente severo', 'Grave', 'Severo'
];

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
    loadHistory();
  } else {
    showView('view-login');
    renderStats([]);
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

async function apiGad7(answers, options = {}) {
  const payload = { answers };
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

async function apiPhq9(answers, options = {}) {
  const payload = { answers };
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

async function apiHistory() {
  const res = await fetch(`${API}/assessments/history`, {
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
    const response = (type === 'phq9')
      ? await apiPhq9(payload)
      : await apiGad7(payload);
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

async function loadHistory() {
  if (!currentUser) return;
  try {
    const items = await apiHistory();
    renderHistory(items);
    renderStats(items);
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

function normalizeType(type) {
  const text = (type || '').toLowerCase();
  if (text.includes('phq')) return 'phq9';
  return 'gad7';
}

function formatResultSummary(item) {
  if (!item) return '';
  const date = new Date(item.createdAt);
  const dateText = isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
  const categoryText = item.category ? ` · ${item.category}` : '';
  return `${item.total} puntos${categoryText}${dateText ? ` · ${dateText}` : ''}`;
}

function sortBySeverity(a, b) {
  const idxA = severityOrder.indexOf(a);
  const idxB = severityOrder.indexOf(b);
  const safeA = idxA === -1 ? Number.MAX_SAFE_INTEGER : idxA;
  const safeB = idxB === -1 ? Number.MAX_SAFE_INTEGER : idxB;
  if (safeA === safeB) return a.localeCompare(b, 'es');
  return safeA - safeB;
}

function updateTrendChart(labels, gadData, phqData) {
  if (!elements.statsTrend || typeof Chart === 'undefined') return;
  const datasets = [
    {
      label: 'GAD-7',
      data: gadData,
      borderColor: chartColors.gad7,
      backgroundColor: chartColors.gad7,
      tension: 0.35,
      pointRadius: 4,
      spanGaps: true
    },
    {
      label: 'PHQ-9',
      data: phqData,
      borderColor: chartColors.phq9,
      backgroundColor: chartColors.phq9,
      tension: 0.35,
      pointRadius: 4,
      spanGaps: true
    }
  ];
  if (!statsCharts.trend) {
    statsCharts.trend = new Chart(elements.statsTrend, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 2 }
          }
        },
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true } },
          tooltip: { mode: 'index', intersect: false }
        }
      }
    });
  } else {
    statsCharts.trend.data.labels = labels;
    statsCharts.trend.data.datasets[0].data = gadData;
    statsCharts.trend.data.datasets[1].data = phqData;
    statsCharts.trend.update();
  }
}

function updateSeverityChart(labels, values) {
  if (!elements.statsSeverity || typeof Chart === 'undefined') return;
  const colors = labels.map((_, index) => index % 2 === 0 ? 'rgba(93, 95, 239, 0.65)' : 'rgba(255, 142, 197, 0.65)');
  if (!statsCharts.severity) {
    statsCharts.severity = new Chart(elements.statsSeverity, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Evaluaciones',
          data: values,
          backgroundColor: colors,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    });
  } else {
    statsCharts.severity.data.labels = labels;
    statsCharts.severity.data.datasets[0].data = values;
    statsCharts.severity.data.datasets[0].backgroundColor = colors;
    statsCharts.severity.update();
  }
}

function renderStats(items) {
  if (!elements.statsSection) return;
  const hasData = Array.isArray(items) && items.length > 0;
  elements.statsSection.classList.toggle('insights--empty', !hasData);
  if (elements.statsEmpty) {
    elements.statsEmpty.classList.toggle('is-hidden', hasData);
  }
  toggleChartCards({ trend: false, severity: false });

  if (!hasData) {
    if (elements.statsTotalEvaluations) elements.statsTotalEvaluations.textContent = '0';
    if (elements.statsAverageGad7) elements.statsAverageGad7.textContent = '–';
    if (elements.statsAveragePhq9) elements.statsAveragePhq9.textContent = '–';
    if (elements.statsLastGad7) elements.statsLastGad7.textContent = 'Aún no has completado un GAD-7.';
    if (elements.statsLastPhq9) elements.statsLastPhq9.textContent = 'Aún no has completado un PHQ-9.';
    destroyStatsCharts();
    return;
  }

  if (elements.statsTotalEvaluations) {
    elements.statsTotalEvaluations.textContent = `${items.length}`;
  }

  const normalized = items
    .map(item => ({
      ...item,
      total: Number.isFinite(Number(item.total)) ? Number(item.total) : 0,
      date: new Date(item.createdAt),
      typeKey: normalizeType(item.type)
    }))
    .filter(item => !Number.isNaN(item.date.getTime()))
    .sort((a, b) => a.date - b.date);

  const grouped = { gad7: [], phq9: [] };
  const severityCounts = new Map();

  normalized.forEach(item => {
    grouped[item.typeKey].push(item);
    const label = (item.category || 'Sin categoría').trim();
    severityCounts.set(label, (severityCounts.get(label) || 0) + 1);
  });

  const average = (arr) => arr.length ? (arr.reduce((sum, entry) => sum + entry.total, 0) / arr.length) : null;

  const avgGad = average(grouped.gad7);
  const avgPhq = average(grouped.phq9);

  if (elements.statsAverageGad7) {
    elements.statsAverageGad7.textContent = (avgGad !== null) ? `${avgGad.toFixed(1)} pts` : 'Sin datos';
  }
  if (elements.statsAveragePhq9) {
    elements.statsAveragePhq9.textContent = (avgPhq !== null) ? `${avgPhq.toFixed(1)} pts` : 'Sin datos';
  }

  const lastGad = grouped.gad7[grouped.gad7.length - 1];
  const lastPhq = grouped.phq9[grouped.phq9.length - 1];

  if (elements.statsLastGad7) {
    elements.statsLastGad7.textContent = lastGad ? formatResultSummary(lastGad) : 'Aún no has completado un GAD-7.';
  }
  if (elements.statsLastPhq9) {
    elements.statsLastPhq9.textContent = lastPhq ? formatResultSummary(lastPhq) : 'Aún no has completado un PHQ-9.';
  }

  const recent = normalized.slice(-10);
  const labels = recent.map(item => new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(item.date));
  const gadTrend = recent.map(item => item.typeKey === 'gad7' ? item.total : null);
  const phqTrend = recent.map(item => item.typeKey === 'phq9' ? item.total : null);
  const hasTrendData = gadTrend.some(value => typeof value === 'number')
    || phqTrend.some(value => typeof value === 'number');
  if (hasTrendData) {
    updateTrendChart(labels, gadTrend, phqTrend);
  } else if (statsCharts.trend) {
    statsCharts.trend.destroy();
    statsCharts.trend = null;
  }

  const severityLabels = Array.from(severityCounts.keys()).sort(sortBySeverity);
  const severityValues = severityLabels.map(label => severityCounts.get(label));
  const hasSeverityData = severityValues.some(value => typeof value === 'number' && value > 0);
  if (hasSeverityData) {
    updateSeverityChart(severityLabels, severityValues);
  } else if (statsCharts.severity) {
    statsCharts.severity.destroy();
    statsCharts.severity = null;
  }
  toggleChartCards({ trend: hasTrendData, severity: hasSeverityData });
  updateTrendChart(labels, gadTrend, phqTrend);

  const severityLabels = Array.from(severityCounts.keys()).sort(sortBySeverity);
  const severityValues = severityLabels.map(label => severityCounts.get(label));
  updateSeverityChart(severityLabels, severityValues);
  toggleChartCards(true);
}

function toggleHistory(show) {
  if (!elements.historyPanel) return;
  elements.historyPanel.classList.toggle('hidden', !show);
  elements.historyPanel.setAttribute('aria-hidden', show ? 'false' : 'true');
  if (elements.btnOpenHistory) {
    elements.btnOpenHistory.setAttribute('aria-expanded', show ? 'true' : 'false');
  }
  if (!show) {
    return;
  }
  const focusPanel = () => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        if (elements.historyPanel.scrollIntoView) {
          elements.historyPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (elements.historyPanel.focus) {
          elements.historyPanel.focus({ preventScroll: true });
        }
      });
    }
  };
  const result = loadHistory();
  if (result && typeof result.finally === 'function') {
    result.finally(focusPanel);
  } else {
    focusPanel();
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
      loadHistory();
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
    renderStats([]);
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
  elements.btnCloseHistory.addEventListener('click', () => {
    toggleHistory(false);
    if (elements.btnOpenHistory && elements.btnOpenHistory.focus) {
      elements.btnOpenHistory.focus();
    }
  });
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

/* ---------------------------
   Help widget behavior (integración con app.js)
   Número de crisis: 2331-7101
   --------------------------- */
(function () {
  const CRISIS_NUMBER = '2331-7101';

  const toggle = document.getElementById('help-toggle');
  const panel = document.getElementById('help-panel');
  const closeBtn = document.getElementById('help-close');
  const modalCrisis = document.getElementById('modal-crisis');
  const modalCrisisClose = document.getElementById('modal-crisis-close');
  const copyNumberBtn = document.getElementById('copy-number');
  const callLink = document.getElementById('call-link');
  const crisisNumberEl = document.getElementById('crisis-number');

  // Si el HTML del widget no está agregado al index, salimos silenciosamente
  if (!toggle || !panel) return;

  // Inicializar número y enlace si existen los elementos
  if (crisisNumberEl) crisisNumberEl.textContent = CRISIS_NUMBER;
  if (callLink) callLink.href = `tel:${CRISIS_NUMBER.replace(/\s+/g, '')}`;

  function openPanel() {
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    const first = panel.querySelector('[role="menuitem"], .help-item, button');
    if (first && typeof first.focus === 'function') first.focus();
  }
  function closePanel() {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (typeof toggle.focus === 'function') toggle.focus();
  }

  // Toggle al pulsar el botón
  toggle.addEventListener('click', (e) => {
    const isOpen = panel && !panel.hidden;
    if (isOpen) closePanel(); else openPanel();
  });

  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  // Cerrar si se hace click fuera del panel
  document.addEventListener('click', (e) => {
    if (!panel || panel.hidden) return;
    const isInside = panel.contains(e.target) || toggle.contains(e.target);
    if (!isInside) closePanel();
  });

  // Teclado: Esc cierra modal o panel
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalCrisis && !modalCrisis.hidden) {
        closeModalCrisis();
      } else if (!panel.hidden) {
        closePanel();
      }
    }
  });

  // Delegación para pulsar items del panel
  panel.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.help-item, [role="menuitem"], button');
    if (!btn) return;
    const target = btn.dataset.target;
    const action = btn.dataset.action;

    closePanel();

    // Acción: abrir modal de crisis
    if (action === 'crisis') {
      openModalCrisis();
      return;
    }

    // Acción: iniciar chat -> por ahora sólo muestra toast y navega si target existe
    if (action === 'chat') {
      const destino = document.querySelector('#statsSection') || document.querySelector('.app');
      if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('Chat de apoyo: componente no implementado.'); // usa showToast existente
      return;
    }

    // Si tiene selector de target -> hacer scroll
    if (target) {
      try {
        const el = document.querySelector(target);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          showToast('Abriendo sección solicitada.');
        } else {
          showToast('Sección no encontrada en la página.');
        }
      } catch (err) {
        console.warn('Selector inválido:', target);
        showToast('Error al navegar a la sección.');
      }
    }
  });

  // Modal crisis
  function openModalCrisis() {
    if (!modalCrisis) return;
    modalCrisis.hidden = false;
    const close = modalCrisis.querySelector('.modal-close, #modal-crisis-close');
    if (close && typeof close.focus === 'function') close.focus();
  }
  function closeModalCrisis() {
    if (!modalCrisis) return;
    modalCrisis.hidden = true;
    if (typeof toggle.focus === 'function') toggle.focus();
  }
  if (modalCrisisClose) modalCrisisClose.addEventListener('click', closeModalCrisis);
  if (modalCrisis) {
    modalCrisis.addEventListener('click', (e) => {
      if (e.target === modalCrisis) closeModalCrisis();
    });
  }

  // Copiar número al portapapeles con fallback
  if (copyNumberBtn) {
    copyNumberBtn.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(CRISIS_NUMBER);
          showToast('Número copiado al portapapeles');
        } else {
          // fallback: seleccionar texto y copiar con execCommand
          const el = crisisNumberEl || document.createElement('span');
          if (!crisisNumberEl) {
            el.textContent = CRISIS_NUMBER;
            el.style.position = 'fixed';
            el.style.left = '-9999px';
            document.body.appendChild(el);
          }
          const range = document.createRange();
          range.selectNodeContents(el);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('copy');
          sel.removeAllRanges();
          if (!crisisNumberEl) el.remove();
          showToast('Número copiado (método alternativo).');
        }
      } catch (err) {
        console.error('Error copiando número:', err);
        showToast('No se pudo copiar el número. Copia manualmente.');
      }
    });
  }

  // Si el navegador no soporta clipboard, dejamos botón visible (fallback arriba cubrirá)
})();
