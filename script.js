const textInput = document.getElementById("textInput");
const signOutput = document.getElementById("signOutput");
const count = document.getElementById("count");

const textTab = document.getElementById("textTab");
const signTab = document.getElementById("signTab");
const textMode = document.getElementById("textMode");
const signMode = document.getElementById("signMode");

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const output = document.getElementById("output");
const sentenceText = document.getElementById("sentence");
const startBtn = document.getElementById("startBtn");

canvas.width = 640;
canvas.height = 480;

let cameraStarted = false;
let cameraInstance = null;

let sentence = "";
let lastGesture = "";
let lastTime = 0;

// ---------- TEXT TO SIGN ----------
textInput.addEventListener("input", () => {
  count.textContent = `${textInput.value.length} / 200`;
  renderSigns(textInput.value);
});

function renderSigns(text) {
  signOutput.innerHTML = "";

  if (!text.trim()) {
    signOutput.innerHTML = "<p>👋 Signs will appear here</p>";
    return;
  }

  text.toUpperCase().split("").forEach(char => {
    if (char === " ") return;

    const div = document.createElement("div");
    div.className = "sign-letter";
    div.textContent = char;
    signOutput.appendChild(div);
  });
}

function clearText() {
  textInput.value = "";
  count.textContent = "0 / 200";
  renderSigns("");
}

function speakText() {
  if (!textInput.value.trim()) return;
  speechSynthesis.speak(new SpeechSynthesisUtterance(textInput.value));
}

// ---------- TABS ----------
textTab.onclick = () => {
  textTab.classList.add("active");
  signTab.classList.remove("active");
  textMode.classList.remove("hidden");
  signMode.classList.add("hidden");
};

signTab.onclick = () => {
  signTab.classList.add("active");
  textTab.classList.remove("active");
  signMode.classList.remove("hidden");
  textMode.classList.add("hidden");
};

// ---------- CAMERA ----------
function startCamera() {
  if (cameraStarted) return;
  cameraStarted = true;

  output.textContent = "Starting camera...";

  const hands = new Hands({
    locateFile: file =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });

  hands.onResults(results => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.image) {
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }

    if (results.multiHandLandmarks?.length > 0) {
      const lm = results.multiHandLandmarks[0];

      drawConnectors(ctx, lm, HAND_CONNECTIONS, {
        color: "#4ade80",
        lineWidth: 4
      });

      drawLandmarks(ctx, lm, {
        color: "#ffffff",
        lineWidth: 2
      });

      const gesture = detectGesture(lm);
      output.textContent = gesture;
      updateSentence(gesture);
    } else {
      output.textContent = "No hand detected";
    }
  });

  cameraInstance = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: 640,
    height: 480
  });

  cameraInstance.start();
}

function stopCamera() {
  if (!cameraStarted) return;

  cameraStarted = false;

  if (cameraInstance) {
    cameraInstance.stop();
    cameraInstance = null;
  }

  const stream = video.srcObject;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  output.textContent = "Camera stopped";
}

// ---------- GESTURE DETECTION ----------
function isFingerUp(lm, tip, pip) {
  return lm[tip].y < lm[pip].y;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function detectGesture(lm) {
  if (!lm || lm.length < 21) return "No hand detected";

  const thumbTip = lm[4];
  const indexTip = lm[8];
  const middleTip = lm[12];
  const ringTip = lm[16];
  const pinkyTip = lm[20];

  const indexUp = isFingerUp(lm, 8, 6);
  const middleUp = isFingerUp(lm, 12, 10);
  const ringUp = isFingerUp(lm, 16, 14);
  const pinkyUp = isFingerUp(lm, 20, 18);

  const thumbSide = Math.abs(lm[4].x - lm[3].x) > 0.05;
  const thumbUp = lm[4].y < lm[3].y;
  const thumbDown = lm[4].y > lm[3].y;

  const indexMiddleClose = distance(indexTip, middleTip) < 0.06;
  const thumbIndexClose = distance(thumbTip, indexTip) < 0.07;

  if (indexUp && middleUp && ringUp && pinkyUp && thumbSide) return "HELLO ✋";
  if (!indexUp && !middleUp && !ringUp && !pinkyUp) return "NO ✊";
  if (thumbUp && !indexUp) return "YES 👍";
  if (thumbDown && !indexUp) return "BAD 👎";
  if (indexUp && !middleUp) return "ONE ☝️";
  if (indexUp && middleUp && !ringUp) return "PEACE ✌️";
  if (indexUp && middleUp && ringUp && !pinkyUp) return "THREE 3️⃣";
  if (indexUp && middleUp && ringUp && pinkyUp) return "FIVE 🖐️";
  if (thumbIndexClose && middleUp && ringUp && pinkyUp) return "OK 👌";
  if (!indexUp && !middleUp && !ringUp && pinkyUp && thumbSide) return "CALL 🤙";
  if (indexUp && !middleUp && !ringUp && pinkyUp) return "ROCK 🤘";
  if (indexUp && middleUp && indexMiddleClose) return "CLOSE 🤞";
  if (indexUp && !middleUp && !ringUp && pinkyUp && thumbUp) return "LOVE 🤟";

  return "Unknown";
}

// ---------- SENTENCE ----------
function updateSentence(gesture) {
  if (gesture === "Unknown") return;

  const word = gesture.split(" ")[0];
  const now = Date.now();

  if (word !== lastGesture || now - lastTime > 2000) {
    sentence += word + " ";
    sentenceText.textContent = sentence;
    lastGesture = word;
    lastTime = now;
  }
}

function clearSentence() {
  sentence = "";
  lastGesture = "";
  lastTime = 0;
  sentenceText.textContent = "Detected signs will appear here...";
}

// ---------- ALPHABET ----------
const alphabetGrid = document.getElementById("alphabetGrid");
const searchInput = document.getElementById("searchLetter");

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function renderAlphabet(filter = "") {
  alphabetGrid.innerHTML = "";

  letters
    .filter(letter => letter.includes(filter.toUpperCase()))
    .forEach(letter => {
      const div = document.createElement("div");
      div.className = "letter-card";
      div.innerHTML = `<b>${letter}</b><span>${letter}</span>`;

      div.onclick = () => {
        textInput.value += letter;
        count.textContent = `${textInput.value.length} / 200`;
        renderSigns(textInput.value);
      };

      alphabetGrid.appendChild(div);
    });
}

searchInput.addEventListener("input", () => {
  renderAlphabet(searchInput.value);
});

renderAlphabet();
renderSigns("");