export const GROUP_SIZE = 5;
export const DECK_STORAGE_KEY = "association_game_decks_fsrs";
export const GLOBAL_SETTINGS_KEY = "association_game_global_settings";
export const LAST_OPENED_DECK_ID = "association_game_last_deck";

export const correctSound = new Audio("assets/right.mp3");
export const wrongSound = new Audio("assets/wrong.mp3");
export const gunSound = new Audio("assets/gun.mp3");
export const shotSound = new Audio("assets/shot.mp3");
export const explosionSound = new Audio("assets/explosion.mp3");

export const state = {
  allDecks: [],
  currentDeckId: null,
  currentDeckStatsId: null,
  originalSyllableList: [],
  syllableList: [],
  currentGroupIndex: 0,
  currentGroup: [],
  sessionReviewQueue: [],
  currentSyllable: null,
  currentSyllableElement: null,
  translationElement: null,
  userTyped: "",
  score: 0,
  hintUsed: false,
  cardStartTime: 0,
  firstKeyTime: 0,

  selectedVoice: null,
  utterance: null,
  recognition: null,
  isRecognizing: false,
  recognitionStoppedManually: false,

  correctSoundEnabled: true,
  wrongSoundEnabled: true,
  darkModeEnabled: true,

  randomToggleEnabled: false,
  colorHintEnabled: true,
  positionHintEnabled: true,
  answerTipLetters: 0,
  restartOnWrongEnabled: false,
  evaluativeModeEnabled: false,
  pronunciationModeEnabled: false,

  editModeDeckId: null,
  pendingDeckContent: null,
  jsonEditorOriginalContent: null,
  importCache: { content: null, name: null },

  currentConfirmOnOk: null,
  currentConfirmOnCancel: null,

  isLevelSkipActive: false,
  levelSkipInput: "",

  levelScopeStart: 1,
  levelScopeEnd: 1,
};
