import { state, LAST_OPENED_DECK_ID } from "./state.js";
import {
  dom,
  showCustomAlert,
  showCustomConfirm,
  loadGlobalSettings,
  saveGlobalSettings,
  renderDeckModal,
  initModalCloseListeners,
  updateModeSettingsVisibility,
  isModalOpen,
} from "./ui.js";
import * as game from "./game.js";
import * as speech from "./speech.js";
import * as deckManager from "./deckManager.js";
import { timerMode } from "./timerMode.js";
import { getLanguage, getTranslation } from "./i18n/i18n.js";

async function _setupApp() {
  await loadGlobalSettings();
  speech.populateVoices();
  deckManager.loadDecks();
  renderDeckModal();
  initModalCloseListeners();
  deckManager.initJsonEditor();
  addDeckListListeners();
}

function _loadLastDeck() {
  const lastDeckId = localStorage.getItem(LAST_OPENED_DECK_ID);
  const lastDeck = state.allDecks.find((d) => d.id === lastDeckId);

  if (
    !lastDeckId ||
    !lastDeck ||
    !lastDeck.content ||
    lastDeck.content.length === 0
  ) {
    dom.deckModal.style.display = "flex";
    return;
  }

  lastDeck.settings.evaluativeModeEnabled = false;
  lastDeck.settings.pronunciationModeEnabled = false;
  deckManager.saveDecks();
  deckManager.selectDeck(lastDeckId);
}

function _initCustomModalListeners() {
  dom.customAlertCloseBtn.addEventListener("click", () => {
    dom.customAlertModal.style.display = "none";
  });

  dom.customConfirmCancelBtn.addEventListener("click", () => {
    if (state.currentConfirmOnCancel) state.currentConfirmOnCancel();
    dom.customConfirmModal.style.display = "none";
    state.currentConfirmOnOk = null;
    state.currentConfirmOnCancel = null;
  });

  dom.customConfirmOkBtn.addEventListener("click", () => {
    if (state.currentConfirmOnOk) state.currentConfirmOnOk();
    dom.customConfirmModal.style.display = "none";
    state.currentConfirmOnOk = null;
    state.currentConfirmOnCancel = null;
  });
}

function _handleGlobalModalKeys(e) {
  const isConfirmOpen = dom.customConfirmModal.style.display === "flex";
  const isAlertOpen = dom.customAlertModal.style.display === "flex";
  const isEditCardOpen = dom.editCardModal.style.display === "flex";

  if (e.key === "Enter") {
    if (isConfirmOpen) {
      e.preventDefault();
      dom.customConfirmOkBtn.click();
      return;
    }
    if (isAlertOpen) {
      e.preventDefault();
      dom.customAlertCloseBtn.click();
      return;
    }
    if (isEditCardOpen) {
      e.preventDefault();
      dom.editCardSaveBtn.click();
      return;
    }
  }

  if (e.key === "Escape") {
    e.preventDefault();

    if (isConfirmOpen) {
      dom.customConfirmCancelBtn.click();
      return;
    }
    if (isAlertOpen) {
      dom.customAlertCloseBtn.click();
      return;
    }
    if (dom.editCardModal.style.display === "flex") {
      dom.editCardCancelBtn.click();
      return;
    }
    if (dom.mergeModal.style.display === "flex") {
      dom.cancelMergeBtn.click();
      return;
    }
    if (dom.jsonEditorModal.style.display === "flex") {
      dom.cancelJsonBtn.click();
      return;
    }
    if (dom.statsModal.style.display === "flex") {
      dom.statsCloseBtn.click();
      return;
    }
    if (dom.generalSettingsModal.style.display === "flex") {
      dom.generalSettingsCancelBtn.click();
      return;
    }
    if (dom.settingsModal.style.display === "flex") {
      dom.settingsCancelBtn.click();
      return;
    }
    if (dom.congratsModal.style.display === "flex") {
      dom.restartBtn.click();
      return;
    }
    if (dom.deckModal.style.display === "flex") {
      dom.deckModal.style.display = "none";
      document.dispatchEvent(new CustomEvent("deckModalClosed"));
      return;
    }
  }
}

function _initVoiceListeners() {
  speechSynthesis.onvoiceschanged = speech.populateVoices;
  dom.voiceSelect.addEventListener("change", () => {
    speech.selectVoice();

    const isVoiceSelected = dom.voiceSelect.value !== "none";
    dom.modePronunciationToggle.disabled = !isVoiceSelected;

    if (!isVoiceSelected) {
      dom.modePronunciationToggle.checked = false;
      dom.modeFreeToggle.checked = !dom.modeFsrsToggle.checked;
      updateModeSettingsVisibility();
    }
  });
}

function _initTopPanelListeners() {
  dom.generalSettingsBtn.addEventListener("click", () => {
    dom.generalCorrectSoundToggle.checked = state.correctSoundEnabled;
    dom.generalWrongSoundToggle.checked = state.wrongSoundEnabled;
    dom.generalDarkModeToggle.checked = state.darkModeEnabled;
    dom.languageSelector.value = getLanguage();
    dom.generalSettingsModal.style.display = "flex";
  });

  dom.deckSelectBtn.addEventListener("click", () => {
    speech.stopRecognition();
    if (speechSynthesis.speaking) speechSynthesis.cancel();
    dom.deckModal.style.display = "flex";
  });

  dom.settingsBtn.addEventListener("click", () => {
    if (state.currentDeckId) {
      deckManager.openSettingsModal(state.currentDeckId);
    } else {
      showCustomAlert(getTranslation("SELECT_DECK_FIRST"));
      dom.deckModal.style.display = "flex";
    }
  });
}

function _initGlobalSettingsListeners() {
  dom.generalSettingsSaveBtn.addEventListener("click", () => {
    saveGlobalSettings();
    dom.generalSettingsModal.style.display = "none";

    if (state.currentSyllable) {
      game.displaySyllable();
    }
  });

  dom.generalSettingsCancelBtn.addEventListener("click", () => {
    dom.generalSettingsModal.style.display = "none";
  });
}

function _handleDeckListClick(e) {
  const mainCard = e.target.closest(".deck-card-main");
  const statsBtn = e.target.closest(".deck-action-btn.stats");
  const deleteBtn = e.target.closest(".deck-action-btn.delete");

  if (mainCard) {
    deckManager.selectDeck(mainCard.dataset.deckId);
    return;
  }
  if (statsBtn) {
    deckManager.showDeckStats(statsBtn.dataset.deckId);
    return;
  }
  if (deleteBtn) {
    deckManager.deleteDeck(deleteBtn.dataset.deckId);
    return;
  }
}

function addDeckListListeners() {
  dom.deckList.addEventListener("click", _handleDeckListClick);
}

function _initDeckModalListeners() {
  dom.addDeckBtn.addEventListener("click", () => {
    deckManager.openSettingsModal(null);
  });

  dom.statsCloseBtn.addEventListener("click", () => {
    dom.statsModal.style.display = "none";
  });

  dom.statsResetFsrsBtn.addEventListener("click", () => {
    const deck = state.allDecks.find((d) => d.id === state.currentDeckStatsId);
    if (!deck) return;

    showCustomConfirm(
      getTranslation("RESET_FSRS_CONFIRMATION").replace("{0}", deck.name),
      () => {
        deck.content.forEach((card) => {
          card.s = 0.1;
          card.d = 0.5;
          card.lastReview = null;
          card.dueDate = null;
        });
        deckManager.saveDecks();
        deckManager.showDeckStats(state.currentDeckStatsId);

        showCustomAlert(getTranslation(FSRS_STATS_RESET));
      },
    );
  });
}

function _initDeckSettingsListeners() {
  dom.settingsSaveBtn.addEventListener("click", deckManager.saveDeckChanges);

  dom.settingsCancelBtn.addEventListener("click", () => {
    dom.settingsModal.style.display = "none";
    state.pendingDeckContent = null;
  });

  function handleAnswerTipChange() {
    let val = parseInt(dom.answerTipInput.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 3) val = 3;
    dom.answerTipInput.value = val;
  }

  dom.answerTipInput.addEventListener("change", handleAnswerTipChange);
  dom.answerTipDecrement.addEventListener("click", () => {
    dom.answerTipInput.value = Math.max(
      0,
      parseInt(dom.answerTipInput.value) - 1,
    );
    handleAnswerTipChange();
  });

  dom.answerTipIncrement.addEventListener("click", () => {
    dom.answerTipInput.value = Math.min(
      3,
      parseInt(dom.answerTipInput.value) + 1,
    );
    handleAnswerTipChange();
  });

  function handleGameSpeedChange() {
    let val = parseInt(dom.gameSpeedInput.value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 10) val = 10;
    dom.gameSpeedInput.value = val;
  }

  dom.gameSpeedInput.addEventListener("change", handleGameSpeedChange);
  dom.gameSpeedDecrement.addEventListener("click", () => {
    dom.gameSpeedInput.value = Math.max(
      1,
      parseInt(dom.gameSpeedInput.value) - 1,
    );
    handleGameSpeedChange();
  });
  dom.gameSpeedIncrement.addEventListener("click", () => {
    dom.gameSpeedInput.value = Math.min(
      10,
      parseInt(dom.gameSpeedInput.value) + 1,
    );
    handleGameSpeedChange();
  });

  const modeToggles = [
    dom.modeFreeToggle,
    dom.modeFsrsToggle,
    dom.modePronunciationToggle,
    dom.modeTimerToggle,
  ];
  modeToggles.forEach((toggle) =>
    toggle.addEventListener("click", (e) => {
      const selectedToggle = e.target;
      if (!selectedToggle.checked) {
        selectedToggle.checked = true;
        return;
      }
      modeToggles.forEach((t) => {
        if (t !== selectedToggle) t.checked = false;
      });
      updateModeSettingsVisibility();
    }),
  );
}

function _handleKeyEnter() {
  if (state.pronunciationModeEnabled) {
    game.handlePronunciationEnter();
  } else if (state.evaluativeModeEnabled) {
    game.handleFsrsEnter();
    deckManager.saveDecks();
  } else {
    game.handleFreeModeEnter();
  }
}

function _handleKeyPress(e) {
  if (isModalOpen()) return;
  if (state.pronunciationModeEnabled) return;
  if (!state.currentSyllable || !state.currentSyllable.answer) return;

  if (e.key === "Enter" || e.key === "Backspace") {
    return;
  }

  game.handleKeyInput(e.key.toLowerCase());
}

function _handleKeyDown(e) {
  if (isModalOpen()) return;

  const canScopeLevel = !state.evaluativeModeEnabled;
  if (canScopeLevel && e.key === "ArrowUp") {
    e.preventDefault();
    if (!state.isLevelSkipActive) {
      state.levelSkipInput = "";
    }
    state.isLevelSkipActive = true;
    return;
  }
  if (state.isLevelSkipActive && /^[0-9-]$/.test(e.key)) {
    e.preventDefault();
    state.levelSkipInput += e.key;
    return;
  }

  if (!state.currentSyllable || !state.currentSyllable.answer) return;

  if (e.key === "Backspace") {
    game.handleBackspace();
  } else if (e.key === "Control" && !state.pronunciationModeEnabled) {
    game.handleVoiceRepeat();
  } else if (e.key === "Enter") {
    _handleKeyEnter();
  } else if (e.key === "F1") {
    e.preventDefault();
    game.handleDeleteCurrentCardRequest();
  } else if (e.key === "Alt") {
    e.preventDefault();
    game.handleEditCurrentCardRequest();
  }
}

function _handleKeyUp(e) {
  if (isModalOpen()) return;

  if (e.key === "ArrowUp") {
    e.preventDefault();
    if (state.isLevelSkipActive && state.levelSkipInput.length > 0) {
      game.setGameScope(state.levelSkipInput);
    }
    state.isLevelSkipActive = false;
    state.levelSkipInput = "";
  }
}
function _initGameListeners() {
  document.addEventListener("keydown", _handleKeyDown);
  document.addEventListener("keyup", _handleKeyUp);
  document.addEventListener("keypress", _handleKeyPress);
  document.addEventListener(
    "pronunciationSuccess",
    game.handleCorrectPronunciation,
  );
  document.addEventListener("cardDeleted", () => {
    deckManager.saveDecks();
    deckManager.renderDeckModal();
  });
  document.addEventListener("cardUpdated", () => {
    deckManager.saveDecks();
    deckManager.renderDeckModal();
  });
}
function _initModalCloseResumeListeners() {
  document.addEventListener("deckModalClosed", () => {
    if (!isModalOpen()) {
      if (state.pronunciationModeEnabled && state.currentSyllable) {
        speech.startRecognition();
      }
    }
  });
}

function _initEditCardModalListeners() {
  dom.editCardCancelBtn.addEventListener("click", () => {
    dom.editCardModal.style.display = "none";
  });

  dom.editCardSaveBtn.addEventListener("click", () => {
    const newData = {
      question: dom.editCardQuestionInput.value.trim().toLowerCase(),
      answer: dom.editCardAnswerInput.value.trim().toLowerCase(),
      hint: dom.editCardHintInput.value.trim(),
    };

    if (!newData.question || !newData.answer) {
      showCustomAlert(getTranslation("EMPTY_QUESTION_ANSWER"));
      return;
    }

    game.updateCurrentCard(newData);
    dom.editCardModal.style.display = "none";
  });
}

async function init() {
  await _setupApp();
  _initCustomModalListeners();
  _initVoiceListeners();
  _initTopPanelListeners();
  _initGlobalSettingsListeners();
  _initDeckModalListeners();
  _initDeckSettingsListeners();
  _initEditCardModalListeners();
  _initGameListeners();
  _initModalCloseResumeListeners();

  document.addEventListener("keydown", _handleGlobalModalKeys);

  _loadLastDeck();
}

init();