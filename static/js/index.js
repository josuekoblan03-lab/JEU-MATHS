/**
 * ═══════════════════════════════════════
 * MathQuest — index.js
 * Page d'accueil : Créer / Rejoindre
 * ═══════════════════════════════════════
 */

const socket = io();

// ── Tab switching ──
function showTab(tab) {
  document.getElementById('tab-create').classList.toggle('hidden', tab !== 'create');
  document.getElementById('tab-join').classList.toggle('hidden', tab !== 'join');
  document.getElementById('tab-solo').classList.toggle('hidden', tab !== 'solo');
  document.getElementById('btn-tab-create').style.opacity = tab === 'create' ? '1' : '.4';
  document.getElementById('btn-tab-join').style.opacity = tab === 'join' ? '1' : '.4';
  document.getElementById('btn-tab-solo').style.opacity = tab === 'solo' ? '1' : '.4';
}

// ── Create Room ──
function createRoom() {
  const name = document.getElementById('create-name').value.trim();
  const score = document.getElementById('winning-score').value;
  if (!name) {
    showError('create-error', 'Entrez votre pseudo !');
    return;
  }
  addRipple(document.getElementById('btn-create'), event);
  socket.emit('create_room', { player_name: name, winning_score: score });
}

// ── Join Room ──
function joinRoom() {
  const name = document.getElementById('join-name').value.trim();
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  if (!name) { showError('join-error', 'Entrez votre pseudo !'); return; }
  if (!code || code.length < 4) { showError('join-error', 'Code invalide !'); return; }
  addRipple(document.getElementById('btn-join'), event);
  socket.emit('join_room', { room_code: code, player_name: name });
}

// ── Solo Game ──
function createSoloGame() {
  const nameInput = document.getElementById('solo-name').value.trim() || 'Joueur Solo';
  const winningScore = parseInt(document.getElementById('solo-winning-score').value) || 10;
  const difficulty = document.getElementById('solo-difficulty').value || 'normal';
  
  sessionStorage.setItem('player_name', nameInput);
  socket.emit('create_solo_game', { 
    player_name: nameInput, 
    winning_score: winningScore,
    difficulty: difficulty
  });
}

// ── Socket Events ──
socket.on('room_created', (data) => {
  // Store player info and redirect to lobby
  sessionStorage.setItem('player_name', data.player_name);
  sessionStorage.setItem('is_host', 'true');
  window.location.href = '/lobby/' + data.room_code;
});

socket.on('room_joined', (data) => {
  sessionStorage.setItem('player_name', data.player_name);
  sessionStorage.setItem('is_host', 'false');
  window.location.href = '/lobby/' + data.room_code;
});

socket.on('join_error', (data) => {
  showError('join-error', data.message);
});

socket.on('solo_game_started', (data) => {
  sessionStorage.setItem('player_name', data.player_name);
  sessionStorage.setItem('is_host', 'true');
  window.location.href = '/game/' + data.room_code;
});

// ── Utility ──
function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

/** Ripple effect on 3D buttons */
function addRipple(button, e) {
  if (!e) return;
  const ripple = document.createElement('span');
  ripple.classList.add('ripple');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
  ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

// Add ripple to all 3D buttons
document.querySelectorAll('.btn-3d').forEach(btn => {
  btn.addEventListener('click', function(e) { addRipple(this, e); });
});

// ── 3D Tilt on main card ──
const mainCard = document.getElementById('main-card');
if (mainCard) {
  mainCard.style.transformStyle = 'preserve-3d';
  mainCard.addEventListener('mousemove', (e) => {
    const rect = mainCard.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mainCard.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
  });
  mainCard.addEventListener('mouseleave', () => {
    mainCard.style.transform = 'perspective(800px) rotateY(0) rotateX(0)';
  });
}

// Enter key support
document.getElementById('join-code')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') joinRoom();
});
document.getElementById('create-name')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') createRoom();
});
document.getElementById('solo-name')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') createSoloGame();
});

// ── Init ──
showTab('solo');
