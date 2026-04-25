/**
 * ═══════════════════════════════════════
 * MathQuest — result.js
 * Résultats : podium 3D, confettis, classement
 * ═══════════════════════════════════════
 */

const socket = io();
const rankings = JSON.parse(sessionStorage.getItem('rankings') || '[]');
const winner = sessionStorage.getItem('winner') || '?';

// ── Populate podium ──
function renderPodium() {
  const isSolo = sessionStorage.getItem('is_solo') === 'true';
  const maxQ = parseInt(sessionStorage.getItem('max_questions') || '10');

  if (isSolo) {
    const score = rankings[0] ? rankings[0].score : 0;
    
    // Set custom winner text based on performance
    let msg = "PEUT MIEUX FAIRE";
    if (score === maxQ) msg = "SANS FAUTE !";
    else if (score >= maxQ / 2) msg = "BIEN JOUÉ !";
    
    document.getElementById('winner-text').textContent = msg;
    document.getElementById('winner-name').textContent = `Moyenne : ${score} / ${maxQ}`;
    
    document.getElementById('podium').style.display = 'none';
    document.getElementById('other-players').style.display = 'none';
    
    const soloRes = document.getElementById('solo-result');
    soloRes.classList.remove('hidden');
    document.getElementById('solo-score-display').textContent = `${score} / ${maxQ}`;
    
    return;
  }

  // Normal Multiplayer Podium
  document.getElementById('winner-name').textContent = '🏆 ' + winner + ' remporte la victoire !';

  // Podium places (1st, 2nd, 3rd)
  if (rankings[0]) {
    document.getElementById('podium-name-1').textContent = rankings[0].name;
    document.getElementById('podium-score-1').textContent = rankings[0].score + ' pts';
  }
  if (rankings[1]) {
    document.getElementById('podium-name-2').textContent = rankings[1].name;
    document.getElementById('podium-score-2').textContent = rankings[1].score + ' pts';
  } else {
    document.getElementById('podium-2').style.visibility = 'hidden';
  }
  if (rankings[2]) {
    document.getElementById('podium-name-3').textContent = rankings[2].name;
    document.getElementById('podium-score-3').textContent = rankings[2].score + ' pts';
  } else {
    document.getElementById('podium-3').style.visibility = 'hidden';
  }

  // Other players (4th+)
  const otherContainer = document.getElementById('other-players');
  rankings.slice(3).forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.style.animationDelay = ((i + 3) * 0.15) + 's';
    card.innerHTML = `
      <div class="player-avatar">${p.name.charAt(0).toUpperCase()}</div>
      <span class="player-name">#${i + 4} — ${p.name}</span>
      <span class="player-score">${p.score}</span>
    `;
    otherContainer.appendChild(card);
  });
}

// ── CSS 3D Confetti ──
function launchConfetti() {
  const container = document.getElementById('confetti-container');
  const colors = ['#FFD700', '#4F46E5', '#06EFC5', '#FF3860', '#E8EAF6', '#6C63FF', '#f472b6'];

  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = (2 + Math.random() * 3) + 's';
    piece.style.animationDelay = (Math.random() * 2) + 's';
    piece.style.width = (6 + Math.random() * 10) + 'px';
    piece.style.height = (8 + Math.random() * 14) + 'px';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    container.appendChild(piece);
  }

  // Clean up after animation
  setTimeout(() => container.innerHTML = '', 6000);
}

// ── GSAP entrance animations ──
function animateEntrance() {
  gsap.from('.winner-text', {
    scale: 0, rotateY: 720, duration: 1.2, ease: 'elastic.out(1, 0.4)', delay: 0.2
  });
  gsap.from('#winner-name', {
    opacity: 0, y: 30, duration: 0.8, ease: 'power3.out', delay: 0.6
  });
  gsap.from('.podium-place', {
    y: 100, opacity: 0, rotateX: 30, duration: 0.8,
    ease: 'back.out(1.7)', stagger: 0.2, delay: 0.8
  });
}

// ── Play Again ──
function playAgain() {
  socket.emit('play_again', { room_code: ROOM_CODE });
}

socket.on('connect', () => {
  socket.emit('join_room', { room_code: ROOM_CODE, player_name: sessionStorage.getItem('player_name') || 'Joueur' });
});

socket.on('go_to_lobby', (data) => {
  // En multijoueur, on retourne au lobby. Seul l'hôte devrait pouvoir relancer,
  // mais au cas où on donne les droits d'hôte pour éviter le blocage.
  sessionStorage.setItem('is_host', 'true');
  window.location.href = '/lobby/' + data.room_code;
});

socket.on('solo_restart', (data) => {
  // En solo, on retourne directement dans le jeu
  window.location.href = '/game/' + data.room_code;
});

// ── Init ──
renderPodium();
animateEntrance();
setTimeout(launchConfetti, 500);

if (typeof playSFX === 'function') {
  setTimeout(() => playSFX('win'), 300);
}

// Ripple on buttons
document.querySelectorAll('.btn-3d').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
});
