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

export function generateColor(str) {
  const hash = hashCode(str);
  const hue = (hash * 137) % 360;
  const saturation = 85 + (hash % 15);
  const lightness = state.darkModeEnabled ? 60 + (hash % 16) : 25 + (hash % 10);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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
