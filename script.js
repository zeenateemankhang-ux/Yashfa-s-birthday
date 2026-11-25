/* ==========================================================================
   YASHFA'S BIRTHDAY SURPRISE — script.js
   Edit the config below to personalize everything without touching the
   rest of the file.
   ========================================================================== */

const birthdayConfig = {
  name: "Yashfa",
  birthday: "26 November",
  photos: [
    { src: "assets/images/photo1.jpg", caption: "the day we couldn't stop laughing" },
    { src: "assets/images/photo2.jpg", caption: "best trip, worst directions" },
    { src: "assets/images/photo3.jpg", caption: "just an ordinary day made better" }
  ],
  music: "assets/audio/birthday-music.mp3"
};

/* ---------------- scene order & state ---------------- */
const SCENE_ORDER = ["intro", "greeting", "cake", "mystery", "message", "memories", "hug", "final"];
const STORAGE_KEY = "yashfaBirthdaySurpriseScene";

let isTransitioning = false;
let noDodgeCount = 0;

const sceneEls = {};
document.querySelectorAll(".scene").forEach(el => {
  sceneEls[el.dataset.scene] = el;
});

function getSavedScene() {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

function saveScene(name) {
  try {
    sessionStorage.setItem(STORAGE_KEY, name);
  } catch (e) { /* ignore */ }
}

function goToScene(name, opts = {}) {
  if (isTransitioning) return;
  if (!sceneEls[name]) return;

  const current = document.querySelector(".scene.active");
  isTransitioning = true;

  const finishSwitch = () => {
    if (current) {
      current.classList.remove("active", "leaving");
    }
    sceneEls[name].classList.add("active");
    saveScene(name);
    isTransitioning = false;
    if (opts.onEnter) opts.onEnter();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  };

  if (current && current !== sceneEls[name]) {
    current.classList.add("leaving");
    setTimeout(finishSwitch, 320);
  } else {
    finishSwitch();
  }
}

/* ---------------- generic "next" buttons ---------------- */
document.querySelectorAll("[data-next]").forEach(btn => {
  btn.addEventListener("click", () => {
    playSfx(sfxClick);
    spawnBurst(btn, 5);
    goToScene(btn.dataset.next, { onEnter: sceneEnterHooks[btn.dataset.next] });
  });
});

/* ---------------- SCENE 1: intro yes/no ---------------- */
const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");
const choiceRow = document.getElementById("choiceRow");
const tauntText = document.getElementById("tauntText");

yesBtn.addEventListener("click", () => {
  playSfx(sfxClick);
  spawnBurst(yesBtn, 10);
  goToScene("greeting");
});

function dodgeNo() {
  noDodgeCount++;
  const rowRect = choiceRow.getBoundingClientRect();
  const btnRect = noBtn.getBoundingClientRect();
  const maxX = Math.max(rowRect.width - btnRect.width - 8, 40);
  const maxY = 30;
  const randX = (Math.random() * 2 - 1) * maxX * 0.55;
  const randY = (Math.random() * 2 - 1) * maxY;
  noBtn.style.transform = `translate(${randX}px, ${randY}px)`;

  if (noDodgeCount >= 1) {
    tauntText.classList.add("show");
  }
}

noBtn.addEventListener("mouseenter", dodgeNo);
noBtn.addEventListener("touchstart", (e) => { e.preventDefault(); dodgeNo(); }, { passive: false });
noBtn.addEventListener("click", (e) => {
  e.preventDefault();
  dodgeNo();
});

/* ---------------- SCENE 3: gift open ---------------- */
const giftBox = document.getElementById("giftBox");
let giftOpened = false;

function openGift() {
  if (giftOpened) return;
  giftOpened = true;
  playSfx(sfxClick);

  giftBox.classList.add("shaking");
  setTimeout(() => {
    giftBox.classList.remove("shaking");
    giftBox.classList.add("opened");
    playSfx(sfxGift);
    burstConfettiAndHearts(28);

    setTimeout(() => {
      goToScene("message");
    }, 1100);
  }, 500);
}

giftBox.addEventListener("click", openGift);
giftBox.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    openGift();
  }
});

/* ---------------- SCENE 2.5: birthday cake / blow the candles ---------------- */
const cakeEl = document.getElementById("cakeEl");
const cakeCat = document.getElementById("cakeCat");
const tapBlowBtn = document.getElementById("tapBlowBtn");
const micBlowBtn = document.getElementById("micBlowBtn");
const micHint = document.getElementById("micHint");
const blowRow = document.getElementById("blowRow");
const cakeResult = document.getElementById("cakeResult");
let candlesBlown = false;
let micStream = null;

// Offer the mic option only if the browser actually supports it —
// the tap button is always available regardless, so there is never a dead end.
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  micBlowBtn.hidden = false;
}

function blowOutCandles() {
  if (candlesBlown) return;
  candlesBlown = true;
  playSfx(sfxGift);

  cakeEl.classList.add("blown");

  // smoke puffs, staggered to match each candle's extinguish delay
  document.querySelectorAll(".candle").forEach((candle, i) => {
    setTimeout(() => {
      const smoke = document.createElement("span");
      smoke.className = "smoke";
      candle.appendChild(smoke);
      setTimeout(() => smoke.remove(), 1200);
    }, 180 * i + 260);
  });

  micHint.hidden = true;
  blowRow.style.display = "none";
  stopMicListening();

  setTimeout(() => {
    cakeCat.classList.add("excited");
    burstConfettiAndHearts(22);
    spawnFloatingBalloon();
    spawnFloatingBalloon();
    playSfx(sfxCelebrate);
    cakeResult.classList.add("show");
  }, 750);
}

tapBlowBtn.addEventListener("click", () => {
  playSfx(sfxClick);
  blowOutCandles();
});

function stopMicListening() {
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
}

micBlowBtn.addEventListener("click", async () => {
  if (candlesBlown) return;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();
    const source = audioCtx.createMediaStreamSource(micStream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    micHint.hidden = false;
    micBlowBtn.disabled = true;

    const BLOW_THRESHOLD = 42;
    const LISTEN_MS = 6000;
    const startedAt = Date.now();

    function checkVolume() {
      if (candlesBlown) {
        stopMicListening();
        audioCtx.close();
        return;
      }
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
      if (avg > BLOW_THRESHOLD) {
        blowOutCandles();
        audioCtx.close();
        return;
      }
      if (Date.now() - startedAt > LISTEN_MS) {
        // gave it a fair shot — quietly step back and let the tap button take over
        micHint.hidden = true;
        micBlowBtn.disabled = false;
        stopMicListening();
        audioCtx.close();
        return;
      }
      requestAnimationFrame(checkVolume);
    }
    checkVolume();
  } catch (err) {
    // permission denied or unsupported — tap fallback is always right there
    micHint.hidden = true;
    micBlowBtn.disabled = false;
    micBlowBtn.hidden = true;
  }
});

function spawnFloatingBalloon() {
  const bit = document.createElement("span");
  bit.className = "floating-bit";
  bit.textContent = Math.random() < 0.5 ? "🎈" : "🎈";
  bit.style.position = "fixed";
  bit.style.left = (30 + Math.random() * 40) + "vw";
  bit.style.bottom = "10vh";
  const duration = 3.5 + Math.random();
  bit.style.animationDuration = duration + "s";
  bit.style.setProperty("--drift", (Math.random() * 60 - 30) + "px");
  bit.style.fontSize = (20 + Math.random() * 10) + "px";
  bit.style.zIndex = "55";
  document.body.appendChild(bit);
  setTimeout(() => bit.remove(), duration * 1000 + 150);
}

function resetCakeScene() {
  candlesBlown = false;
  stopMicListening();
  cakeEl.classList.remove("blown");
  cakeCat.classList.remove("excited");
  cakeResult.classList.remove("show");
  blowRow.style.display = "";
  micHint.hidden = true;
  micBlowBtn.disabled = false;
  document.querySelectorAll(".smoke").forEach(s => s.remove());
}

/* ---------------- SCENE 5: memories / polaroids ---------------- */
const polaroidCaption = document.getElementById("polaroidCaption");
document.querySelectorAll(".polaroid").forEach(p => {
  p.addEventListener("click", () => {
    document.querySelectorAll(".polaroid").forEach(other => {
      if (other !== p) other.classList.remove("active-photo");
    });
    const isActive = p.classList.toggle("active-photo");
    polaroidCaption.textContent = isActive
      ? (p.dataset.caption || "a memory worth keeping")
      : "tap a photo for a little memory";
    spawnBurst(p, 4);
  });
});

/* ---------------- SCENE 6: virtual hug ---------------- */
const hugMessage = document.getElementById("hugMessage");

function playHugAnimation() {
  const hugStage = document.getElementById("hugStage");
  hugStage.classList.remove("walking", "hugging");
  hugMessage.classList.remove("show");
  // trigger reflow so animation restarts cleanly
  void hugStage.offsetWidth;
  hugStage.classList.add("walking");
  setTimeout(() => {
    hugStage.classList.add("hugging");
    burstConfettiAndHearts(14, true);
  }, 1200);
  setTimeout(() => {
    hugMessage.classList.add("show");
  }, 2000);
}

/* ---------------- SCENE 7: final celebration ---------------- */
function celebrateFinal() {
  playSfx(sfxCelebrate);
  burstConfettiAndHearts(40);
  setTimeout(() => burstConfettiAndHearts(24), 500);
}

const replayBtn = document.getElementById("replayBtn");
replayBtn.addEventListener("click", () => {
  restartSurprise();
});

/* ---------------- scene-enter hooks ---------------- */
const sceneEnterHooks = {
  hug: playHugAnimation,
  final: celebrateFinal
};

/* ---------------- restart ---------------- */
const restartBtnEl = document.getElementById("restartBtn");
restartBtnEl.addEventListener("click", restartSurprise);

function restartSurprise() {
  if (isTransitioning) return;
  document.querySelectorAll(".polaroid").forEach(p => p.classList.remove("active-photo"));
  polaroidCaption.textContent = "tap a photo for a little memory";
  giftOpened = false;
  giftBox.classList.remove("opened", "shaking");
  resetCakeScene();
  noDodgeCount = 0;
  tauntText.classList.remove("show");
  noBtn.style.transform = "";
  document.getElementById("hugStage").classList.remove("walking", "hugging");
  hugMessage.classList.remove("show");

  try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
  goToScene("intro");
}

/* ---------------- restore session on load ---------------- */
(function initScene() {
  const saved = getSavedScene();
  if (saved && sceneEls[saved] && saved !== "intro") {
    goToScene(saved);
  }
})();

/* ---------------- music ---------------- */
const bgMusic = document.getElementById("bgMusic");
const sfxClick = document.getElementById("sfxClick");
const sfxGift = document.getElementById("sfxGift");
const sfxCelebrate = document.getElementById("sfxCelebrate");
const musicToggle = document.getElementById("musicToggle");
let musicPlaying = false;

// Mobile browsers require music to begin from a direct user action.
// Keep playback inside the Music button tap and synchronize its state.
bgMusic.preload = "auto";
bgMusic.setAttribute("playsinline", "");
bgMusic.addEventListener("play", () => {
  musicPlaying = true;
  musicToggle.classList.add("playing");
  musicToggle.setAttribute("aria-pressed", "true");
});
bgMusic.addEventListener("pause", () => {
  musicPlaying = false;
  musicToggle.classList.remove("playing");
  musicToggle.setAttribute("aria-pressed", "false");
});

musicToggle.setAttribute("aria-pressed", "false");
musicToggle.addEventListener("click", async () => {
  if (musicPlaying && !bgMusic.paused) {
    bgMusic.pause();
    return;
  }

  try {
    bgMusic.volume = 0.5;
    await bgMusic.play();
  } catch (error) {
    // The browser may block playback until the visitor taps Music again,
    // or the audio file may not have finished loading.
    musicPlaying = false;
    musicToggle.classList.remove("playing");
    musicToggle.setAttribute("aria-pressed", "false");
    console.warn("Birthday music could not start:", error);
  }
});

function playSfx(el) {
  if (!el) return;
  try {
    el.currentTime = 0;
    el.volume = 0.4;
    const p = el.play();
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* ignore missing sfx files */ }
}

/* ---------------- ambient floating hearts ---------------- */
const floatingBits = document.getElementById("floatingBits");
const AMBIENT_EMOJI = ["💗", "✨", "🌸"];

function spawnFloatingBit() {
  const bit = document.createElement("span");
  bit.className = "floating-bit";
  bit.textContent = AMBIENT_EMOJI[Math.floor(Math.random() * AMBIENT_EMOJI.length)];
  bit.style.left = Math.random() * 100 + "%";
  const duration = 7 + Math.random() * 5;
  bit.style.animationDuration = duration + "s";
  bit.style.setProperty("--drift", (Math.random() * 80 - 40) + "px");
  bit.style.fontSize = (14 + Math.random() * 12) + "px";
  floatingBits.appendChild(bit);
  setTimeout(() => bit.remove(), duration * 1000 + 200);
}
setInterval(spawnFloatingBit, 1400);
spawnFloatingBit();

/* ---------------- click-triggered bursts (hearts near a button) ---------------- */
function spawnBurst(anchorEl, count = 6) {
  const rect = anchorEl.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const bit = document.createElement("span");
    bit.className = "floating-bit";
    bit.textContent = ["💕", "💗", "✨", "⭐"][Math.floor(Math.random() * 4)];
    const startX = rect.left + rect.width / 2 + (Math.random() * 60 - 30);
    bit.style.left = startX + "px";
    bit.style.bottom = (window.innerHeight - rect.top) + "px";
    const duration = 1.6 + Math.random() * 1;
    bit.style.animationDuration = duration + "s";
    bit.style.setProperty("--drift", (Math.random() * 100 - 50) + "px");
    bit.style.fontSize = (14 + Math.random() * 10) + "px";
    document.body.appendChild(bit);
    bit.style.position = "fixed";
    setTimeout(() => bit.remove(), duration * 1000 + 100);
  }
}

/* ---------------- big confetti + heart celebration burst ---------------- */
function burstConfettiAndHearts(count = 24, gentle = false) {
  const colors = ["#E39AAC", "#8C3B4A", "#F7C9D3", "#FBE3D6", "#B75468"];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    const isHeart = Math.random() < 0.4;
    piece.className = "floating-bit confetti-piece";
    piece.style.position = "fixed";
    piece.style.top = "-20px";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.bottom = "auto";
    piece.style.zIndex = "60";
    const duration = (gentle ? 2.4 : 1.8) + Math.random() * 1.6;
    piece.style.setProperty("--drift", (Math.random() * 140 - 70) + "px");

    if (isHeart) {
      piece.textContent = "💗";
      piece.style.fontSize = (12 + Math.random() * 14) + "px";
      piece.style.animation = `confettiFall ${duration}s ease-in forwards`;
    } else {
      piece.style.width = "8px";
      piece.style.height = "12px";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.borderRadius = "2px";
      piece.style.display = "inline-block";
      piece.style.animation = `confettiFall ${duration}s ease-in forwards`;
    }
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), duration * 1000 + 150);
  }
}

/* keyframes for confetti fall added dynamically (keeps CSS file focused on layout) */
const styleTag = document.createElement("style");
styleTag.textContent = `
@keyframes confettiFall{
  0%{ transform: translateY(0) translateX(0) rotate(0deg); opacity:1; }
  100%{ transform: translateY(105vh) translateX(var(--drift,0px)) rotate(280deg); opacity:0.15; }
}`;
document.head.appendChild(styleTag);
