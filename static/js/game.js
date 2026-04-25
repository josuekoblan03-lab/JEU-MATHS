/**
 * ═══════════════════════════════════════
 * MathQuest — game.js
 * Jeu en cours : question 3D, réponses, scores
 * ═══════════════════════════════════════
 */

const socket = io();
const playerName = sessionStorage.getItem('player_name') || 'Joueur';
let isLocked = false;
let questionReceived = false;

// ── Socket: reconnect to room ──
socket.on('connect', () => {
  socket.emit('join_room', { room_code: ROOM_CODE, player_name: playerName });
  
  // Mécanisme de secours : si aucune question reçue après 3s, la demander activement
  questionReceived = false;
  setTimeout(() => {
    if (!questionReceived) {
      console.log('[FALLBACK] No question received after 3s, requesting...');
      socket.emit('request_question', { room_code: ROOM_CODE });
    }
  }, 3000);
  // Deuxième tentative après 6s
  setTimeout(() => {
    if (!questionReceived) {
      console.log('[FALLBACK] Still no question after 6s, requesting again...');
      socket.emit('request_question', { room_code: ROOM_CODE });
    }
  }, 6000);
});

// ── 3D TILT on Question Card (mouse follow) ──
const questionCard = document.getElementById('question-card');
questionCard.addEventListener('mousemove', (e) => {
  const rect = questionCard.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  questionCard.style.transform = `perspective(1000px) rotateY(${x * 15}deg) rotateX(${-y * 15}deg)`;
});
questionCard.addEventListener('mouseleave', () => {
  questionCard.style.transform = 'perspective(1000px) rotateY(0) rotateX(0)';
});

// ── Touch tilt for mobile ──
questionCard.addEventListener('touchmove', (e) => {
  const touch = e.touches[0];
  const rect = questionCard.getBoundingClientRect();
  const x = (touch.clientX - rect.left) / rect.width - 0.5;
  const y = (touch.clientY - rect.top) / rect.height - 0.5;
  questionCard.style.transform = `perspective(1000px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
});
questionCard.addEventListener('touchend', () => {
  questionCard.style.transform = 'perspective(1000px) rotateY(0) rotateX(0)';
});

// ── Render player scores ──
function renderScores(players, scorerId) {
  const list = document.getElementById('player-scores');
  // Find leader
  const maxScore = Math.max(...players.map(p => p.score));

  list.innerHTML = '';
  players.sort((a, b) => b.score - a.score).forEach((p) => {
    const card = document.createElement('div');
    const isLeader = p.score === maxScore && p.score > 0;
    const justScored = p.id === scorerId;
    card.className = 'player-card' + (isLeader ? ' leader' : '') + (justScored ? ' scored' : '');

    card.innerHTML = `
      <div class="player-avatar">${p.name.charAt(0).toUpperCase()}</div>
      <span class="player-name">
        ${p.name}
        ${isLeader ? '<span class="leader-badge">LEADER</span>' : ''}
      </span>
      <span class="player-score score-roller">${animateScoreDigits(p.score, justScored)}</span>
    `;
    list.appendChild(card);
  });
}

/** Create score digit spans with roll animation */
function animateScoreDigits(score, animate) {
  return String(score).split('').map(d =>
    `<span class="score-digit${animate ? ' rolling' : ''}">${d}</span>`
  ).join('');
}

// ── Submit Answer ──
function submitAnswer() {
  if (isLocked) return;
  const input = document.getElementById('answer-input');
  const answer = input.value.trim();

  if (!answer) return;

  // Le lockInput() est géré par l'émission ou par l'UI locale
  lockInput();

  socket.emit('submit_answer', { 
    room_code: ROOM_CODE, 
    answer: answer 
  });
}

// ── Virtual Keypad Logic ──
function keypadType(num) {
  if (isLocked) return;
  const input = document.getElementById('answer-input');
  if (input.value.length < 10) {
    input.value += num;
    if (typeof playSFX === 'function') playSFX('click');
  }
}

function keypadClear() {
  if (isLocked) return;
  const input = document.getElementById('answer-input');
  input.value = input.value.slice(0, -1);
  if (typeof playSFX === 'function') playSFX('click');
}

// ── Enter key to submit ──
document.getElementById('answer-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitAnswer();
});

// ── Show feedback message ──
function showFeedback(message, type) {
  const fb = document.getElementById('feedback');
  fb.className = 'feedback ' + type;
  fb.textContent = message;
  fb.classList.remove('hidden');
  // Re-trigger animation
  fb.style.animation = 'none';
  fb.offsetHeight; // reflow
  fb.style.animation = '';
}

function hideFeedback() {
  document.getElementById('feedback').classList.add('hidden');
}

// ── Lock/Unlock input ──
function lockInput() {
  isLocked = true;
  const input = document.getElementById('answer-input');
  input.classList.add('locked');
  input.disabled = true;
  document.getElementById('btn-submit').disabled = true;
  
  // Désactiver le clavier virtuel
  document.querySelectorAll('.key-3d').forEach(k => {
    k.style.opacity = '0.5';
    k.style.pointerEvents = 'none';
  });
}

function unlockInput() {
  console.log("Unlocking input...");
  isLocked = false;
  try {
    const input = document.getElementById('answer-input');
    if (input) {
      input.classList.remove('locked', 'correct', 'wrong');
      input.disabled = false;
      input.value = '';
      if (window.innerWidth > 1024) {
        setTimeout(() => input.focus(), 10);
      }
    }
    
    const btnSubmit = document.getElementById('btn-submit');
    if (btnSubmit) btnSubmit.disabled = false;
    
    // Réactiver tout le clavier virtuel
    const keys = document.querySelectorAll('.key-3d');
    keys.forEach(k => {
      k.style.opacity = '1';
      k.style.pointerEvents = 'auto';
    });

    hideFeedback();
  } catch (e) {
    console.error("Critical error in unlockInput:", e);
    isLocked = false; // Emergency reset
  }
}

// ══════════════════════════════════════
// SOCKET.IO EVENTS
// ══════════════════════════════════════

socket.on('new_question', (data) => {
  questionReceived = true;
  if (typeof playSFX === 'function') playSFX('pop');

  // Reset card flip
  document.getElementById('card-inner').classList.remove('flipped');

  // Timer
  const timerContainer = document.getElementById('solo-timer');
  const timerBar = document.getElementById('timer-bar');
  
  if (data.is_solo) {
    timerContainer.classList.remove('hidden');
    timerBar.style.transform = ''; // reset inline style
    timerBar.classList.remove('running');
    void timerBar.offsetWidth; // trigger reflow to restart animation
    timerBar.style.animationDuration = '10s';
    timerBar.classList.add('running');

    // Start client-driven timeout to trigger time_up if unanswered
    if (window.questionTimeout) clearTimeout(window.questionTimeout);
    window.questionTimeout = setTimeout(() => {
      if (!document.getElementById('card-inner').classList.contains('flipped')) {
        socket.emit('timer_expired', { room_code: ROOM_CODE });
      }
    }, 11000); 
  } else {
    // Multiplayer: hide timer, no auto-timeout
    timerContainer.classList.add('hidden');
    timerBar.classList.remove('running');
    if (window.questionTimeout) clearTimeout(window.questionTimeout);
  }

  // Update question text with GSAP animation
  const qText = document.getElementById('question-text');
  const qLabel = document.getElementById('question-label');
  qLabel.textContent = `Question #${data.question_number}`;

  gsap.fromTo(qText, { opacity: 0, rotateX: -90, scale: 0.8 },
    { opacity: 1, rotateX: 0, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
  qText.textContent = data.question;

  // Update scores
  renderScores(data.scores, null);

  // Unlock input
  unlockInput();
});

socket.on('correct_answer', (data) => {
  // Flip the card to reveal answer
  document.getElementById('answer-reveal').textContent = `${data.answer} ✓ ${data.player_name}`;
  document.getElementById('card-inner').classList.add('flipped');

  lockInput();

  if (data.player_name === playerName) {
    // I scored!
    document.getElementById('answer-input').classList.add('correct');
    showFeedback(`🎉 Bravo ! Bonne réponse : ${data.answer}`, 'correct');
    if (typeof playSFX === 'function') playSFX('correct');
  } else {
    showFeedback(`${data.player_name} a trouvé : ${data.answer}`, 'late');
    if (typeof playSFX === 'function') playSFX('correct'); // Ou un son différent si on veut
  }

  // Update scores with animation
  renderScores(data.scores, data.player_id);

  // Client-driven progression
  setTimeout(() => {
    if (data.is_over) {
      socket.emit('request_game_over', { room_code: ROOM_CODE });
    } else {
      socket.emit('request_next_question', { room_code: ROOM_CODE });
    }
  }, 1200);
});

// ── Event: Time Up ──
socket.on('time_up', (data) => {
  if (typeof playSFX === 'function') playSFX('wrong');
  lockInput();
  showFeedback(data.message, 'late');
  
  // Show answer on card back
  document.getElementById('answer-reveal').textContent = `${data.answer} ⏳ Trop tard`;
  document.getElementById('card-inner').classList.add('flipped');

  // Stop timer visual
  const timerBar = document.getElementById('timer-bar');
  timerBar.classList.remove('running');

  // Client-driven progression
  setTimeout(() => {
    if (data.is_over) {
      socket.emit('request_game_over', { room_code: ROOM_CODE });
    } else {
      socket.emit('request_next_question', { room_code: ROOM_CODE });
    }
  }, 1200);
});

socket.on('wrong_answer', (data) => {
  console.log("Wrong answer event received:", data);
  if (typeof playSFX === 'function') playSFX('wrong');
  
  const input = document.getElementById('answer-input');
  if (input) {
    input.classList.add('wrong');
    gsap.to(input, { x: 10, duration: 0.1, repeat: 5, yoyo: true });
  }
  
  showFeedback(data.message, 'wrong');

  // Déverrouiller après un délai
  setTimeout(() => {
    console.log("Executing timeout unlock...");
    unlockInput();
  }, 1000);
});

socket.on('too_late', (data) => {
  if (typeof playSFX === 'function') playSFX('wrong');
  lockInput();
  showFeedback(`⏰ Trop tard ! ${data.answered_by} a déjà répondu.`, 'late');
});

socket.on('game_over', (data) => {
  // Store rankings for result page
  sessionStorage.setItem('rankings', JSON.stringify(data.rankings));
  sessionStorage.setItem('winner', data.winner);
  sessionStorage.setItem('is_solo', data.is_solo ? 'true' : 'false');
  sessionStorage.setItem('max_questions', data.max_questions || '10');
  window.location.href = '/result/' + data.room_code;
});

socket.on('player_joined', (data) => {
  renderScores(data.players, null);
});
