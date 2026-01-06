import {
  state,
  LAST_OPENED_DECK_ID,
  DECK_STORAGE_KEY,
  GROUP_SIZE,
} from "./state.js";
import * as utils from "./utils.js";
import * as fsrs from "./fsrs.js";
import {
  dom,
  renderDeckModal,
  showCustomAlert,
  showCustomConfirm,
  updateModeSettingsVisibility,
} from "./ui.js";
import { startGame } from "./game.js";
import { selectVoice, stopRecognition } from "./speech.js";
import { getTranslation } from "./i18n/i18n.js";

export function loadDecks() {
  const decksJson = localStorage.getItem(DECK_STORAGE_KEY);
  state.allDecks = decksJson ? JSON.parse(decksJson) : [];
}

export function saveDecks() {
  localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(state.allDecks));
}

function _applyVoiceSetting(voiceIndex, onCompleteCallback) {
  setTimeout(() => {
    if (voiceIndex && voiceIndex !== "none") {
      dom.voiceSelect.value = voiceIndex;
      if (dom.voiceSelect.value !== voiceIndex) {
        dom.voiceSelect.value = "none";
      }
    } else {
      dom.voiceSelect.value = "none";
    }

    selectVoice();

    if (state.recognition && state.selectedVoice) {
      state.recognition.lang = state.selectedVoice.lang;
    }

    if (onCompleteCallback) onCompleteCallback();
  }, 200);
}

export function applyDeckSettingsToGame(settings, onCompleteCallback) {
  state.randomToggleEnabled = settings.randomToggleEnabled ?? false;
  state.colorHintEnabled = settings.colorHintEnabled ?? true;
  state.positionHintEnabled = settings.positionHintEnabled ?? true;
  state.answerTipLetters = settings.answerTipLetters ?? 0;
  state.restartOnWrongEnabled = settings.restartOnWrongEnabled ?? false;
  state.evaluativeModeEnabled = settings.evaluativeModeEnabled ?? false;
  state.pronunciationModeEnabled = settings.pronunciationModeEnabled ?? false;

  if (!state.pronunciationModeEnabled) {
    stopRecognition();
  }

  _applyVoiceSetting(settings.voiceIndex, onCompleteCallback);
}

export function selectDeck(deckId) {
  const selectedDeck = state.allDecks.find((d) => d.id === deckId);
  if (!selectedDeck) return;

  if (!selectedDeck.content || selectedDeck.content.length === 0) {
    showCustomAlert(getTranslation("DECK_NO_CONTENT"));
    return;
  }

  state.currentDeckId = deckId;
  localStorage.setItem(LAST_OPENED_DECK_ID, deckId);

  state.originalSyllableList = [...selectedDeck.content];
  state.syllableList = [...selectedDeck.content];

  state.levelScopeStart = 1;
  const maxLevel = Math.ceil(state.originalSyllableList.length / GROUP_SIZE);
  state.levelScopeEnd = maxLevel > 0 ? maxLevel : 1;

  applyDeckSettingsToGame(selectedDeck.settings, startGame);

  dom.currentDeckNameSpan.textContent = selectedDeck.name;
  dom.currentDeckNameSpan.removeAttribute("data-i18n");
  dom.deckModal.style.display = "none";
}

function _updateStatsUI(stats, deckName) {
  dom.statsDeckName.textContent = `${getTranslation("STATISTICS")}: ${deckName}`;
  dom.statsTotal.textContent = stats.total;
  dom.statsNew.textContent = stats.newCount;
  dom.statsLearning.textContent = stats.learningCount;
  dom.statsDue.textContent = stats.dueCount;
  dom.statsMature.textContent = stats.matureCount;
}

export function showDeckStats(deckId) {
  const deck = state.allDecks.find((d) => d.id === deckId);
  if (!deck) return;

  state.currentDeckStatsId = deckId;
  const stats = fsrs.calculateDeckStats(deck.content);
  _updateStatsUI(stats, deck.name);
  dom.statsModal.style.display = "flex";
}

function _removeDeckFromState(deckId) {
  state.allDecks = state.allDecks.filter((d) => d.id !== deckId);
  saveDecks();
  renderDeckModal();
}

function _resetCurrentDeck(deckId) {
  if (deckId === state.currentDeckId) {
    state.currentDeckId = null;
    dom.currentDeckNameSpan.setAttribute("data-i18n", "NO_DECK");
    dom.currentDeckNameSpan.textContent = getTranslation("NO_DECK");
    if (state.currentSyllableElement) state.currentSyllableElement.remove();
    dom.contextHintBox.style.display = "none";
  }
  if (deckId === localStorage.getItem(LAST_OPENED_DECK_ID)) {
    localStorage.removeItem(LAST_OPENED_DECK_ID);
  }
}

export function deleteDeck(deckId) {
  const deck = state.allDecks.find((d) => d.id === deckId);
  if (!deck) return;

  showCustomConfirm(
    getTranslation("DELETE_DECK_CONFIRMATION").replace("{0}", deck.name),
    () => {
      _removeDeckFromState(deckId);
      _resetCurrentDeck(deckId);
    },
  );
}

export function getDefaultSettings() {
  return {
    randomToggleEnabled: false,
    colorHintEnabled: true,
    positionHintEnabled: true,
    answerTipLetters: 0,
    restartOnWrongEnabled: false,
    evaluativeModeEnabled: false,
    pronunciationModeEnabled: false,
    voiceIndex: "none",
  };
}

export function applySettingsToModalUI(settings) {
  const s = settings || getDefaultSettings();

  dom.randomToggle.checked = s.randomToggleEnabled;
  dom.colorHintToggle.checked = s.colorHintEnabled;
  dom.positionHintToggle.checked = s.positionHintEnabled;
  dom.restartOnWrongToggle.checked = s.restartOnWrongEnabled;
  dom.answerTipInput.value = s.answerTipLetters;

  const voicesLoaded = dom.voiceSelect.options.length > 1;
  let pMode = s.pronunciationModeEnabled;

  if (!voicesLoaded) {
    pMode = false;
  }

  dom.modeFsrsToggle.checked = s.evaluativeModeEnabled;
  dom.modePronunciationToggle.checked = pMode;
  dom.modeFreeToggle.checked = !s.evaluativeModeEnabled && !pMode;

  updateModeSettingsVisibility();

  setTimeout(() => {
    dom.voiceSelect.value = s.voiceIndex;
    if (!dom.voiceSelect.value && dom.voiceSelect.options.length > 0) {
      dom.voiceSelect.value = "none";
    }

    const isVoiceSelected = dom.voiceSelect.value !== "none";
    dom.modePronunciationToggle.disabled = !isVoiceSelected;

    let pModeDelayed = s.pronunciationModeEnabled;
    if (!isVoiceSelected) {
      pModeDelayed = false;
    }

    dom.modePronunciationToggle.checked = pModeDelayed;
    dom.modeFreeToggle.checked = !s.evaluativeModeEnabled && !pModeDelayed;

    updateModeSettingsVisibility();
  }, 200);
}

function readSettingsFromUI() {
  return {
    randomToggleEnabled: dom.randomToggle.checked,
    colorHintEnabled: dom.colorHintToggle.checked,
    positionHintEnabled: dom.positionHintToggle.checked,
    answerTipLetters: parseInt(dom.answerTipInput.value) || 0,
    restartOnWrongEnabled: dom.restartOnWrongToggle.checked,
    evaluativeModeEnabled: dom.modeFsrsToggle.checked,
    pronunciationModeEnabled: dom.modePronunciationToggle.checked,
    voiceIndex: dom.voiceSelect.value,
  };
}

function _openEditModal(deck) {
  state.editModeDeckId = deck.id;
  dom.deckNameInput.value = deck.name;
  state.pendingDeckContent = deck.content ? JSON.stringify(deck.content) : null;
  applySettingsToModalUI(deck.settings);
  dom.settingsSaveBtn.textContent = getTranslation("SAVE_CHANGES");
}

function _openCreateModal() {
  state.editModeDeckId = null;
  dom.deckNameInput.value = "";
  state.pendingDeckContent = null;
  applySettingsToModalUI(getDefaultSettings());
  dom.settingsSaveBtn.textContent = getTranslation("CREATE_DECK");
}

export function openSettingsModal(deckId = null) {
  if (deckId) {
    const deck = state.allDecks.find((d) => d.id === deckId);
    if (deck) _openEditModal(deck);
  } else {
    _openCreateModal();
  }
  dom.settingsModal.style.display = "flex";
}

function _validateDeckName(deckName) {
  if (!deckName) {
    showCustomAlert(getTranslation("DECK_MISSING_NAME"));
    return false;
  }
  return true;
}

function _parsePendingContent() {
  try {
    const content = state.pendingDeckContent
      ? JSON.parse(state.pendingDeckContent)
      : [];
    if (!Array.isArray(content))
      throw new Error(
        getTranslation("INVALID_JSON_FORMAT_ERROR").replace("\n\nError: ", ""),
      );
    return content;
  } catch (e) {
    showCustomAlert(getTranslation("ERROR_SAVING_INVALID_JSON"));
    return null;
  }
}

function _mergeFsrsData(newContentBase, oldContent) {
  const oldCardMap = new Map();
  oldContent.forEach((card) => {
    const q = (card.question || "").trim().toLowerCase();
    const a = (card.answer || "").trim().toLowerCase();
    const key = `${q}::${a}`;
    if (q && a) oldCardMap.set(key, card);
  });

  return newContentBase.map((newCard) => {
    const q = (newCard.question || "").trim().toLowerCase();
    const a = (newCard.answer || "").trim().toLowerCase();
    const key = `${q}::${a}`;
    const matchedOldCard = oldCardMap.get(key);

    if (matchedOldCard) {
      matchedOldCard.hint = newCard.hint || "";
      matchedOldCard.question = q;
      matchedOldCard.answer = a;
      return matchedOldCard;
    }
    return {
      question: q,
      answer: a,
      hint: newCard.hint || "",
      s: 0.1,
      d: 0.5,
      lastReview: null,
      dueDate: null,
    };
  });
}

function _updateExistingDeck(deck, deckName, settings, newContentBase) {
  const finalContent = _mergeFsrsData(newContentBase, deck.content || []);
  deck.name = deckName;
  deck.settings = settings;
  deck.content = finalContent;
}

function _createNewDeck(deckName, settings, newContentBase) {
  if (newContentBase.length === 0) {
    showCustomAlert(getTranslation("DECK_MISSING_JSON_CONTENT"));
    return false;
  }

  const newContentWithFSRS = newContentBase.map((card) => ({
    question: (card.question || "").trim().toLowerCase(),
    answer: (card.answer || "").trim().toLowerCase(),
    hint: card.hint || "",
    s: 0.1,
    d: 0.5,
    lastReview: null,
    dueDate: null,
  }));

  const newDeck = {
    id: "deck_" + Date.now(),
    name: deckName,
    content: newContentWithFSRS,
    settings: settings,
  };
  state.allDecks.push(newDeck);
  return true;
}

function _finalizeDeckSave() {
  saveDecks();
  renderDeckModal();
  dom.settingsModal.style.display = "none";

  if (state.editModeDeckId && state.editModeDeckId === state.currentDeckId) {
    const updatedDeck = state.allDecks.find(
      (d) => d.id === state.currentDeckId,
    );
    state.syllableList = updatedDeck.content;

    applyDeckSettingsToGame(updatedDeck.settings, startGame);

    dom.currentDeckNameSpan.textContent = updatedDeck.name;
  }
}

export function saveDeckChanges() {
  const deckName = dom.deckNameInput.value.trim();
  if (!_validateDeckName(deckName)) return;

  const settings = readSettingsFromUI();
  let newContentBase = _parsePendingContent();
  if (newContentBase === null) return;

  newContentBase = utils.deduplicateCards(newContentBase, showCustomAlert);

  if (state.editModeDeckId) {
    const deck = state.allDecks.find((d) => d.id === state.editModeDeckId);
    if (!deck) return;
    _updateExistingDeck(deck, deckName, settings, newContentBase);
  } else {
    if (!_createNewDeck(deckName, settings, newContentBase)) return;
  }

  _finalizeDeckSave();
}

function saveJsonChanges() {
  const content = dom.jsonEditorTextarea.value;
  if (!content.trim()) {
    state.pendingDeckContent = "[]";
    return true;
  }

  try {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      throw new Error(
        getTranslation("INVALID_JSON_FORMAT_ERROR").replace("\n\nError: ", ""),
      );
    }

    const cleanedData = utils.cleanJsonContent(data);
    state.pendingDeckContent = JSON.stringify(cleanedData);
    dom.jsonEditorTextarea.classList.remove("invalid");
    return true;
  } catch (e) {
    dom.jsonEditorTextarea.classList.add("invalid");
    showCustomAlert(getTranslation("INVALID_JSON_FORMAT_ERROR") + e.message);
    return false;
  }
}

function _handleEditJsonClick() {
  const placeholderJson = `[
    {
        "question": "cachorro",
        "answer": "dog"
    },
    {
        "question": "gato",
        "answer": "cat",
        "hint": "it meows!"
    }
]`;
  state.jsonEditorOriginalContent = state.pendingDeckContent;
  let contentToDisplay = placeholderJson;

  if (state.pendingDeckContent && state.pendingDeckContent !== "[]") {
    try {
      const contentArray = JSON.parse(state.pendingDeckContent);
      const cleanedContent = utils.cleanJsonContent(contentArray);
      contentToDisplay = utils.prettyPrintJson(JSON.stringify(cleanedContent));
    } catch (e) {
      contentToDisplay = state.pendingDeckContent;
    }
  }

  dom.jsonEditorTextarea.value = contentToDisplay;
  dom.jsonEditorTextarea.classList.remove("invalid");
  dom.jsonEditorModal.style.display = "flex";
}

function _handleFileInputChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    state.importCache.content = evt.target.result;
    state.importCache.name = file.name;

    const existingContent = dom.jsonEditorTextarea.value.trim();
    if (existingContent && existingContent !== "[]") {
      dom.mergeModal.style.display = "flex";
    } else {
      dom.jsonEditorTextarea.value = utils.prettyPrintJson(
        state.importCache.content,
      );
    }
  };
  reader.readAsText(file);
  dom.fileInput.value = null;
}

function _resetImportCache() {
  state.importCache = { content: null, name: null };
  dom.mergeModal.style.display = "none";
}

function _handleOverwriteClick() {
  dom.jsonEditorTextarea.value = utils.prettyPrintJson(
    state.importCache.content,
  );
  _resetImportCache();
}

function _handleMergeClick() {
  try {
    const existingContent = dom.jsonEditorTextarea.value.trim();
    const existingArray =
      existingContent && existingContent !== "[]" && existingContent !== ""
        ? JSON.parse(existingContent)
        : [];
    if (!Array.isArray(existingArray))
      throw new Error(
        getTranslation("INVALID_JSON_FORMAT_ERROR").replace("\n\nError: ", ""),
      );

    const newArray = JSON.parse(state.importCache.content);
    if (!Array.isArray(newArray))
      throw new Error(
        getTranslation("INVALID_JSON_FORMAT_ERROR").replace("\n\nError: ", ""),
      );

    const mergedArray = [...existingArray, ...newArray];
    const cleanedAndMerged = utils.cleanJsonContent(mergedArray);

    dom.jsonEditorTextarea.value = utils.prettyPrintJson(
      JSON.stringify(cleanedAndMerged),
    );
    _resetImportCache();
  } catch (e) {
    showCustomAlert(getTranslation("MERGE_ERROR") + e.message);
  }
}

function _handleExportJsonClick() {
  const content = dom.jsonEditorTextarea.value;
  if (!content.trim()) return;

  try {
    JSON.parse(content); // Validate JSON before export
  } catch (e) {
    showCustomAlert(getTranslation("INVALID_JSON_FORMAT_ERROR") + e.message);
    return;
  }

  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const deckName = dom.deckNameInput.value.trim() || "deck";
  a.href = url;
  a.download = `${deckName}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function _handleCancelJsonClick() {
  state.pendingDeckContent = state.jsonEditorOriginalContent;
  dom.jsonEditorTextarea.classList.remove("invalid");
  dom.jsonEditorModal.style.display = "none";
}

function _handleSaveJsonClick() {
  if (saveJsonChanges()) {
    dom.jsonEditorModal.style.display = "none";
  }
}

export function initJsonEditor() {
  dom.editJsonBtn.addEventListener("click", _handleEditJsonClick);
  dom.importJsonBtn.addEventListener("click", () => dom.fileInput.click());
  dom.exportJsonBtn.addEventListener("click", _handleExportJsonClick);
  dom.fileInput.addEventListener("change", _handleFileInputChange);
  dom.cancelMergeBtn.addEventListener("click", () => _resetImportCache());
  dom.overwriteBtn.addEventListener("click", _handleOverwriteClick);
  dom.mergeBtn.addEventListener("click", _handleMergeClick);
  dom.cancelJsonBtn.addEventListener("click", _handleCancelJsonClick);
  dom.saveJsonBtn.addEventListener("click", _handleSaveJsonClick);
}
