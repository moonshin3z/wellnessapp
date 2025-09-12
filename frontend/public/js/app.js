// frontend/public/js/app.js
const API = 'http://localhost:8082/api/v1';

function getToken() { return localStorage.getItem('token') || ''; }
function setToken(t) { localStorage.setItem('token', t); }
function $(id) { return document.getElementById(id); }

// --- API ---
async function apiLogin(email, password) {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} - ${await r.text()}`);
  return r.json();
}

async function apiGad7(answers, notes='') {
  const r = await fetch(`${API}/assessments/gad7`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({ answers, notes })
  });
  if (!r.ok) throw new Error(`GAD7 HTTP ${r.status}`);
  return r.json();
}

async function apiPhq9(answers, notes='') {
  const r = await fetch(`${API}/assessments/phq9`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({ answers, notes })
  });
  if (!r.ok) throw new Error(`PHQ9 HTTP ${r.status}`);
  return r.json();
}

async function apiHistory() {
  const r = await fetch(`${API}/assessments/history`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  if (!r.ok) throw new Error(`HISTORY HTTP ${r.status}`);
  return r.json();
}

// --- UI helpers ---
function setText(id, text, cls) {
  const el = $(id);
  if (!el) return;
  el.className = cls || '';
  el.textContent = text;
}

// --- Event handlers ---
async function doLogin() {
  setText('loginStatus', 'Iniciando sesión...');
  try {
    const email = $('email').value.trim();
    const password = $('password').value.trim();
    const data = await apiLogin(email, password);
    if (data && data.token) {
      setToken(data.token);
      setText('loginStatus', '✅ Login exitoso', 'ok');
    } else {
      setText('loginStatus', '❌ Respuesta sin token', 'err');
    }
  } catch (e) {
    console.error(e);
    setText('loginStatus', '❌ Error de login: ' + e.message, 'err');
  }
}

async function doGad7() {
  try {
    const res = await apiGad7([1,2,0,1,3,2,1], 'desde frontend');
    alert('Resultado GAD-7: ' + JSON.stringify(res));
  } catch (e) {
    console.error(e);
    alert('Error GAD-7: ' + e.message);
  }
}

async function doPhq9() {
  try {
    const res = await apiPhq9([0,1,2,1,0,2,3,1,2], 'desde frontend');
    alert('Resultado PHQ-9: ' + JSON.stringify(res));
  } catch (e) {
    console.error(e);
    alert('Error PHQ-9: ' + e.message);
  }
}

async function doHistory() {
  try {
    const res = await apiHistory();
    $('history').textContent = JSON.stringify(res, null, 2);
  } catch (e) {
    console.error(e);
    $('history').textContent = 'Error: ' + e.message;
  }
}

// --- Wireup al cargar el DOM ---
document.addEventListener('DOMContentLoaded', () => {
  const btnLogin  = $('btnLogin');
  const btnGad7   = $('btnGad7');
  const btnPhq9   = $('btnPhq9');
  const btnHistory= $('btnHistory');

  if (btnLogin)  btnLogin.addEventListener('click', doLogin);
  if (btnGad7)   btnGad7.addEventListener('click', doGad7);
  if (btnPhq9)   btnPhq9.addEventListener('click', doPhq9);
  if (btnHistory)btnHistory.addEventListener('click', doHistory);
});
