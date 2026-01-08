import { state } from "./state.js";
import phoneticMaps from "./phoneticMaps.js";
import { getTranslation } from "./i18n/i18n.js";

export function normalizePronunciation(word) {
  const phoneticMapToUse = phoneticMaps[state.recognition?.lang] ?? {};

  return word
    .normalize("NFKC")
    .toLowerCase()
    .split("")
    .map((c) => phoneticMapToUse[c] ?? c)
    .join("");
}

export function samePronunciation(targetWord, spokenText) {
  const normTarget = normalizePronunciation(targetWord);
  const normSpoken = normalizePronunciation(spokenText);

  if (normTarget.length <= 4) {
    const spokenWords = normSpoken.split(" ");
    if (spokenWords.some((word) => word === normTarget)) {
      return true;
    }
  }
  return normTarget === normSpoken;
}

export function hashCode(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
}

const NEON_PALETTE = [
  "hsl(0, 100%, 60%)",   // Red
  "hsl(15, 100%, 60%)",  // Red-Orange
  "hsl(30, 100%, 60%)",  // Orange
  "hsl(45, 100%, 60%)",  // Gold
  "hsl(60, 100%, 60%)",  // Yellow
  "hsl(75, 100%, 60%)",  // Lime-Yellow
  "hsl(90, 100%, 60%)",  // Lime
  "hsl(105, 100%, 60%)", // Green-Lime
  "hsl(120, 100%, 60%)", // Green
  "hsl(135, 100%, 60%)", // Green-Cyan
  "hsl(150, 100%, 60%)", // Spring Green
  "hsl(165, 100%, 60%)", // Cyan-Green
  "hsl(180, 100%, 60%)", // Cyan
  "hsl(195, 100%, 60%)", // Sky Blue
  "hsl(210, 100%, 60%)", // Dodger Blue
  "hsl(225, 100%, 60%)", // Blue
  "hsl(240, 100%, 60%)", // Blue-Indigo
  "hsl(255, 100%, 60%)", // Indigo
  "hsl(270, 100%, 60%)", // Purple
  "hsl(285, 100%, 60%)", // Purple-Magenta
  "hsl(300, 100%, 60%)", // Magenta
  "hsl(315, 100%, 60%)", // Pink
  "hsl(330, 100%, 60%)", // Deep Pink
  "hsl(345, 100%, 60%)", // Red-Pink
  "hsl(0, 100%, 75%)",   // Light Red
  "hsl(60, 100%, 75%)",  // Light Yellow
  "hsl(120, 100%, 75%)", // Light Green
  "hsl(180, 100%, 75%)", // Light Cyan
  "hsl(240, 100%, 75%)", // Light Blue
  "hsl(300, 100%, 75%)"  // Light Magenta
];

const NEON_PALETTE_LIGHT = [
  "hsl(0, 100%, 40%)",   // Dark Red
  "hsl(15, 100%, 40%)",  // Dark Red-Orange
  "hsl(30, 100%, 40%)",  // Dark Orange
  "hsl(45, 100%, 35%)",  // Dark Gold
  "hsl(60, 100%, 30%)",  // Dark Yellow (needs to be darker to be visible)
  "hsl(75, 100%, 35%)",  // Dark Lime-Yellow
  "hsl(90, 100%, 35%)",  // Dark Lime
  "hsl(105, 100%, 35%)", // Dark Green-Lime
  "hsl(120, 100%, 35%)", // Dark Green
  "hsl(135, 100%, 35%)", // Dark Green-Cyan
  "hsl(150, 100%, 35%)", // Dark Spring Green
  "hsl(165, 100%, 35%)", // Dark Cyan-Green
  "hsl(180, 100%, 35%)", // Dark Cyan
  "hsl(195, 100%, 40%)", // Dark Sky Blue
  "hsl(210, 100%, 40%)", // Dark Dodger Blue
  "hsl(225, 100%, 40%)", // Dark Blue
  "hsl(240, 100%, 40%)", // Dark Blue-Indigo
  "hsl(255, 100%, 40%)", // Dark Indigo
  "hsl(270, 100%, 40%)", // Dark Purple
  "hsl(285, 100%, 40%)", // Dark Purple-Magenta
  "hsl(300, 100%, 40%)", // Dark Magenta
  "hsl(315, 100%, 40%)", // Dark Pink
  "hsl(330, 100%, 40%)", // Dark Deep Pink
  "hsl(345, 100%, 40%)"  // Dark Red-Pink
];

export function generateColor(str) {
  const hash = hashCode(str);
  // Use the hash to pick a color from the curated palette
  const palette = state.darkModeEnabled ? NEON_PALETTE : NEON_PALETTE_LIGHT;
  const index = Math.abs(hash) % palette.length;
  return palette[index];
}

function _getElementDimensions(str) {
  const tempEl = document.createElement("div");
  tempEl.classList.add("syllable");
  tempEl.textContent = str;
  tempEl.style.visibility = "hidden";
  tempEl.style.position = "absolute";
  document.body.appendChild(tempEl);

  const elWidth = tempEl.offsetWidth;
  const elHeight = tempEl.offsetHeight;
  document.body.removeChild(tempEl);
  return { elWidth, elHeight };
}

export function generatePosition(str) {
  const hash = hashCode(str);
  const marginTop = 120; // Increased to avoid score panel
  const marginBottom = 180; // Increased to avoid input bar
  const marginLeft = 100;
  const marginRight = 100;

  const { elWidth, elHeight } = _getElementDimensions(str);

  const maxX = window.innerWidth - marginRight - elWidth;
  const maxY = window.innerHeight - marginBottom - elHeight;
  const minX = marginLeft;
  const minY = marginTop;

  const rangeX = Math.max(1, maxX - minX + 1);
  const rangeY = Math.max(1, maxY - minY + 1);

  let x = minX + (Math.abs(hash) % rangeX);
  let y = minY + (Math.abs(hash >> 8) % rangeY);

  x = Math.min(Math.max(x, minX), maxX);
  y = Math.min(Math.max(y, minY), maxY);

  return { x, y };
}

export function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function prettyPrintJson(jsonString) {
  try {
    const obj = JSON.parse(jsonString);
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return jsonString;
  }
}

function _cleanCard(card) {
  const q = (card.question || "").trim().toLowerCase();
  const a = (card.answer || "").trim().toLowerCase();
  if (q && a) {
    return {
      question: q,
      answer: a,
      hint: (card.hint || "").trim(),
    };
  }
  return null;
}

export function cleanJsonContent(contentArray) {
  return contentArray.map(_cleanCard).filter((item) => item !== null);
}

function _createCardKey(card) {
  const q = (card.question || "").trim().toLowerCase();
  const a = (card.answer || "").trim().toLowerCase();
  return q && a ? `${q}::${a}` : null;
}

export function deduplicateCards(cards, showAlert) {
  const qaKeys = new Set();
  let hasDuplicates = false;

  const filtered = cards.filter((card) => {
    const key = _createCardKey(card);
    if (!key) return false;

    if (qaKeys.has(key)) {
      hasDuplicates = true;
      return false;
    }
    qaKeys.add(key);
    return true;
  });

  if (hasDuplicates) {
    showAlert(getTranslation("DUPLICATE_CARDS_REMOVED"));
  }
  return filtered;
}
