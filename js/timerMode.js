import { state, correctSound, wrongSound, gunSound, shotSound, explosionSound } from "./state.js";
import { dom, showCustomAlert, updateScoreDisplay, showCongrats } from "./ui.js";
// import { startGame } from "./game.js"; // Removed to avoid circular dependency
import { getTranslation } from "./i18n/i18n.js";
import * as utils from "./utils.js";

// --- Configuration ---
const SPAWN_INTERVAL_MS = 2000; // Time between word spawns
const PLANE_X = 100; // Fixed X position of the plane
const GAME_WIDTH = window.innerWidth;
const GAME_HEIGHT = window.innerHeight;
const WORD_SPEED_BASE = 1.5;
const PROJECTILE_SPEED = 15;

// --- Levenshtein Distance Utility ---
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

class ExplosionParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.element = document.createElement("div");
    this.element.classList.add("explosion-particle");
    this.element.style.backgroundColor = color;
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
    
    // Random velocity
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    this.life = 1.0;
    this.decay = Math.random() * 0.05 + 0.02;

    document.getElementById("timer-mode-container").appendChild(this.element);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
    
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;
    this.element.style.opacity = this.life;
    
    if (this.life <= 0) {
      this.destroy();
      return false; // Dead
    }
    return true; // Alive
  }

  destroy() {
    this.element.remove();
  }
}

class WindParticle {
  constructor() {
    this.x = GAME_WIDTH + Math.random() * 100;
    this.y = Math.random() * GAME_HEIGHT;
    this.speed = 15 + Math.random() * 10;
    this.length = 20 + Math.random() * 30;
    this.element = document.createElement("div");
    this.element.classList.add("wind-particle");
    this.element.style.width = `${this.length}px`;
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;
    document.getElementById("timer-mode-container").appendChild(this.element);
  }

  update() {
    this.x -= this.speed;
    this.element.style.left = `${this.x}px`;
    
    if (this.x < -this.length) {
      this.destroy();
      return false;
    }
    return true;
  }

  destroy() {
    this.element.remove();
  }
}

class TrailParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.element = document.createElement("div");
    this.element.classList.add("trail-particle");
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;
    document.getElementById("timer-mode-container").appendChild(this.element);
    this.opacity = 0.8;
  }

  update() {
    this.x -= 5; // Move left
    this.opacity -= 0.05;
    this.element.style.left = `${this.x}px`;
    this.element.style.opacity = this.opacity;
    
    if (this.opacity <= 0) {
      this.destroy();
      return false;
    }
    return true;
  }

  destroy() {
    this.element.remove();
  }
}

class Plane {
  constructor(element) {
    this.element = element;
    this.y = GAME_HEIGHT / 2;
    this.targetY = this.y;
    this.width = 60;
    this.height = 40;
    this.x = PLANE_X;
    this.element.style.left = `${PLANE_X}px`;
    this.currentTilt = 0;
    this.updatePosition();
  }

  setTargetY(y) {
    this.targetY = y;
  }

  update() {
    // Smooth movement towards targetY
    const dy = this.targetY - this.y;
    this.y += dy * 0.1; // Smooth easing
    
    // Balance/Rotation effect
    // Tilt based on direction, holding angle until close to target
    const distance = Math.abs(dy);
    let targetTilt = 0;
    
    if (distance > 5) { // Threshold to hold tilt
        targetTilt = Math.sign(dy) * 20; // Max tilt in direction of movement
    }
    
    // Smoothly interpolate current tilt towards target tilt
    this.currentTilt += (targetTilt - this.currentTilt) * 0.1;

    this.element.style.transform = `translateY(-50%) rotate(${this.currentTilt}deg)`;
    
    this.element.style.top = `${this.y}px`;

    // Spawn trail
    if (Math.random() < 0.5) {
        timerMode.trailParticles.push(new TrailParticle(this.x, this.y));
    }
  }

  updatePosition() {
    this.element.style.top = `${this.y}px`;
    this.element.style.transform = `translate(-50%, -50%)`;
  }
}

class FlyingWord {
  constructor(syllable, id) {
    this.syllable = syllable;
    this.id = id;
    this.x = GAME_WIDTH + 100; // Start off-screen
    // Ensure word spawns in safe vertical area (avoiding score panel top and input bar bottom)
    const safeTop = 120;
    const safeBottom = 120;
    const safeHeight = GAME_HEIGHT - safeTop - safeBottom;
    this.y = Math.random() * safeHeight + safeTop; 
    
    this.speed = WORD_SPEED_BASE; // Fixed base speed
    this.element = document.createElement("div");
    this.element.classList.add("flying-word");
    this.element.textContent = syllable.question;
    this.baseColor = utils.generateColor(syllable.question);
    this.element.style.color = this.baseColor;
    this.element.style.position = "absolute";
    this.element.style.whiteSpace = "nowrap";
    this.element.style.whiteSpace = "nowrap";
    this.isSolved = false;
    this.isDead = false;
    this.hitsReceived = 0;
    this.updatePosition();
    document.getElementById("timer-mode-container").appendChild(this.element);
  }

  update() {
    this.x -= this.speed;
    this.updatePosition();
    
    if (this.x < 0 && !this.isDead && !this.isSolved) {
        if (state.wrongSoundEnabled) {
            explosionSound.currentTime = 0;
            explosionSound.play().catch(() => {});
            
            wrongSound.volume = 0.4;
            wrongSound.currentTime = 0;
            setTimeout(() => {
                wrongSound.play().then(() => {
                    setTimeout(() => { wrongSound.volume = 1.0; }, 1000);
                }).catch(() => {});
            }, 300);
        }
        this.explode(false); 
        // Delay game over to let explosion play
        setTimeout(() => {
            timerMode.gameOver();
        }, 500);
        return true;
    }

    return this.x < -100 || this.isDead; // Return true if off-screen or dead
  }

  updatePosition() {
    const bounce = Math.sin(Date.now() / 500 + this.id) * 5;
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y + bounce}px`;
  }

  destroy() {
    this.element.remove();
  }
  
  explode(isSuccess = false) {
      if (isSuccess) {
          timerMode.score++;
          state.score = timerMode.score;
          updateScoreDisplay();
          if (state.correctSoundEnabled) {
              explosionSound.currentTime = 0;
              explosionSound.play().catch(() => {});

              correctSound.volume = 0.4;
              correctSound.currentTime = 0;
              setTimeout(() => {
                  correctSound.play().then(() => {
                      setTimeout(() => { correctSound.volume = 1.0; }, 1000);
                  }).catch(() => {});
              }, 300);
          }
      }

      // 8-bit explosion effect
      const rect = this.element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const color = this.element.style.color;

      for (let i = 0; i < 20; i++) {
          const p = new ExplosionParticle(centerX, centerY, color);
          timerMode.particles.push(p);
      }

      this.destroy();
      this.isDead = true;
  }
}

class Projectile {
  constructor(startX, startY, targetWord, char) {
    this.x = startX;
    this.y = startY;
    this.targetWord = targetWord;
    this.element = document.createElement("div");
    this.element.classList.add("projectile");
    this.element.textContent = char;
    this.element.style.position = "absolute";
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;
    document.getElementById("timer-mode-container").appendChild(this.element);
  }

  update() {
    if (!this.targetWord || !this.targetWord.element.isConnected) {
        this.destroy();
        return true; // Remove
    }

    const dx = this.targetWord.x - this.x;
    const dy = this.targetWord.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < PROJECTILE_SPEED) {
        // Hit
        this.destroy();
        this.targetWord.hitsReceived++;
        
        // Spawn one particle
        const particle = new ExplosionParticle(this.x, this.y, this.targetWord.element.style.color);
        timerMode.particles.push(particle);
        
        // Flash effect
        const flashColor = state.darkModeEnabled ? "#ffffff" : "#000000";
        this.targetWord.element.style.color = flashColor;
        setTimeout(() => {
            if (this.targetWord && this.targetWord.element.isConnected) {
                 this.targetWord.element.style.color = this.targetWord.baseColor;
            }
        }, 60);

        if (state.correctSoundEnabled) {
            shotSound.currentTime = 0;
            shotSound.play().catch(() => {});
        }
        
        if (this.targetWord.isSolved && this.targetWord.hitsReceived >= this.targetWord.syllable.answer.length) {
            this.targetWord.explode(true);
        }
        return true;
    }

    const vx = (dx / dist) * PROJECTILE_SPEED;
    const vy = (dy / dist) * PROJECTILE_SPEED;

    this.x += vx;
    this.y += vy;
    
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;
    return false;
  }

  destroy() {
    this.element.remove();
  }
}

export class TimerMode {
  constructor() {
    this.isActive = false;
    this.words = [];
    this.projectiles = [];
    this.particles = [];
    this.plane = null;
    this.lastSpawnTime = 0;
    this.animationFrameId = null;
    this.userInput = "";
    this.score = 0;
    this.container = null;
    this.lastSpawnedWord = null;
    this.lastRandomMoveTime = 0;
    this.wordIndex = 0;
    this.wordIndex = 0;
    this.windParticles = [];
    this.isPaused = false;
  }

  pause() {
    this.isPaused = true;
    cancelAnimationFrame(this.animationFrameId);
  }

  resume() {
    if (!this.isActive || !this.isPaused) return;
    this.isPaused = false;
    this.lastSpawnTime = Date.now(); // Reset to avoid immediate spawn burst
    this.lastRandomMoveTime = Date.now();
    this.loop();
  }

  loadGroup(index) {
      const start = index * 5; // GROUP_SIZE is 5
      // Ensure we don't go out of bounds of the scoped list
      if (start >= state.syllableList.length) {
          return false; // No more groups
      }
      state.currentGroup = state.syllableList.slice(start, start + 5);
      return state.currentGroup.length > 0;
  }

  start(restartCallback) {
    if (this.isActive) return;
    if (restartCallback) this.restartCallback = restartCallback;
    this.isActive = true;
    this.userInput = "";
    this.score = 0;
    state.score = 0; // Sync with global state
    updateScoreDisplay();
    this.words = [];
    this.projectiles = [];
    this.windParticles = [];
    this.trailParticles = [];
    
    // Initialize Group
    state.currentGroupIndex = 0;
    if (!this.loadGroup(state.currentGroupIndex)) {
        // Should not happen if list is not empty, but handle it
        this.gameOver();
        return;
    }

    // Setup UI
    this.container = document.getElementById("timer-mode-container");
    this.container.innerHTML = ""; // Clear previous
    this.container.style.display = "block";
    document.getElementById("game-area").style.display = "none"; // Hide normal game

    // Create Plane
    const planeEl = document.createElement("div");
    planeEl.id = "plane";
    this.container.appendChild(planeEl);
    this.plane = new Plane(planeEl);

    // Input Display
    this.inputDisplay = document.createElement("div");
    this.inputDisplay.id = "timer-mode-input";
    this.container.appendChild(this.inputDisplay);

    // Start Loop
    this.lastSpawnTime = Date.now();
    this.loop();
    
    // Bind Input
    document.addEventListener("keydown", this.handleInput);
    document.addEventListener("keypress", this.handleKeyPress);
  }

  stop() {
    this.isActive = false;
    this.score = 0;
    state.score = 0;
    updateScoreDisplay();
    cancelAnimationFrame(this.animationFrameId);
    if (this.container) {
        this.container.style.display = "none";
        this.container.innerHTML = "";
    }
    document.getElementById("game-area").style.display = "flex"; // Show normal game
    document.removeEventListener("keydown", this.handleInput);
    document.removeEventListener("keypress", this.handleKeyPress);
  }

  gameOver() {
      if (!this.isActive) return;
      this.stop();
      showCustomAlert(getTranslation("WRONG_ANSWER_RESTART")); // Reusing existing translation
      setTimeout(() => {
          startGame();
      }, 100);
  }

  handleInput = (e) => {
    if (!this.isActive) return;

    if (e.key === "Backspace") {
      this.userInput = this.userInput.slice(0, -1);
      this.inputDisplay.textContent = this.userInput;
      this.checkMatches();
    } else if (e.key === "Enter") {
      this.userInput = "";
      this.inputDisplay.textContent = this.userInput;
    }
  };

  handleKeyPress = (e) => {
    if (!this.isActive) return;
    if (e.key === "Enter") return; // Handled by keydown

    const char = e.key.toLowerCase();
    this.userInput += char;
    this.inputDisplay.textContent = this.userInput;
    this.fireProjectile(char);
    this.checkMatches();
  };

  fireProjectile(char) {
      // Find target word (closest match)
      const target = this.findBestMatch();
      if (target) {
          const p = new Projectile(this.plane.x + 20, this.plane.y, target, char);
          this.projectiles.push(p);
          if (state.correctSoundEnabled) {
              gunSound.volume = 0.1;
              gunSound.currentTime = 0;
              gunSound.play().catch(() => {});
          }
      }
  }

  findBestMatch() {
      if (this.words.length === 0) return null;
      // Filter out solved words to prevent targeting them again
      const activeWords = this.words.filter(w => !w.isSolved);
      if (activeWords.length === 0) return null;

      if (this.userInput.length === 0) return activeWords[0]; // Default to first if no input

      let bestWord = null;
      let minDist = Infinity;

      for (const word of activeWords) {
          const dist = levenshtein(this.userInput, word.syllable.answer.substring(0, this.userInput.length));
          if (dist < minDist) {
              minDist = dist;
              bestWord = word;
          }
      }
      return bestWord;
  }

  checkMatches() {
      const cleanedInput = this.userInput.trim();
      const match = this.words.find(w => !w.isSolved && (w.syllable.answer === this.userInput || w.syllable.answer === cleanedInput));
      if (match) {
          // Correct!
          match.isSolved = true;
          this.userInput = "";
          this.inputDisplay.textContent = "";
          match.explode(true); // Plays sound and updates score
          
          // Remove from current group
          const idx = state.currentGroup.findIndex(s => s.question === match.syllable.question);
          if (idx > -1) {
              state.currentGroup.splice(idx, 1);
          }
          
          // Check if group is empty (Level Complete)
          if (state.currentGroup.length === 0 && this.words.filter(w => !w.isSolved).length === 0) {
              // Advance to next group
              state.currentGroupIndex++;
              if (!this.loadGroup(state.currentGroupIndex)) {
                  // No more groups (fallback if scope logic fails or end of deck)
                  this.stop();
                  showCongrats(false, this.restartCallback); // Use the stored callback
              } else {
                  updateScoreDisplay(); // Update level indicator
              }
          }
      }
  }

  loop = () => {
    if (!this.isActive) return;

    // Check for open modals to pause
    if (this.isAnyModalOpen()) {
        if (!this.isPaused) {
            this.isPaused = true;
            this.pauseStartTime = Date.now();
        }
        this.animationFrameId = requestAnimationFrame(this.loop);
        return;
    }

    if (this.isPaused) {
        this.isPaused = false;
        const pauseDuration = Date.now() - this.pauseStartTime;
        this.lastSpawnTime += pauseDuration;
        this.lastRandomMoveTime += pauseDuration;
    }

    const now = Date.now();

    // Spawn
    // Adjust interval based on speed to keep density
    let val = Number(state.gameSpeed);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 10) val = 10;
    
    // Scaling: Speed 1 is 1.5x base, Speed 10 is ~3.0x base
    const speedMultiplier = 1 + (val - 1) * 0.11;
    
    // Cap minimum interval
    let currentInterval = SPAWN_INTERVAL_MS / (speedMultiplier * 1.0); 
    if (currentInterval < 300) currentInterval = 300;

    if (now - this.lastSpawnTime > currentInterval) {
      this.spawnWord();
      this.lastSpawnTime = now;
    }

    // Update Wind
    if (Math.random() < 0.3) { // Spawn chance
        this.windParticles.push(new WindParticle());
    }
    this.windParticles = this.windParticles.filter(p => p.update());

    // Update Trail
    this.trailParticles = this.trailParticles.filter(p => p.update());

    // Update Plane Target
    if (this.userInput.length > 0) {
        const targetWord = this.findBestMatch();
        if (targetWord) {
            this.plane.setTargetY(targetWord.y);
        }
    } else {
        // Random movement when idle
        if (now - this.lastRandomMoveTime > 1000) { // At least 1 second per direction
            // Softer movement: move relative to current position
            const range = 200; // Slightly larger range for longer duration
            let randomY = this.plane.y + (Math.random() - 0.5) * (range * 2);
            
            // Clamp to screen bounds (respecting safe zones)
            const safeTop = 120;
            const safeBottom = 120;
            randomY = Math.max(safeTop, Math.min(GAME_HEIGHT - safeBottom, randomY));
            
            this.plane.setTargetY(randomY);
            this.lastRandomMoveTime = now;
        }
    }

    // Update Entities
    this.plane.update();

    this.words = this.words.filter(word => {
        const offScreen = word.update();
        if (offScreen) {
            word.destroy();
            return false;
        }
        return true;
    });

    this.projectiles = this.projectiles.filter(p => {
        const hit = p.update();
        return !hit;
    });

    this.particles = this.particles.filter(p => p.update());

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  spawnWord() {
    if (!state.currentGroup || state.currentGroup.length === 0) return;

    // Pick a random word from the current group
    // But ensure it's not already on screen to avoid duplicates
    const availableSyllables = state.currentGroup.filter(s => 
        !this.words.some(w => w.syllable.question === s.question)
    );
    
    if (availableSyllables.length === 0) return; // All words in group are currently flying

    const randomIndex = Math.floor(Math.random() * availableSyllables.length);
    const syllable = availableSyllables[randomIndex];
    
    // Let's say speed 1 = base, speed 10 = 2.0x base.
    let val = Number(state.gameSpeed);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 10) val = 10;
    const safeGameSpeed = val;
    
    const speedMultiplier = 1 + (safeGameSpeed - 1) * 0.11;
    let speed = WORD_SPEED_BASE * speedMultiplier;

    this.lastSpawnedWord = syllable;
    
    const word = new FlyingWord(syllable, Date.now());
    word.speed = speed; // Override random speed from constructor
    this.words.push(word);
  }

  isAnyModalOpen() {
      // Check all known modals in dom
      const modals = [
          dom.deckModal,
          dom.settingsModal,
          dom.statsModal,
          dom.jsonEditorModal,
          dom.mergeModal,
          dom.customAlertModal,
          dom.customConfirmModal,
          dom.congratsModal,
          dom.editCardModal,
          dom.generalSettingsModal
      ];
      
      return modals.some(modal => modal && modal.style.display === "flex");
  }
}

export const timerMode = new TimerMode();
