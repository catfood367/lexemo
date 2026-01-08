import { state, GROUP_SIZE, GLOBAL_SETTINGS_KEY } from "./state.js";
import * as fsrs from "./fsrs.js";
import { setLanguage, getTranslation, detectBrowserLanguage } from "./i18n/i18n.js";

export const dom = {
  scoreText: document.getElementById("scoreText"),
  fileInput: document.getElementById("fileInput"),
  currentDeckNameSpan: document.getElementById("currentDeckName"),
  contextHintBox: document.getElementById("contextHintBox"),
  contextHintText: document.getElementById("contextHintText"),
  deckModal: document.getElementById("deckModal"),
  settingsModal: document.getElementById("settingsModal"),
  congratsModal: document.getElementById("congratsModal"),
  congratsMessage: document.getElementById("congratsMessage"),
  jsonEditorModal: document.getElementById("jsonEditorModal"),
  mergeModal: document.getElementById("mergeModal"),
  statsModal: document.getElementById("statsModal"),
  settingsBtn: document.getElementById("settingsBtn"),
  deckSelectBtn: document.getElementById("deckSelectBtn"),
  deckList: document.getElementById("deckList"),
  addDeckBtn: document.getElementById("addDeckBtn"),
  editJsonBtn: document.getElementById("editJsonBtn"),
  deckNameInput: document.getElementById("deckNameInput"),
  randomToggle: document.getElementById("randomToggle"),
  colorHintToggle: document.getElementById("colorHintToggle"),
  positionHintToggle: document.getElementById("positionHintToggle"),
  restartOnWrongToggle: document.getElementById("restartOnWrongToggle"),
  voiceSelect: document.getElementById("voiceSelect"),
  answerTipInput: document.getElementById("answerTipInput"),
  answerTipDecrement: document.getElementById("answerTipDecrement"),
  answerTipIncrement: document.getElementById("answerTipIncrement"),
  freeModeSettingsDiv: document.getElementById("freeModeSettingsDiv"),
  restartBtn: document.getElementById("restartBtn"),
  jsonEditorTextarea: document.getElementById("jsonEditorTextarea"),
  importJsonBtn: document.getElementById("importJsonBtn"),
  exportJsonBtn: document.getElementById("exportJsonBtn"),
  cancelJsonBtn: document.getElementById("cancelJsonBtn"),
  saveJsonBtn: document.getElementById("saveJsonBtn"),
  cancelMergeBtn: document.getElementById("cancelMergeBtn"),
  overwriteBtn: document.getElementById("overwriteBtn"),
  mergeBtn: document.getElementById("mergeBtn"),
  statsCloseBtn: document.getElementById("statsCloseBtn"),
  statsDeckName: document.getElementById("statsDeckName"),
  statsTotal: document.getElementById("statsTotal"),
  statsNew: document.getElementById("statsNew"),
  statsLearning: document.getElementById("statsLearning"),
  statsDue: document.getElementById("statsDue"),
  statsMature: document.getElementById("statsMature"),
  statsResetFsrsBtn: document.getElementById("statsResetFsrsBtn"),
  customAlertModal: document.getElementById("customAlertModal"),
  customAlertMessage: document.getElementById("customAlertMessage"),
  customAlertCloseBtn: document.getElementById("customAlertCloseBtn"),
  customConfirmModal: document.getElementById("customConfirmModal"),
  customConfirmMessage: document.getElementById("customConfirmMessage"),
  customConfirmOkBtn: document.getElementById("customConfirmOkBtn"),
  customConfirmCancelBtn: document.getElementById("customConfirmCancelBtn"),
  editCardModal: document.getElementById("editCardModal"),
  editCardQuestionInput: document.getElementById("editCardQuestionInput"),
  editCardAnswerInput: document.getElementById("editCardAnswerInput"),
  editCardHintInput: document.getElementById("editCardHintInput"),
  editCardCancelBtn: document.getElementById("editCardCancelBtn"),
  editCardSaveBtn: document.getElementById("editCardSaveBtn"),
  generalSettingsBtn: document.getElementById("generalSettingsBtn"),
  generalSettingsModal: document.getElementById("generalSettingsModal"),
  generalCorrectSoundToggle: document.getElementById(
    "generalCorrectSoundToggle",
  ),
  generalWrongSoundToggle: document.getElementById("generalWrongSoundToggle"),
  generalDarkModeToggle: document.getElementById("generalDarkModeToggle"),
  generalSettingsCancelBtn: document.getElementById("generalSettingsCancelBtn"),
  generalSettingsSaveBtn: document.getElementById("generalSettingsSaveBtn"),
  modeFreeToggle: document.getElementById("modeFreeToggle"),
  modeFsrsToggle: document.getElementById("modeFsrsToggle"),
  modePronunciationToggle: document.getElementById("modePronunciationToggle"),
  modeTimerToggle: document.getElementById("modeTimerToggle"),
  gameSpeedInput: document.getElementById("gameSpeedInput"),
  gameSpeedDecrement: document.getElementById("gameSpeedDecrement"),
  gameSpeedIncrement: document.getElementById("gameSpeedIncrement"),
  settingsModalActions: document.getElementById("settingsModalActions"),
  settingsCancelBtn: document.getElementById("settingsCancelBtn"),
  settingsSaveBtn: document.getElementById("settingsSaveBtn"),
  languageSelector: document.getElementById("languageSelector"),
  levelRangeShortcut: document.getElementById("levelRangeShortcut"),
  levelRangeSeparator: document.getElementById("levelRangeSeparator"),
};

export function showCustomAlert(message) {
  dom.customAlertMessage.textContent = message;
  dom.customAlertModal.style.display = "flex";
}

export function showCustomConfirm(message, onOk, onCancel) {
  dom.customConfirmMessage.textContent = message;
  state.currentConfirmOnOk = onOk;
  state.currentConfirmOnCancel = onCancel;
  dom.customConfirmModal.style.display = "flex";
}

function _applyGlobalSettings(settings) {
  state.correctSoundEnabled = settings.correctSoundEnabled;
  state.wrongSoundEnabled = settings.wrongSoundEnabled;
  state.darkModeEnabled = settings.darkModeEnabled;
  document.body.classList.toggle("dark-mode", state.darkModeEnabled);
}

export async function saveGlobalSettings() {
  const settings = {
    correctSoundEnabled: dom.generalCorrectSoundToggle.checked,
    wrongSoundEnabled: dom.generalWrongSoundToggle.checked,
    darkModeEnabled: dom.generalDarkModeToggle.checked,
    language: dom.languageSelector.value,
  };
  localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings));
  _applyGlobalSettings(settings);
  await setLanguage(settings.language);
}

export async function loadGlobalSettings() {
  const settingsJson = localStorage.getItem(GLOBAL_SETTINGS_KEY);
  const s = settingsJson
    ? JSON.parse(settingsJson)
    : {
        correctSoundEnabled: true,
        wrongSoundEnabled: true,
        darkModeEnabled: true,
        language: detectBrowserLanguage(),
      };

  dom.generalCorrectSoundToggle.checked = s.correctSoundEnabled;
  dom.generalWrongSoundToggle.checked = s.wrongSoundEnabled;
  dom.generalDarkModeToggle.checked = s.darkModeEnabled;
  dom.languageSelector.value = s.language || detectBrowserLanguage();

  _applyGlobalSettings(s);
  await setLanguage(s.language || detectBrowserLanguage());
}

function _createDeckCardElement(deck) {
  const card = document.createElement("div");
  card.className = "deck-card";
  card.innerHTML = `
        <div class="deck-card-main" data-deck-id="${deck.id}">
            ${deck.name}
        </div>
        <div class="deck-card-actions">
            <button class="deck-action-btn stats" data-deck-id="${deck.id}" title="Estatísticas">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/></svg>
            </button>
            <button class="deck-action-btn delete" data-deck-id="${deck.id}" title="Deletar Deck">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
        </div>
    `;
  return card;
}

export function renderDeckModal() {
  dom.deckList.innerHTML = "";
  state.allDecks.forEach((deck) => {
    const card = _createDeckCardElement(deck);
    dom.deckList.appendChild(card);
  });
  dom.deckList.appendChild(dom.addDeckBtn);
}

export function updateModeSettingsVisibility() {
  const isFree = dom.modeFreeToggle.checked;
  const isTimer = dom.modeTimerToggle.checked;

  dom.freeModeSettingsDiv.style.display = isFree || isTimer ? "block" : "none";
  
  const gameSpeedGroup = document.getElementById("gameSpeedGroup");
  if (gameSpeedGroup) gameSpeedGroup.style.display = isTimer ? "flex" : "none";

  // Helper to toggle visibility of a setting's parent label
  const toggleSetting = (element, show) => {
    const label = element.closest("label");
    if (label) label.style.display = show ? "flex" : "none";
  };

  if (isTimer) {
    // In Timer Mode, only show Random Order
    toggleSetting(dom.answerTipInput, false);
    toggleSetting(dom.colorHintToggle, false);
    toggleSetting(dom.positionHintToggle, false);
    toggleSetting(dom.restartOnWrongToggle, false);
    toggleSetting(dom.randomToggle, true);
  } else if (isFree) {
    // In Free Mode, show all
    toggleSetting(dom.answerTipInput, true);
    toggleSetting(dom.colorHintToggle, true);
    toggleSetting(dom.positionHintToggle, true);
    toggleSetting(dom.restartOnWrongToggle, true);
    toggleSetting(dom.randomToggle, true);
  }
}

function _getFsrsScoreText(stats) {
  const scoreLabel = getTranslation("SCORE");
  const reviewLabel = getTranslation("REVIEW");
  const newLabel = getTranslation("NEW");
  return `${scoreLabel}: ${state.score} | ${reviewLabel}: ${stats.dueCount + state.sessionReviewQueue.length} | ${newLabel}: ${stats.newCount}`;
}

function _getFreeModeScoreText() {
  const scoreLabel = getTranslation("SCORE");
  const levelLabel = getTranslation("LEVEL");

  const totalLevelsInScope = Math.ceil(state.syllableList.length / GROUP_SIZE);
  const currentLevelInScope = state.currentGroupIndex + 1;
  const maxOriginalLevel = Math.ceil(
    state.originalSyllableList.length / GROUP_SIZE,
  );
  const isFullScope =
    (state.levelScopeStart === 1 && state.levelScopeEnd === maxOriginalLevel) ||
    maxOriginalLevel === 0;

  if (isFullScope) {
    return `${scoreLabel}: ${state.score} | ${levelLabel}: ${currentLevelInScope} / ${totalLevelsInScope}`;
  } else {
    return `${scoreLabel}: ${state.score} | ${levelLabel}: ${currentLevelInScope} / ${state.levelScopeEnd}`;
  }
}

export function updateScoreDisplay() {
  const deck = state.allDecks.find((d) => d.id === state.currentDeckId);
  if (!deck) return;

  if (state.evaluativeModeEnabled) {
    const stats = fsrs.calculateDeckStats(deck.content);
    dom.scoreText.textContent = _getFsrsScoreText(stats);
  } else {
    dom.scoreText.textContent = _getFreeModeScoreText();
  }
  updateShortcutsVisibility();
}

export function updateShortcutsVisibility() {
  if (state.timerModeEnabled) {
    document.getElementById("shortcutsPanel").style.display = "none";
    return;
  } else {
    document.getElementById("shortcutsPanel").style.display = "flex";
  }

  const isFsrs = state.evaluativeModeEnabled;
  const display = isFsrs ? "none" : "flex";
  if (dom.levelRangeShortcut) dom.levelRangeShortcut.style.display = display;
  if (dom.levelRangeSeparator) dom.levelRangeSeparator.style.display = display;
}

function _handleCongratsClose(isFsrs, startGameCallback) {
  dom.congratsModal.style.display = "none";
  dom.restartBtn.onclick = null;

  if (isFsrs) {
    const deck = state.allDecks.find((d) => d.id === state.currentDeckId);
    if (deck) {
      deck.settings.evaluativeModeEnabled = false;
      deck.settings.pronunciationModeEnabled = false;
    }
  }
  startGameCallback();
}

export function showCongrats(isFsrs = false, startGameCallback) {
  if (isFsrs) {
    dom.congratsMessage.textContent = getTranslation("FSRS_NO_CARDS");
    state.evaluativeModeEnabled = false;
    state.pronunciationModeEnabled = false;
    updateShortcutsVisibility();
  } else {
    dom.congratsMessage.textContent = getTranslation("YOU_FINISHED_THE_GAME");
  }

  dom.congratsModal.style.display = "flex";

  const closeModal = () => _handleCongratsClose(isFsrs, startGameCallback);

  dom.restartBtn.onclick = closeModal;

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      closeModal();
      document.removeEventListener("keydown", onKeyDown);
    }
  };
  document.addEventListener("keydown", onKeyDown);
}

function _createParticleElement(element) {
  const rect = element.getBoundingClientRect();
  const particle = document.createElement("div");
  particle.style.position = "fixed";
  particle.style.left = rect.left + rect.width / 2 - 4 + "px";
  particle.style.top = rect.top + "px";
  particle.style.width = "10px";
  particle.style.height = "10px";
  particle.style.backgroundColor = element.style.color || "var(--primary)";
  particle.style.borderRadius = "0";
  particle.style.zIndex = "100000";
  particle.style.opacity = "1";
  particle.style.pointerEvents = "none";
  document.body.appendChild(particle);
  return particle;
}

function _animateParticleFall(particle, posY) {
  const speed = 15 + Math.random() * 2;
  function fall() {
    posY += speed;
    particle.style.top = posY + "px";
    particle.style.opacity = 1 - posY / window.innerHeight;
    if (posY > window.innerHeight) {
      particle.remove();
    } else {
      requestAnimationFrame(fall);
    }
  }
  requestAnimationFrame(fall);
}

export function createParticle(element) {
  const particle = _createParticleElement(element);
  _animateParticleFall(particle, particle.getBoundingClientRect().top);
}

export function isModalOpen() {
  return (
    dom.settingsModal.style.display === "flex" ||
    dom.deckModal.style.display === "flex" ||
    dom.jsonEditorModal.style.display === "flex" ||
    dom.mergeModal.style.display === "flex" ||
    dom.statsModal.style.display === "flex" ||
    dom.congratsModal.style.display === "flex" ||
    dom.generalSettingsModal.style.display === "flex" ||
    dom.customAlertModal.style.display === "flex" ||
    dom.customConfirmModal.style.display === "flex" ||
    dom.editCardModal.style.display === "flex"
  );
}

function setupModal(modalElement, onOutsideClick) {
  if (modalElement) {
    modalElement.addEventListener("click", (e) => {
      if (e.target === modalElement) {
        onOutsideClick();
      }
    });
  }
}

export function openEditCardModal(card) {
  dom.editCardQuestionInput.value = card.question;
  dom.editCardAnswerInput.value = card.answer;
  dom.editCardHintInput.value = card.hint || "";
  dom.editCardModal.style.display = "flex";
  dom.editCardQuestionInput.focus();
}

export function initModalCloseListeners() {
  setupModal(dom.deckModal, () => {
    dom.deckModal.style.display = "none";
    document.dispatchEvent(new CustomEvent("deckModalClosed"));
  });

  setupModal(dom.settingsModal, () => {
    dom.settingsModal.style.display = "none";
    state.pendingDeckContent = null;
  });

  setupModal(dom.jsonEditorModal, () => {
    state.pendingDeckContent = state.jsonEditorOriginalContent;
    dom.jsonEditorTextarea.classList.remove("invalid");
    dom.jsonEditorModal.style.display = "none";
  });

  setupModal(dom.generalSettingsModal, () => {
    dom.generalSettingsModal.style.display = "none";
  });

  setupModal(dom.statsModal, () => {
    dom.statsModal.style.display = "none";
  });

  setupModal(dom.congratsModal, () => {
    dom.restartBtn.click();
  });

  setupModal(dom.mergeModal, () => {
    dom.mergeModal.style.display = "none";
    state.importCache = { content: null, name: null };
  });

  setupModal(dom.customAlertModal, () => {
    dom.customAlertModal.style.display = "none";
  });

  setupModal(dom.editCardModal, () => {
    dom.editCardCancelBtn.click();
  });

  setupModal(dom.customConfirmModal, () => {
    dom.customConfirmCancelBtn.click();
  });
}
