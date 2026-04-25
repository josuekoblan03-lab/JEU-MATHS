/**
 * ═══════════════════════════════════════
 * MathQuest — audio.js
 * Synthétiseur de bruitages (Web Audio API)
 * et gestion de la musique de fond.
 * ═══════════════════════════════════════
 */

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let isMuted = localStorage.getItem('mathquest_muted') === 'true';

// ── Background Music (BGM) ──
const bgm = new Audio('https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=electronic-future-beats-117997.mp3');
bgm.loop = true;
bgm.volume = 0.3;

function updateMuteState() {
  const btn = document.getElementById('mute-btn');
  if (btn) {
    btn.textContent = isMuted ? '🔇' : '🔊';
    btn.style.opacity = isMuted ? '0.5' : '1';
  }
  
  if (isMuted) {
    bgm.pause();
  } else {
    // Only attempt to play if context is allowed (browser policy)
    bgm.play().catch(e => console.log("L'utilisateur doit interagir avec la page pour lancer la musique."));
  }
}

function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem('mathquest_muted', isMuted);
  if (!isMuted && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  updateMuteState();
  playSFX('click');
}

// ── Web Audio API Synthesizer (SFX) ──
function playSFX(type) {
  if (isMuted) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  switch(type) {
    case 'click':
      // Bruit sec de clic
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;

    case 'correct':
      // Son joyeux (type pièce Mario)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.1); // E6
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
      gain.gain.setValueAtTime(0.5, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      break;

    case 'wrong':
      // Buzzer d'erreur
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.3);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;

    case 'time_up':
      // Alarme de temps écoulé
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.setValueAtTime(600, now + 0.1);
      osc.frequency.setValueAtTime(400, now + 0.2);
      osc.frequency.setValueAtTime(600, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
      break;

    case 'pop':
      // Apparition de la nouvelle question
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;

    case 'win':
      // Fanfare de victoire
      osc.type = 'square';
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      notes.forEach((freq, i) => {
        osc.frequency.setValueAtTime(freq, now + i * 0.15);
      });
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.setValueAtTime(0.3, now + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
      osc.start(now);
      osc.stop(now + 1.0);
      break;
  }
}

// Initialisation globale
document.addEventListener('DOMContentLoaded', () => {
  // Lancer la musique au premier clic sur l'écran (si non muté)
  document.body.addEventListener('click', () => {
    if (!isMuted && bgm.paused) {
      audioCtx.resume();
      bgm.play().catch(e => console.log(e));
    }
  }, { once: true });
  
  updateMuteState();

  // Ajouter automatiquement le son de clic sur tous les boutons
  document.body.addEventListener('click', (e) => {
    if (e.target.closest('.btn-3d') && !e.target.closest('#mute-btn')) {
      playSFX('click');
    }
  });
});
