/**
 * ═══════════════════════════════════════
 * MathQuest — lobby.js
 * Salle d'attente : joueurs, code, démarrage
 * ═══════════════════════════════════════
 */

const socket = io();
const playerName = sessionStorage.getItem('player_name') || 'Joueur';
const isHost = sessionStorage.getItem('is_host') === 'true';

// ── Render Room Code as 3D characters ──
function renderRoomCode() {
  const container = document.getElementById('room-code-display');
  container.innerHTML = '';
  ROOM_CODE.split('').forEach((char, i) => {
    const el = document.createElement('div');
    el.className = 'room-code-char';
    el.textContent = char;
    el.style.animationDelay = (i * 0.1) + 's';
    container.appendChild(el);
  });
}

// ── Render player list ──
function renderPlayers(players) {
  const list = document.getElementById('player-list');
  list.innerHTML = '';
  players.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.style.animationDelay = (i * 0.1) + 's';
    card.innerHTML = `
      <div class="player-avatar">${p.name.charAt(0).toUpperCase()}</div>
      <span class="player-name">${p.name}</span>
      ${i === 0 ? '<span class="host-badge">HÔTE</span>' : ''}
    `;
    list.appendChild(card);
  });

  // Show/hide start button
  if (isHost) {
    const btn = document.getElementById('btn-start');
    btn.classList.toggle('hidden', players.length < 2);
  } else {
    document.getElementById('wait-msg').classList.remove('hidden');
  }
}

// ── Start game (host only) ──
function startGame() {
  socket.emit('start_game', { room_code: ROOM_CODE });
}

// ── Copy Room Code ──
function copyRoomCode() {
  navigator.clipboard.writeText(ROOM_CODE).then(() => {
    const btn = document.getElementById('btn-copy');
    const originalText = btn.textContent;
    btn.textContent = '✅';
    btn.classList.add('copied');
    
    if (typeof playSFX === 'function') playSFX('pop');

    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('copied');
    }, 2000);
  }).catch(err => {
    console.error('Erreur lors de la copie :', err);
  });
}

// ── Socket Events ──
// Re-join the room on connect
socket.on('connect', () => {
  socket.emit('join_room', { room_code: ROOM_CODE, player_name: playerName });
});

socket.on('player_joined', (data) => {
  renderPlayers(data.players);
});

socket.on('player_left', (data) => {
  renderPlayers(data.players);
});

socket.on('game_started', (data) => {
  window.location.href = '/game/' + data.room_code;
});

socket.on('error', (data) => {
  const el = document.getElementById('lobby-error');
  el.textContent = data.message;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
});

socket.on('join_error', (data) => {
  // If room doesn't exist, redirect home
  window.location.href = '/';
});

// ── Init ──
renderRoomCode();

// 3D tilt on player cards (delegation)
document.getElementById('player-list').addEventListener('mousemove', (e) => {
  const card = e.target.closest('.player-card');
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  card.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
});
document.getElementById('player-list').addEventListener('mouseleave', (e) => {
  const card = e.target.closest('.player-card');
  if (card) card.style.transform = '';
}, true);
