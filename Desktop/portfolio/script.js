/* =========================================================
   MARIO PORTFOLIO — Interactive Engine
   ========================================================= */

(function () {
  'use strict';

  // ====== STATE ======
  // Sections track contains: 1-1(0), 1-2(1), 1-3(2), 1-4(3), END(4)
  // Start screen is a separate overlay, not in the track
  const state = {
    currentSection: -1,  // -1 = start screen, 0-3 = levels, 4 = end
    totalSections: 5,    // 5 sections in the track
    score: 0,
    coins: 0,
    gameStarted: false,
    isTransitioning: false,
    isMobile: window.innerWidth <= 768,
    soundEnabled: true,
    timeLeft: 400,
    timerInterval: null,
  };

  // ====== DOM REFS ======
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const dom = {
    startScreen: $('#start-screen'),
    startBtn: $('#start-btn'),
    gameWorld: $('#game-world'),
    sectionsTrack: $('#sections-track'),
    hud: $('#hud'),
    navDots: $('#nav-dots'),
    hudScore: $('#hud-score'),
    hudCoins: $('#hud-coins'),
    hudWorld: $('#hud-world'),
    hudTime: $('#hud-time'),
    mario: $('#mario-character'),
    mobileControls: $('#mobile-controls'),
    mobileLeft: $('#mobile-left'),
    mobileRight: $('#mobile-right'),
    restartBtn: $('#restart-btn'),
    tallyScore: $('#tally-score'),
    parallelFar: $('#parallax-far'),
    parallelNear: $('#parallax-near'),
    parallelHills: $('#parallax-hills'),
    hamburger: $('#hamburger'),
    mobileMenu: $('#mobile-menu'),
    tutorialOverlay: $('#tutorial-overlay'),
    tutorialDismiss: $('#tutorial-dismiss'),
  };

  const sections = $$('.level-section');

  // ====== WEB AUDIO — Synthesized Retro Sounds ======
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playTone(freq, duration, type = 'square', volume = 0.12) {
    if (!audioCtx || !state.soundEnabled) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function playNotes(notes) {
    if (!audioCtx || !state.soundEnabled) return;
    let t = audioCtx.currentTime;
    notes.forEach(([freq, dur, type = 'square', vol = 0.1]) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur * 0.8;
    });
  }

  const sounds = {
    coin: () => {
      playNotes([
        [988, 0.08],
        [1319, 0.28],
      ]);
    },
    jump: () => {
      if (!audioCtx || !state.soundEnabled) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    },
    powerup: () => {
      playNotes([
        [523, 0.08],
        [659, 0.08],
        [784, 0.08],
        [1047, 0.08],
        [1319, 0.08],
        [1568, 0.2],
      ]);
    },
    pipe: () => {
      playNotes([
        [200, 0.1, 'sawtooth'],
        [150, 0.15, 'sawtooth'],
      ]);
    },
    blockHit: () => {
      playNotes([
        [400, 0.05],
        [500, 0.05],
        [300, 0.08],
      ]);
    },
    gameStart: () => {
      playNotes([
        [660, 0.1],
        [660, 0.1],
        [0, 0.08],
        [660, 0.1],
        [0, 0.08],
        [523, 0.1],
        [660, 0.1],
        [784, 0.2],
      ]);
    },
    levelClear: () => {
      playNotes([
        [523, 0.1],
        [659, 0.1],
        [784, 0.1],
        [1047, 0.15],
        [880, 0.1],
        [1047, 0.3],
      ]);
    },
    oneUp: () => {
      playNotes([
        [330, 0.1],
        [494, 0.1],
        [660, 0.1],
        [523, 0.1],
        [659, 0.1],
        [784, 0.2],
      ]);
    },
  };

  // ====== SCORE SYSTEM ======
  function addScore(points, x, y) {
    state.score += points;
    updateHUD();
    showScorePopup(points, x, y);
  }

  function addCoin(x, y) {
    state.coins += 1;
    state.score += 200;
    updateHUD();
    sounds.coin();
    showScorePopup(200, x, y);
  }

  function showScorePopup(points, x, y) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = points;
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    document.body.appendChild(popup);
    popup.addEventListener('animationend', () => popup.remove());
  }

  function updateHUD() {
    if (dom.hudScore) dom.hudScore.textContent = String(state.score).padStart(6, '0');
    if (dom.hudCoins) dom.hudCoins.textContent = String(state.coins).padStart(2, '0');
    if (dom.tallyScore) dom.tallyScore.textContent = String(state.score).padStart(6, '0');
  }

  function updateWorldDisplay() {
    const worlds = ['1-1', '1-2', '1-3', '1-4', 'END'];
    if (dom.hudWorld) dom.hudWorld.textContent = worlds[state.currentSection] || '1-1';
  }

  // ====== TIMER ======
  function startTimer() {
    state.timeLeft = 400;
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      if (state.timeLeft > 0) {
        state.timeLeft--;
        if (dom.hudTime) dom.hudTime.textContent = String(state.timeLeft);
      }
    }, 1000);
  }

  // ====== NAVIGATION ENGINE ======
  function navigateToSection(index, playSound = true) {
    if (state.isTransitioning || index < 0 || index >= state.totalSections) return;
    if (index === state.currentSection) return;


    state.isTransitioning = true;

    if (playSound) {
      sounds.pipe();
    }

    const direction = index > state.currentSection ? 1 : -1;
    state.currentSection = index;

    // Slide sections track
    const offset = -index * 100;
    dom.sectionsTrack.style.transform = `translateX(${offset}vw)`;

    // Update parallax
    updateParallax(index);

    // Update HUD
    updateWorldDisplay();

    // Update nav dots
    updateNavDots();

    // Update Mario position
    updateMarioPosition();

    // Mark section in view
    sections.forEach((s, i) => {
      s.classList.toggle('in-view', i === index);
    });

    // Award points for visiting new sections
    addScore(100, window.innerWidth / 2, window.innerHeight / 2);

    // Reset timer
    startTimer();

    // End transition lock
    setTimeout(() => {
      state.isTransitioning = false;
    }, 700);

    // Play level clear sound on reaching end
    if (index === state.totalSections - 1) {
      setTimeout(() => sounds.levelClear(), 800);
    }
  }

  function nextSection() {
    navigateToSection(state.currentSection + 1);
  }

  function prevSection() {
    navigateToSection(state.currentSection - 1);
  }

  // ====== PARALLAX (smooth interpolation) ======
  let parallaxTarget = 0;
  let parallaxCurrent = 0;

  function updateParallax(sectionIndex) {
    parallaxTarget = sectionIndex / (state.totalSections - 1);
    if (!state._parallaxRunning) {
      state._parallaxRunning = true;
      animateParallax();
    }
  }

  function animateParallax() {
    parallaxCurrent += (parallaxTarget - parallaxCurrent) * 0.08;
    if (Math.abs(parallaxTarget - parallaxCurrent) < 0.001) {
      parallaxCurrent = parallaxTarget;
      state._parallaxRunning = false;
    }
    const p = parallaxCurrent;
    if (dom.parallelFar) {
      dom.parallelFar.style.transform = `translateX(${-p * 20}%) translateY(${p * 2}%)`;
    }
    if (dom.parallelNear) {
      dom.parallelNear.style.transform = `translateX(${-p * 40}%) translateY(${p * 3}%)`;
    }
    if (dom.parallelHills) {
      dom.parallelHills.style.transform = `translateX(${-p * 28}%) translateY(${p * 1.5}%)`;
    }
    if (state._parallaxRunning) {
      requestAnimationFrame(animateParallax);
    }
  }

  // ====== NAV DOTS ======
  function updateNavDots() {
    $$('.nav-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === state.currentSection);
    });
  }

  // ====== MARIO CHARACTER ======
  function updateMarioPosition() {
    if (!dom.mario || state.isMobile) return;
    const progress = state.currentSection / (state.totalSections - 1);
    const maxLeft = window.innerWidth - 60;
    const newLeft = 48 + progress * (maxLeft - 48);
    dom.mario.style.left = newLeft + 'px';

    // Walking animation
    dom.mario.classList.add('walking');
    setTimeout(() => dom.mario.classList.remove('walking'), 700);
  }

  // ====== START / RESTART ======
  function startGame() {
    initAudio();
    sounds.gameStart();

    state.gameStarted = true;
    state.currentSection = -1;

    // Hide start screen
    dom.startScreen.classList.add('hidden');

    // Show game world
    setTimeout(() => {
      dom.startScreen.style.display = 'none';
      dom.gameWorld.style.display = 'block';
      dom.gameWorld.classList.add('active');

      // Show HUD & nav
      dom.hud.classList.add('visible');
      dom.navDots.classList.add('visible');

      // Show Mario
      if (!state.isMobile && dom.mario) {
        dom.mario.classList.add('visible');
      }

      // Show mobile controls
      if (state.isMobile) {
        dom.mobileControls.style.display = 'flex';
      }

      // Navigate to first level
      setTimeout(() => {
        navigateToSection(0, false);
      }, 300);

      // Show tutorial on first visit
      setTimeout(() => {
        showTutorial();
      }, 1200);

      // Start timer
      startTimer();
    }, 600);
  }

  function restartGame() {
    state.score = 0;
    state.coins = 0;
    state.currentSection = -1;
    updateHUD();

    // Reset question blocks
    $$('.deco--question-block.hit').forEach(block => {
      block.classList.remove('hit');
    });

    // Reset coins
    $$('.deco--coin-float.collected').forEach(coin => {
      coin.classList.remove('collected');
      coin.style.display = '';
    });

    // Reset sections track
    dom.sectionsTrack.style.transform = 'translateX(0)';

    // Navigate to start
    navigateToSection(0, true);
  }

  // ====== EVENT HANDLERS ======

  // Start button
  if (dom.startBtn) {
    dom.startBtn.addEventListener('click', startGame);
  }

  // Restart button
  if (dom.restartBtn) {
    dom.restartBtn.addEventListener('click', () => {
      initAudio();
      sounds.oneUp();
      restartGame();
    });
  }

  // Nav dots
  $$('.nav-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      initAudio();
      const idx = parseInt(dot.dataset.section, 10);
      if (state.gameStarted) {
        navigateToSection(idx);
      }
    });
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    // Ignore if typing in an input field (like the chatbot)
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    if (!state.gameStarted) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startGame();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault();
        nextSection();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();
        prevSection();
        break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
        navigateToSection(parseInt(e.key, 10) - 1);
        break;
    }
  });

  // Scroll wheel → horizontal navigation
  let scrollAccumulator = 0;
  const SCROLL_THRESHOLD = 80;

  document.addEventListener('wheel', (e) => {
    if (!state.gameStarted) return;
    e.preventDefault();

    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    scrollAccumulator += delta;

    if (Math.abs(scrollAccumulator) > SCROLL_THRESHOLD) {
      if (scrollAccumulator > 0) {
        nextSection();
      } else {
        prevSection();
      }
      scrollAccumulator = 0;
    }

    // Decay accumulator
    clearTimeout(scrollAccumulator._timeout);
    scrollAccumulator._timeout = setTimeout(() => {
      scrollAccumulator = 0;
    }, 300);
  }, { passive: false });

  // Touch swipe with velocity detection
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!state.gameStarted) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    const elapsed = Date.now() - touchStartTime;
    const velocity = Math.abs(diffX) / elapsed;

    // Horizontal swipe: either fast swipe (velocity > 0.3) or long swipe (> 50px)
    if (Math.abs(diffX) > Math.abs(diffY) && (Math.abs(diffX) > 50 || velocity > 0.3)) {
      initAudio();
      if (diffX > 0) {
        nextSection();
      } else {
        prevSection();
      }
    }
  }, { passive: true });

  // Mobile controls
  if (dom.mobileLeft) {
    dom.mobileLeft.addEventListener('click', () => {
      initAudio();
      prevSection();
    });
  }
  if (dom.mobileRight) {
    dom.mobileRight.addEventListener('click', () => {
      initAudio();
      nextSection();
    });
  }

  // ====== HAMBURGER MENU ======
  function toggleHamburger() {
    const isOpen = dom.hamburger.classList.toggle('open');
    dom.mobileMenu.classList.toggle('open', isOpen);
  }

  function closeHamburger() {
    dom.hamburger.classList.remove('open');
    dom.mobileMenu.classList.remove('open');
  }

  if (dom.hamburger) {
    dom.hamburger.addEventListener('click', () => {
      initAudio();
      sounds.pipe();
      toggleHamburger();
    });
  }

  // Mobile menu items
  $$('.mobile-menu__item').forEach(item => {
    item.addEventListener('click', () => {
      initAudio();
      const idx = parseInt(item.dataset.section, 10);
      if (state.gameStarted) {
        navigateToSection(idx);
        // Update active state
        $$('.mobile-menu__item').forEach((m, i) => {
          m.classList.toggle('active', i === idx);
        });
      }
      closeHamburger();
    });
  });

  // ====== TUTORIAL OVERLAY ======
  function showTutorial() {
    if (localStorage.getItem('mario_tutorial_seen') === '1') return;
    if (dom.tutorialOverlay) {
      dom.tutorialOverlay.classList.add('active');
    }
  }

  function dismissTutorial() {
    if (dom.tutorialOverlay) {
      dom.tutorialOverlay.classList.remove('active');
    }
    localStorage.setItem('mario_tutorial_seen', '1');
  }

  if (dom.tutorialDismiss) {
    dom.tutorialDismiss.addEventListener('click', () => {
      initAudio();
      sounds.coin();
      dismissTutorial();
    });
  }

  // ====== INTERACTIVE ELEMENTS ======

  // Question blocks
  $$('.deco--question-block[data-interactive]').forEach(block => {
    block.addEventListener('click', (e) => {
      if (block.classList.contains('hit')) return;
      initAudio();
      block.classList.add('hit');
      sounds.blockHit();
      addCoin(e.clientX, e.clientY - 30);

      // Sometimes spawn a "powerup" text
      if (Math.random() > 0.5) {
        setTimeout(() => {
          addScore(1000, e.clientX, e.clientY - 60);
          sounds.powerup();
        }, 300);
      }
    });
  });

  // Floating coins
  $$('.deco--coin-float').forEach(coin => {
    coin.addEventListener('click', (e) => {
      if (coin.classList.contains('collected')) return;
      initAudio();
      coin.classList.add('collected');
      addCoin(e.clientX, e.clientY);
      setTimeout(() => {
        coin.style.display = 'none';
      }, 400);
    });
  });

  // Sound effects on buttons
  $$('[data-sound]').forEach(el => {
    el.addEventListener('click', (e) => {
      initAudio();
      const soundName = el.dataset.sound;
      if (sounds[soundName]) sounds[soundName]();
      addScore(50, e.clientX, e.clientY - 20);
    });
  });

  // Tech badge hover
  $$('.tech-badge').forEach(badge => {
    badge.addEventListener('mouseenter', () => {
      initAudio();
      playTone(880, 0.05, 'square', 0.05);
    });
  });

  // ====== RESIZE & ORIENTATION ======
  function handleResize() {
    state.isMobile = window.innerWidth <= 768;

    if (state.gameStarted) {
      if (state.isMobile) {
        dom.mobileControls.style.display = 'flex';
        if (dom.mario) dom.mario.classList.remove('visible');
      } else {
        dom.mobileControls.style.display = 'none';
        if (dom.mario) dom.mario.classList.add('visible');
        updateMarioPosition();
        closeHamburger();
      }
    }
  }

  window.addEventListener('resize', handleResize);

  // Orientation change
  if (screen.orientation) {
    screen.orientation.addEventListener('change', () => {
      handleResize();
      // Re-apply current section position
      if (state.gameStarted && state.currentSection >= 0) {
        const offset = -state.currentSection * 100;
        dom.sectionsTrack.style.transform = `translateX(${offset}vw)`;
      }
    });
  }

  // ====== INITIAL SETUP ======
  // Set first section as in-view
  if (sections.length > 0) {
    sections[0].classList.add('in-view');
  }

  // Preload font flash prevention
  document.fonts?.ready?.then(() => {
    document.body.style.opacity = '1';
  });

  // Keyboard shortcut hints (press 'M' to mute)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
      state.soundEnabled = !state.soundEnabled;
    }
  });

})();

function toggleChatbot() {
  const chatbot = document.getElementById('chatbot');
  const body = document.getElementById('chatbot-body');

  if (chatbot.style.display === 'none' || chatbot.style.display === '') {
    chatbot.style.display = 'flex';
    // Scroll to bottom when opening
    body.scrollTop = body.scrollHeight;
  } else {
    chatbot.style.display = 'none';
  }
}

function handleChatInput(event) {
  if (event.key === 'Enter') {
    sendMessage();
  }
}

function sendMessage() {
  const input = document.getElementById('chatbot-input');
  const message = input.value.trim();

  if (message) {
    addMessage(message, 'user');
    input.value = '';

    // Simulate AI response
    simulateResponse(message);
  }
}

function addMessage(text, sender) {
  const body = document.getElementById('chatbot-body');
  const messageDiv = document.createElement('div');
  messageDiv.className = `chatbot__message chatbot__message--${sender}`;
  messageDiv.textContent = text;

  body.appendChild(messageDiv);
  body.scrollTop = body.scrollHeight;
}

function simulateResponse(userMessage) {
  const body = document.getElementById('chatbot-body');

  // Add typing indicator
  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator';
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  body.appendChild(typingDiv);
  body.scrollTop = body.scrollHeight;

  // Call Vercel Serverless Function
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: userMessage })
  })
    .then(response => {
      if (!response.ok) throw new Error('Network error');
      return response.json();
    })
    .then(data => {
      // Remove typing indicator
      const indicator = document.getElementById('typing-indicator');
      if (indicator) indicator.remove();

      if (data.reply) {
        addMessage(data.reply, 'bot');
      } else {
        addMessage("I'm having a little trouble connecting to my database. Could you try asking again later?", 'bot');
      }
    })
    .catch(error => {
      console.error('Chat error:', error);
      const indicator = document.getElementById('typing-indicator');
      if (indicator) indicator.remove();
      addMessage("Oops! My circuits tripped. Please try again or email Aryan directly at aryan95yadav@gmail.com.", 'bot');
    });
}
