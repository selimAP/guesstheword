const API = {
  wordList: "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt",
  dictionary: "https://api.dictionaryapi.dev/api/v2/entries/en/",
  tatoeba: "https://api.tatoeba.org/v1/sentences",
  translation: "https://api.mymemory.translated.net/get"
};

const MIN_WORD_LENGTH = 3;
const MAX_WORD_LENGTH = 16;
const MAX_VOCABULARY_RANK = 5500;
const RECENT_WORD_LIMIT = 250;
const PREFETCH_TARGET = 2;
const PREPARE_ATTEMPTS = 22;

const WORD_CACHE_KEY = "guessTheWordContentV5";
const RECENT_WORDS_KEY = "guessTheWordRecentWordsV3";

const LEARNER_OVERRIDES = {
  great: {
    german: "großartig / toll",
    definition: "very good, enjoyable, or impressive",
    wordType: "adjective",
    englishExample: "We had a great time at the concert.",
    germanExample: "Wir hatten eine tolle Zeit auf dem Konzert."
  },

  money: {
    german: "Geld",
    definition: "what people use to buy things and pay for services",
    wordType: "noun",
    englishExample: "I don't have enough money for a new phone.",
    germanExample: "Ich habe nicht genug Geld für ein neues Handy."
  },

  game: {
    german: "Spiel",
    definition: "an activity with rules that people play for fun or competition",
    wordType: "noun",
    englishExample: "We played a game after dinner.",
    germanExample: "Wir haben nach dem Abendessen ein Spiel gespielt."
  }
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "but",
  "not",
  "you",
  "your",
  "yours",
  "his",
  "her",
  "hers",
  "our",
  "ours",
  "their",
  "theirs",
  "this",
  "that",
  "these",
  "those",
  "with",
  "from",
  "into",
  "onto",
  "upon",
  "about",
  "than",
  "then",
  "who",
  "whom",
  "whose",
  "which",
  "what",
  "where",
  "when",
  "why",
  "how",
  "there",
  "here",
  "they",
  "them",
  "she",
  "him",
  "its",
  "been",
  "being",
  "were",
  "was",
  "are",
  "has",
  "had",
  "would",
  "could",
  "should",
  "might",
  "must",
  "does",
  "did",
  "because",
  "although",
  "however"
]);

const fallbackWords = [
  {
    word: "dream",
    german: "Traum / träumen",
    definition: "a wish or hope that you want to achieve",
    englishExample: "Her dream is to travel around the world.",
    germanExample: "Ihr Traum ist es, um die Welt zu reisen.",
    wordType: "noun",
    exampleSource: "Curated",
    rank: 500
  },

  {
    word: "learn",
    german: "lernen",
    definition: "to gain knowledge or a new skill",
    englishExample: "Children learn new things every day.",
    germanExample: "Kinder lernen jeden Tag neue Dinge.",
    wordType: "verb",
    exampleSource: "Curated",
    rank: 350
  },

  {
    word: "house",
    german: "Haus",
    definition: "a building where people live",
    englishExample: "They live in a small house near the park.",
    germanExample: "Sie wohnen in einem kleinen Haus in der Nähe des Parks.",
    wordType: "noun",
    exampleSource: "Curated",
    rank: 300
  },

  {
    word: "travel",
    german: "reisen",
    definition: "to go from one place to another",
    englishExample: "I love to travel with my friends.",
    germanExample: "Ich reise gerne mit meinen Freunden.",
    wordType: "verb",
    exampleSource: "Curated",
    rank: 700
  },

  {
    word: "simple",
    german: "einfach",
    definition: "easy to understand or do",
    englishExample: "The instructions are very simple.",
    germanExample: "Die Anweisungen sind sehr einfach.",
    wordType: "adjective",
    exampleSource: "Curated",
    rank: 800
  },

  {
    word: "answer",
    german: "Antwort / antworten",
    definition: "something said or written in response to a question",
    englishExample: "Do you know the answer to this question?",
    germanExample: "Kennst du die Antwort auf diese Frage?",
    wordType: "noun",
    exampleSource: "Curated",
    rank: 500
  },

  {
    word: "language",
    german: "Sprache",
    definition: "a system of words people use to communicate",
    englishExample: "Learning a new language takes time.",
    germanExample: "Eine neue Sprache zu lernen braucht Zeit.",
    wordType: "noun",
    exampleSource: "Curated",
    rank: 700
  },

  {
    word: "understand",
    german: "verstehen",
    definition: "to know the meaning of something",
    englishExample: "I understand what you are trying to say.",
    germanExample: "Ich verstehe, was du sagen möchtest.",
    wordType: "verb",
    exampleSource: "Curated",
    rank: 650
  }
];

let vocabulary = [];
let vocabularySet = new Set();
let vocabularyRank = new Map();
let vocabularyLoaded = false;

let wordQueue = [];
const preparingWords = new Set();
const failedWords = new Set();
let prefetchPromise = null;

const audioFiles = {
  submit: "assets/sounds/submit.wav",
  success: "assets/sounds/success.wav"
};

const soundLevels = {
  submit: 0.42,
  success: 0.72
};

const audioTemplates = {};

let masterVolume = 0.65;
let soundMuted = false;

let currentWord = null;
let knownPrefixLength = 1;
let letterOrigins = [];

let currentXP = 100;
let totalXP = 0;
let streak = 0;
let hintIndex = 0;

let solved = false;
let gaveUp = false;
let loadingWord = false;

const game = document.getElementById("game");
const lettersElement = document.getElementById("letters");
const guessForm = document.getElementById("guessForm");
const guessInput = document.getElementById("guessInput");
const feedback = document.getElementById("feedback");
const hintsElement = document.getElementById("hints");
const currentXPElement = document.getElementById("currentXP");
const totalXPElement = document.getElementById("totalXP");
const streakElement = document.getElementById("streak");
const wordLengthElement = document.getElementById("wordLength");

const help = document.querySelector(".help");
const helpToggle = document.getElementById("helpToggle");
const giveUpButton = document.getElementById("giveUpButton");

const result = document.getElementById("result");
const resultLabel = document.getElementById("resultLabel");
const nextButton = document.getElementById("nextButton");
const sourceNote = document.querySelector(".source-note");

const soundButton = document.getElementById("soundButton");
const soundPanel = document.getElementById("soundPanel");
const muteButton = document.getElementById("muteButton");
const volumeSlider = document.getElementById("volumeSlider");
const volumeValue = document.getElementById("volumeValue");
const soundIconOn = document.getElementById("soundIconOn");
const soundIconOff = document.getElementById("soundIconOff");

const hintTypes = [
  {
    name: "English example",
    cost: 10,
    getText() {
      return maskTargetWord(currentWord.englishExample, currentWord.word);
    }
  },

  {
    name: "English definition",
    cost: 15,
    getText() {
      return currentWord.definition;
    }
  },

  {
    name: "German example",
    cost: 20,
    getText() {
      return currentWord.germanExample;
    }
  },

  {
    name: "Reveal next letter",
    cost: 25,
    getText() {
      revealNextLetter();
      return "The next letter has been revealed.";
    }
  },

  {
    name: "German word",
    cost: 30,
    getText() {
      return currentWord.german;
    }
  }
];

function clearOldContentCaches() {
  const oldKeys = [
    "guessTheWordApiCacheV1",
    "guessTheWordApiCacheV2",
    "guessTheWordApiCacheV3",
    "guessTheWordContentV3",
    "guessTheWordContentV4",
    "guessTheWordRecentWords",
    "guessTheWordRecentWordsV2"
  ];

  oldKeys.forEach(key => localStorage.removeItem(key));
}

function loadAudio() {
  Object.entries(audioFiles).forEach(([name, path]) => {
    const audio = new Audio(path);

    audio.preload = "auto";
    audioTemplates[name] = audio;
  });
}

function playSound(name) {
  if (soundMuted || masterVolume <= 0) return;

  const template = audioTemplates[name];

  if (!template) return;

  const audio = template.cloneNode();

  audio.volume = Math.min(1, masterVolume * soundLevels[name]);

  const promise = audio.play();

  if (promise && typeof promise.catch === "function") {
    promise.catch(() => {});
  }
}

function loadSoundSettings() {
  const savedVolume = localStorage.getItem("guessTheWordVolume");
  const savedMuted = localStorage.getItem("guessTheWordMuted");

  if (savedVolume !== null) {
    const parsed = Number(savedVolume);

    if (Number.isFinite(parsed)) {
      masterVolume = Math.max(0, Math.min(1, parsed));
    }
  }

  if (savedMuted !== null) {
    soundMuted = savedMuted === "true";
  }

  updateSoundUI();
}

function saveSoundSettings() {
  localStorage.setItem("guessTheWordVolume", String(masterVolume));
  localStorage.setItem("guessTheWordMuted", String(soundMuted));
}

function updateSoundUI() {
  const percent = Math.round(masterVolume * 100);
  const muted = soundMuted || masterVolume === 0;

  volumeSlider.value = percent;
  volumeValue.textContent = percent;
  volumeSlider.style.setProperty("--volume-progress", `${percent}%`);

  soundIconOn.classList.toggle("hidden", muted);
  soundIconOff.classList.toggle("hidden", !muted);

  muteButton.textContent = muted ? "Unmute" : "Mute";
  muteButton.classList.toggle("muted", muted);
}

function closeSoundPanel() {
  soundPanel.classList.remove("open");
  soundButton.classList.remove("active");

  soundButton.setAttribute("aria-expanded", "false");
  soundPanel.setAttribute("aria-hidden", "true");
}

soundButton.addEventListener("click", event => {
  event.stopPropagation();

  const open = soundPanel.classList.toggle("open");

  soundButton.classList.toggle("active", open);
  soundButton.setAttribute("aria-expanded", String(open));
  soundPanel.setAttribute("aria-hidden", String(!open));
});

muteButton.addEventListener("click", event => {
  event.stopPropagation();

  soundMuted = !soundMuted;

  if (!soundMuted && masterVolume === 0) {
    masterVolume = 0.5;
  }

  updateSoundUI();
  saveSoundSettings();
});

volumeSlider.addEventListener("input", event => {
  masterVolume = Number(event.target.value) / 100;
  soundMuted = masterVolume === 0;

  updateSoundUI();
  saveSoundSettings();
});

document.addEventListener("click", event => {
  if (!soundPanel.classList.contains("open")) return;

  const settings = document.querySelector(".sound-settings");

  if (settings.contains(event.target)) return;

  closeSoundPanel();
});

async function loadVocabulary() {
  try {
    const response = await fetchWithTimeout(API.wordList, 7000);

    if (!response.ok) {
      throw new Error("Word list unavailable.");
    }

    const text = await response.text();

    const allWords = text
      .split(/\r?\n/)
      .map(normalizeWord)
      .filter(Boolean)
      .slice(0, MAX_VOCABULARY_RANK);

    vocabularySet = new Set(allWords);

    vocabularyRank = new Map(
      allWords.map((word, index) => [word, index + 1])
    );

    vocabulary = allWords
      .map((word, index) => ({
        word,
        rank: index + 1
      }))
      .filter(entry => isGoodGameWord(entry.word));

    vocabularyLoaded = true;

    console.log(`Vocabulary ready: ${vocabulary.length} words`);
  } catch (error) {
    console.warn("Could not load vocabulary:", error);

    vocabulary = fallbackWords.map(item => ({
      word: item.word,
      rank: item.rank
    }));

    vocabularySet = new Set(
      vocabulary.map(item => item.word)
    );

    vocabularyRank = new Map(
      vocabulary.map(item => [item.word, item.rank])
    );

    vocabularyLoaded = true;
  }
}

function isGoodGameWord(word) {
  if (word.length < MIN_WORD_LENGTH) return false;
  if (word.length > MAX_WORD_LENGTH) return false;
  if (STOP_WORDS.has(word)) return false;
  if (isLikelyInflectedForm(word)) return false;

  return true;
}

function isLikelyInflectedForm(word) {
  if (word.length < 5) return false;

  if (word.endsWith("ies")) {
    const singular = word.slice(0, -3) + "y";

    if (vocabularySet.has(singular)) return true;
  }

  if (word.endsWith("es")) {
    const stem = word.slice(0, -2);

    if (vocabularySet.has(stem)) return true;
  }

  if (word.endsWith("s") && !word.endsWith("ss")) {
    const stem = word.slice(0, -1);

    if (vocabularySet.has(stem)) return true;
  }

  if (word.endsWith("ed")) {
    const stem = word.slice(0, -2);

    if (vocabularySet.has(stem) || vocabularySet.has(stem + "e")) {
      return true;
    }
  }

  if (word.endsWith("ing")) {
    const stem = word.slice(0, -3);

    if (vocabularySet.has(stem) || vocabularySet.has(stem + "e")) {
      return true;
    }
  }

  return false;
}

function getRandomLengthRange() {
  const random = Math.random();

  if (random < 0.10) return [3, 4];
  if (random < 0.46) return [5, 6];
  if (random < 0.75) return [7, 8];
  if (random < 0.93) return [9, 11];

  return [12, 16];
}

function chooseVocabularyCandidate() {
  if (!vocabularyLoaded || vocabulary.length === 0) return null;

  const recent = new Set(getRecentWords());
  const [minLength, maxLength] = getRandomLengthRange();

  let candidates = vocabulary.filter(entry => {
    const word = entry.word;

    if (word.length < minLength || word.length > maxLength) return false;
    if (recent.has(word)) return false;
    if (failedWords.has(word)) return false;
    if (preparingWords.has(word)) return false;
    if (currentWord && currentWord.word === word) return false;
    if (wordQueue.some(item => item.word === word)) return false;

    return true;
  });

  if (candidates.length === 0) {
    candidates = vocabulary.filter(entry => {
      const word = entry.word;

      return (
        !recent.has(word) &&
        !failedWords.has(word) &&
        !preparingWords.has(word) &&
        (!currentWord || currentWord.word !== word) &&
        !wordQueue.some(item => item.word === word)
      );
    });
  }

  if (candidates.length === 0) return null;

  const biasedRandom = Math.pow(Math.random(), 1.85);
  const index = Math.min(candidates.length - 1, Math.floor(biasedRandom * candidates.length));

  return candidates[index];
}

async function initializeGame() {
  clearOldContentCaches();

  await loadVocabulary();
  await startGame();

  prefetchNextWords();
}

async function startGame() {
  if (loadingWord) return;

  loadingWord = true;
  solved = false;
  gaveUp = false;
  hintIndex = 0;
  currentXP = 100;

  game.classList.remove("solved");
  result.classList.remove("visible");

  closeHelp();

  guessInput.value = "";
  guessInput.disabled = true;
  nextButton.disabled = true;

  feedback.className = "feedback";

  updateXP();

  if (wordQueue.length > 0) {
    currentWord = wordQueue.shift();

    setupCurrentWord();

    loadingWord = false;
    nextButton.disabled = false;

    prefetchNextWords();

    return;
  }

  if (prefetchPromise) {
    try {
      await Promise.race([
        prefetchPromise,
        delay(3200)
      ]);
    } catch {}

    if (wordQueue.length > 0) {
      currentWord = wordQueue.shift();

      setupCurrentWord();

      loadingWord = false;
      nextButton.disabled = false;

      prefetchNextWords();

      return;
    }
  }

  wordLengthElement.textContent = "loading";
  feedback.textContent = "Loading a new word...";

  renderLoadingLetters();

  currentWord = await prepareNextWord();

  if (!currentWord) {
    currentWord = getFallbackWord();
  }

  setupCurrentWord();

  loadingWord = false;
  nextButton.disabled = false;

  prefetchNextWords();
}

function setupCurrentWord() {
  addRecentWord(currentWord.word);

  knownPrefixLength = 1;

  letterOrigins = new Array(currentWord.word.length).fill(null);
  letterOrigins[0] = "start";

  guessInput.maxLength = currentWord.word.length;
  guessInput.value = "";
  guessInput.disabled = false;

  wordLengthElement.textContent = `${currentWord.word.length} letters`;

  feedback.textContent = "The first letter is already revealed.";
  feedback.className = "feedback";

  updateWordSizing();
  renderLetters();
  renderHints();

  setTimeout(() => {
    guessInput.focus();
  }, 80);
}

function prefetchNextWords() {
  if (wordQueue.length >= PREFETCH_TARGET) return;
  if (prefetchPromise) return;

  prefetchPromise = fillWordQueue()
    .catch(error => {
      console.warn("Background preload failed:", error);
    })
    .finally(() => {
      prefetchPromise = null;

      if (wordQueue.length < PREFETCH_TARGET) {
        setTimeout(prefetchNextWords, 1400);
      }
    });
}

async function fillWordQueue() {
  while (wordQueue.length < PREFETCH_TARGET) {
    const missing = PREFETCH_TARGET - wordQueue.length;

    const jobs = Array.from(
      { length: missing },
      () => prepareNextWord()
    );

    const results = await Promise.all(jobs);

    let added = 0;

    for (const prepared of results) {
      if (!prepared) continue;
      if (isAlreadyQueuedOrCurrent(prepared.word)) continue;

      wordQueue.push(prepared);
      added++;
    }

    if (added === 0) {
      const fallback = getFallbackWord();

      if (fallback && !isAlreadyQueuedOrCurrent(fallback.word)) {
        wordQueue.push(fallback);
      } else {
        break;
      }
    }
  }

  console.log(
    "Ready in background:",
    wordQueue.map(item => item.word)
  );
}

async function prepareNextWord() {
  for (let attempt = 0; attempt < PREPARE_ATTEMPTS; attempt++) {
    const candidate = chooseVocabularyCandidate();

    if (!candidate) break;

    const word = candidate.word;

    preparingWords.add(word);

    try {
      const cached = getCachedWord(word);

      if (cached) {
        preparingWords.delete(word);

        if (!isAlreadyQueuedOrCurrent(word)) {
          return cached;
        }

        continue;
      }

      if (LEARNER_OVERRIDES[word]) {
        const override = LEARNER_OVERRIDES[word];

        const prepared = {
          word,
          rank: candidate.rank,
          german: override.german,
          definition: override.definition,
          wordType: override.wordType,
          englishExample: override.englishExample,
          germanExample: override.germanExample,
          exampleSource: "Curated"
        };

        preparingWords.delete(word);

        saveWordToCache(prepared);

        return prepared;
      }

      const prepared = await prepareWordContent(word, candidate.rank);

      preparingWords.delete(word);

      if (!prepared) {
        failedWords.add(word);
        continue;
      }

      if (isAlreadyQueuedOrCurrent(word)) {
        continue;
      }

      saveWordToCache(prepared);

      return prepared;
    } catch (error) {
      preparingWords.delete(word);
      failedWords.add(word);

      console.warn(`Skipping "${word}"`, error);
    }
  }

  return getFallbackWord();
}

async function prepareWordContent(word, rank) {
  const [dictionaryData, germanWord] = await Promise.all([
    fetchDictionaryData(word),
    fetchGermanWordTranslation(word)
  ]);

  if (!dictionaryData || !germanWord) return null;

  const examplePair = await fetchTatoebaExample(
    word,
    dictionaryData.wordType,
    germanWord
  );

  if (!examplePair) return null;

  return {
    word,
    rank,
    german: germanWord,
    definition: dictionaryData.definition,
    wordType: dictionaryData.wordType,
    englishExample: examplePair.english,
    germanExample: examplePair.german,
    exampleSource: "Tatoeba"
  };
}

async function fetchDictionaryData(word) {
  const response = await fetchWithTimeout(
    API.dictionary + encodeURIComponent(word),
    6000
  );

  if (!response.ok) return null;

  const data = await response.json();

  if (!Array.isArray(data)) return null;

  const candidates = [];

  data.forEach((entry, entryIndex) => {
    const meanings = entry.meanings || [];

    meanings.forEach((meaning, meaningIndex) => {
      const definitions = meaning.definitions || [];

      definitions.forEach((definitionData, definitionIndex) => {
        if (!definitionData.definition) return;

        const definition = cleanDefinition(definitionData.definition);

        if (definition.length < 12 || definition.length > 190) return;

        candidates.push({
          definition,
          wordType: meaning.partOfSpeech || "word",
          entryIndex,
          meaningIndex,
          definitionIndex
        });
      });
    });
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => scoreDefinition(a) - scoreDefinition(b));

  return {
    definition: candidates[0].definition,
    wordType: candidates[0].wordType
  };
}

function scoreDefinition(candidate) {
  const definition = candidate.definition;
  const lower = definition.toLowerCase();
  const tokens = tokenizeEnglish(definition);

  let score = 0;

  score += candidate.entryIndex * 1.5;
  score += candidate.meaningIndex * 0.75;
  score += candidate.definitionIndex * 0.45;

  const type = candidate.wordType.toLowerCase();

  const typePenalty = {
    adjective: 0,
    verb: 0.5,
    noun: 1.2,
    adverb: 1.8,
    preposition: 4,
    conjunction: 5,
    interjection: 5
  };

  score += typePenalty[type] ?? 2;

  const idealLength = 70;

  score += Math.abs(definition.length - idealLength) / 35;

  tokens.forEach(token => {
    if (token.length <= 3) return;

    const rank = vocabularyRank.get(token);

    if (!rank) {
      score += 1.1;
    } else if (rank > 4500) {
      score += 1;
    } else if (rank > 3000) {
      score += 0.55;
    }
  });

  const technicalMarkers = [
    "archaic",
    "obsolete",
    "historical",
    "heraldry",
    "legal term",
    "legally",
    "conceptual",
    "entitlement",
    "intrinsic value",
    "regulated",
    "taxonomy",
    "mathematics",
    "chemistry",
    "physics",
    "linguistics",
    "computing",
    "programming",
    "medicine",
    "anatomy",
    "a person of major significance",
    "industry or profession"
  ];

  technicalMarkers.forEach(marker => {
    if (lower.includes(marker)) {
      score += 12;
    }
  });

  return score;
}

function cleanDefinition(definition) {
  let cleaned = String(definition)
    .replace(/\s+/g, " ")
    .trim();

  cleaned = cleaned.replace(/^\([^)]{1,100}\)\s*/, "");

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  }

  return cleaned;
}

async function fetchGermanWordTranslation(word) {
  const params = new URLSearchParams();

  params.set("q", word);
  params.set("langpair", "en|de");

  try {
    const response = await fetchWithTimeout(
      `${API.translation}?${params.toString()}`,
      6000
    );

    if (!response.ok) return "";

    const json = await response.json();

    const candidates = [];
    const mainTranslation = json?.responseData?.translatedText;

    if (mainTranslation) {
      candidates.push({
        text: decodeHtmlEntities(mainTranslation),
        confidence: Number(json?.responseData?.match) || 0.5
      });
    }

    if (Array.isArray(json.matches)) {
      json.matches.forEach(match => {
        if (!match.translation) return;

        candidates.push({
          text: decodeHtmlEntities(match.translation),
          confidence: Number(match.match) || 0
        });
      });
    }

    const cleaned = candidates
      .map(candidate => ({
        text: cleanGermanWordTranslation(candidate.text),
        confidence: candidate.confidence
      }))
      .filter(candidate => {
        return isUsableGermanTranslation(candidate.text, word);
      });

    if (cleaned.length === 0) return "";

    cleaned.sort(
      (a, b) => scoreIsolatedTranslation(b) - scoreIsolatedTranslation(a)
    );

    return cleaned[0].text;
  } catch {
    return "";
  }
}

function scoreIsolatedTranslation(candidate) {
  let score = candidate.confidence * 10;

  const words = candidate.text.split(/\s+/).length;

  score -= Math.max(0, words - 1) * 1.5;
  score -= candidate.text.length / 50;

  return score;
}

function cleanGermanWordTranslation(text) {
  let cleaned = cleanSentence(text);

  cleaned = cleaned.replace(/[.!?]+$/, "");
  cleaned = cleaned.replace(/^["“”']+|["“”']+$/g, "");

  return cleaned.trim();
}

function isUsableGermanTranslation(translation, englishWord) {
  if (!translation) return false;
  if (translation.length > 50) return false;

  if (translation.toLowerCase() === englishWord.toLowerCase()) {
    return false;
  }

  const wordCount = translation.split(/\s+/).length;

  if (wordCount > 4) return false;

  return true;
}

async function fetchTatoebaExample(word, wordType, germanWord) {
  let pairs = await queryTatoeba({
    word,
    wordCount: "6-12",
    nativeOnly: true
  });

  pairs = filterAndScoreExamplePairs(
    pairs,
    word,
    wordType,
    germanWord
  );

  if (pairs.length > 0) {
    return pairs[0];
  }

  pairs = await queryTatoeba({
    word,
    wordCount: "6-13",
    nativeOnly: false
  });

  pairs = filterAndScoreExamplePairs(
    pairs,
    word,
    wordType,
    germanWord
  );

  if (pairs.length > 0) {
    return pairs[0];
  }

  pairs = await queryTatoeba({
    word,
    wordCount: "5-14",
    nativeOnly: false
  });

  pairs = filterAndScoreExamplePairs(
    pairs,
    word,
    wordType,
    germanWord
  );

  if (pairs.length > 0) {
    return pairs[0];
  }

  return null;
}

async function queryTatoeba({ word, wordCount, nativeOnly }) {
  const params = new URLSearchParams();

  params.set("lang", "eng");
  params.set("q", `=${word}`);
  params.set("word_count", wordCount);
  params.set("is_unapproved", "no");
  params.set("is_orphan", "no");
  params.set("tag", "!idiom,proverb");

  params.set("trans:lang", "deu");
  params.set("trans:is_direct", "yes");
  params.set("trans:is_unapproved", "no");
  params.set("trans:is_orphan", "no");

  if (nativeOnly) {
    params.set("is_native", "yes");
    params.set("trans:is_native", "yes");
  }

  params.set("sort", "relevance");
  params.set("limit", "30");

  const response = await fetchWithTimeout(
    `${API.tatoeba}?${params.toString()}`,
    7000
  );

  if (!response.ok) return [];

  const json = await response.json();

  const sentences = Array.isArray(json.data) ? json.data : [];
  const pairs = [];

  for (const sentence of sentences) {
    const english = cleanSentence(sentence.text);

    if (!english) continue;
    if (!containsWholeWord(english, word)) continue;

    const translations = Array.isArray(sentence.translations)
      ? sentence.translations
      : [];

    for (const translation of translations) {
      if (translation.lang !== "deu") continue;
      if (translation.is_direct === false) continue;

      const german = cleanSentence(translation.text);

      if (!german) continue;

      pairs.push({
        english,
        german
      });
    }
  }

  return pairs;
}

function filterAndScoreExamplePairs(pairs, word, wordType, germanWord) {
  return pairs
    .filter(pair => isGoodExamplePair(pair, word, germanWord))
    .map(pair => ({
      ...pair,
      score: scoreExamplePair(pair, word, wordType)
    }))
    .sort((a, b) => a.score - b.score);
}

function isGoodExamplePair(pair, word, germanWord) {
  const englishTokens = tokenizeEnglish(pair.english);

  if (englishTokens.length < 5) return false;
  if (englishTokens.length > 14) return false;
  if (!containsWholeWord(pair.english, word)) return false;

  if (/[;:{}[\]]/.test(pair.english)) {
    return false;
  }

  if (!germanTranslationFitsExample(germanWord, pair.german)) {
    return false;
  }

  return true;
}

function germanTranslationFitsExample(germanWord, germanSentence) {
  const sentence = normalizeGerman(germanSentence);
  const contentWords = extractGermanTranslationWords(germanWord);

  if (contentWords.length === 0) return true;

  return contentWords.some(word => {
    const normalized = normalizeGerman(word);

    if (normalized.length < 3) return false;

    const stemLength = Math.min(4, normalized.length);
    const stem = normalized.slice(0, stemLength);

    return sentence.includes(stem);
  });
}

function extractGermanTranslationWords(translation) {
  const stopWords = new Set([
    "der",
    "die",
    "das",
    "den",
    "dem",
    "des",
    "ein",
    "eine",
    "einen",
    "einem",
    "einer",
    "zu",
    "und",
    "oder"
  ]);

  return normalizeGerman(translation)
    .split(/\s+/)
    .filter(word => word.length >= 3 && !stopWords.has(word));
}

function scoreExamplePair(pair, word, wordType) {
  const tokens = tokenizeEnglish(pair.english);

  let score = 0;

  score += Math.abs(tokens.length - 8) * 1.7;

  tokens.forEach(token => {
    if (token === word || token.length <= 3) return;

    const rank = vocabularyRank.get(token);

    if (!rank) {
      score += 4;
    } else if (rank > 4500) {
      score += 3.5;
    } else if (rank > 3000) {
      score += 2;
    } else if (rank > 1800) {
      score += 0.7;
    }
  });

  if (pair.english.length > 90) {
    score += 5;
  }

  if (pair.german.length > 115) {
    score += 4;
  }

  if (/[():]/.test(pair.english)) {
    score += 3;
  }

  score += scorePartOfSpeechUsage(
    pair.english,
    word,
    wordType
  );

  return score;
}

function scorePartOfSpeechUsage(sentence, word, wordType) {
  const tokens = tokenizeEnglish(sentence);
  const index = tokens.indexOf(word.toLowerCase());

  if (index === -1) return 8;

  const previous = tokens[index - 1] || "";
  const next = tokens[index + 1] || "";
  const type = String(wordType).toLowerCase();

  if (type.includes("adjective")) {
    const linkingVerbs = new Set([
      "am",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "seems",
      "seem",
      "looks",
      "look",
      "sounds",
      "sound",
      "feels",
      "feel",
      "became",
      "become"
    ]);

    const intensifiers = new Set([
      "very",
      "really",
      "so",
      "quite",
      "pretty",
      "extremely"
    ]);

    if (linkingVerbs.has(previous)) {
      return -4;
    }

    if (
      next &&
      !["to", "with", "at", "of", "for", "and", "but"].includes(next)
    ) {
      return -2;
    }

    if (intensifiers.has(previous)) {
      return -2;
    }

    return 5;
  }

  if (type.includes("verb")) {
    const verbStarters = new Set([
      "to",
      "can",
      "could",
      "will",
      "would",
      "should",
      "must",
      "may",
      "might",
      "i",
      "you",
      "we",
      "they",
      "he",
      "she"
    ]);

    if (verbStarters.has(previous)) {
      return -2;
    }

    return 0;
  }

  if (type.includes("noun")) {
    const determiners = new Set([
      "a",
      "an",
      "the",
      "this",
      "that",
      "my",
      "your",
      "his",
      "her",
      "our",
      "their",
      "some",
      "any",
      "enough"
    ]);

    if (determiners.has(previous)) {
      return -2;
    }

    return 0;
  }

  return 0;
}

function loadWordCache() {
  try {
    return JSON.parse(localStorage.getItem(WORD_CACHE_KEY)) || {};
  } catch {
    return {};
  }
}

function getCachedWord(word) {
  const cache = loadWordCache();
  const cached = cache[word];

  if (!cached) return null;

  if (
    !cached.german ||
    !cached.definition ||
    !cached.englishExample ||
    !cached.germanExample ||
    !cached.wordType
  ) {
    return null;
  }

  return cached;
}

function saveWordToCache(wordData) {
  const cache = loadWordCache();

  cache[wordData.word] = wordData;

  const entries = Object.entries(cache);

  if (entries.length > 500) {
    const trimmed = entries.slice(-500);

    localStorage.setItem(
      WORD_CACHE_KEY,
      JSON.stringify(Object.fromEntries(trimmed))
    );

    return;
  }

  localStorage.setItem(
    WORD_CACHE_KEY,
    JSON.stringify(cache)
  );
}

function getRecentWords() {
  try {
    const data = JSON.parse(
      localStorage.getItem(RECENT_WORDS_KEY)
    );

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function addRecentWord(word) {
  const recent = getRecentWords().filter(item => item !== word);

  recent.push(word);

  while (recent.length > RECENT_WORD_LIMIT) {
    recent.shift();
  }

  localStorage.setItem(
    RECENT_WORDS_KEY,
    JSON.stringify(recent)
  );
}

function isAlreadyQueuedOrCurrent(word) {
  if (currentWord && currentWord.word === word) {
    return true;
  }

  if (wordQueue.some(item => item.word === word)) {
    return true;
  }

  if (getRecentWords().includes(word)) {
    return true;
  }

  return false;
}

function getFallbackWord() {
  const recent = new Set(getRecentWords());

  let available = fallbackWords.filter(item => {
    if (recent.has(item.word)) return false;

    if (currentWord && currentWord.word === item.word) {
      return false;
    }

    if (wordQueue.some(queued => queued.word === item.word)) {
      return false;
    }

    return true;
  });

  if (available.length === 0) {
    available = fallbackWords;
  }

  return available[
    Math.floor(Math.random() * available.length)
  ];
}

function maskTargetWord(sentence, word) {
  const escaped = escapeRegExp(word);
  const regex = new RegExp(`\\b${escaped}\\b`, "gi");

  return sentence.replace(regex, "_____");
}

function renderHints() {
  hintsElement.innerHTML = "";

  hintTypes.forEach((hint, index) => {
    const item = document.createElement("div");

    item.className = "hint";

    if (index === 0) {
      item.classList.add("available");
    } else {
      item.classList.add("locked");
    }

    const button = document.createElement("button");

    button.type = "button";
    button.className = "hint-button";

    button.innerHTML = `
      <span class="hint-name">${hint.name}</span>
      <span class="hint-cost">−${hint.cost} XP</span>
    `;

    const content = document.createElement("div");

    content.className = "hint-content";

    button.addEventListener("click", () => {
      if (solved || loadingWord || index !== hintIndex) return;

      useHint(
        hint,
        index,
        item,
        button,
        content
      );
    });

    item.append(
      button,
      content
    );

    hintsElement.appendChild(item);
  });
}

function useHint(hint, index, item, button, content) {
  currentXP = Math.max(0, currentXP - hint.cost);

  content.textContent = hint.getText();

  item.classList.remove("locked", "available");
  item.classList.add("open");

  button.disabled = true;

  hintIndex++;

  unlockNextHint(index + 1);
  updateXP();
  vibrate(12);
}

function unlockNextHint(index) {
  const hints = hintsElement.querySelectorAll(".hint");

  if (!hints[index]) return;

  hints[index].classList.remove("locked");
  hints[index].classList.add("available");
}

function revealNextLetter() {
  if (knownPrefixLength >= currentWord.word.length) return;

  const index = knownPrefixLength;

  letterOrigins[index] = "hint";
  knownPrefixLength++;

  renderLetters([index]);

  if (allLettersKnown()) {
    setTimeout(() => {
      finishRound({
        gaveUp: false
      });
    }, 600);
  }
}

helpToggle.addEventListener("click", () => {
  if (loadingWord) return;

  const open = help.classList.toggle("open");

  helpToggle.setAttribute("aria-expanded", String(open));
});

function closeHelp() {
  help.classList.remove("open");
  helpToggle.setAttribute("aria-expanded", "false");
}

function updateWordSizing() {
  if (!currentWord) return;

  setWordSize(currentWord.word.length);
}

function setWordSize(length) {
  const availableWidth = Math.min(window.innerWidth - 30, 1000);

  let gap = 14;

  if (length >= 8) {
    gap = 9;
  }

  if (length >= 11) {
    gap = 6;
  }

  if (length >= 14) {
    gap = 4;
  }

  const totalGap = gap * Math.max(0, length - 1);

  let width = (availableWidth - totalGap) / length;

  width = Math.min(94, width);
  width = Math.max(24, width);

  const height = width * 1.1;
  const font = Math.max(14, Math.min(46, width * 0.49));
  const radius = Math.max(7, Math.min(18, width * 0.2));

  lettersElement.style.setProperty("--letter-width", `${width}px`);
  lettersElement.style.setProperty("--letter-height", `${height}px`);
  lettersElement.style.setProperty("--letter-font", `${font}px`);
  lettersElement.style.setProperty("--letter-radius", `${radius}px`);
  lettersElement.style.setProperty("--letter-gap", `${gap}px`);
}

window.addEventListener("resize", updateWordSizing);

function renderLoadingLetters() {
  lettersElement.innerHTML = "";

  setWordSize(5);

  for (let index = 0; index < 5; index++) {
    const box = document.createElement("div");

    box.className = "letter loading-letter";

    lettersElement.appendChild(box);
  }
}

function renderLetters(newlyDiscovered = []) {
  if (!currentWord) return;

  lettersElement.innerHTML = "";

  updateWordSizing();

  const typed = guessInput.value.toLowerCase();

  for (let index = 0; index < currentWord.word.length; index++) {
    const box = document.createElement("div");

    box.className = "letter";

    if (solved) {
      box.textContent = currentWord.word[index].toUpperCase();
      box.classList.add("solved-letter");
    } else if (index < knownPrefixLength) {
      box.textContent = currentWord.word[index].toUpperCase();

      const origin = letterOrigins[index];

      if (index === 0 || origin === "start") {
        box.classList.add("start-letter");
      } else if (origin === "player") {
        box.classList.add("discovered");
      } else if (origin === "hint") {
        box.classList.add("hint-letter");
      }

      if (newlyDiscovered.includes(index)) {
        box.classList.add("just-discovered");

        box.style.animationDelay = `${
          newlyDiscovered.indexOf(index) * 90
        }ms`;
      }
    } else if (typed[index]) {
      box.textContent = typed[index].toUpperCase();
      box.classList.add("preview");
    }

    lettersElement.appendChild(box);
  }
}

guessInput.addEventListener("input", function () {
  if (!currentWord) return;

  this.value = this.value
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, currentWord.word.length);

  renderLetters();
});

guessForm.addEventListener("submit", event => {
  event.preventDefault();

  if (solved || loadingWord || !currentWord) return;

  const guess = guessInput.value
    .trim()
    .toLowerCase();

  if (guess.length !== currentWord.word.length) {
    invalidGuess(
      `Enter all ${currentWord.word.length} letters.`
    );

    return;
  }

  const knownPrefix = currentWord.word.slice(
    0,
    knownPrefixLength
  );

  if (!guess.startsWith(knownPrefix)) {
    invalidGuess(
      `The word starts with "${knownPrefix.toUpperCase()}".`
    );

    return;
  }

  playSound("submit");

  checkGuess(guess);
});

function checkGuess(guess) {
  const answer = currentWord.word;

  if (guess === answer) {
    finishRound({
      gaveUp: false
    });

    return;
  }

  const newlyDiscovered = [];

  let index = knownPrefixLength;

  while (index < answer.length) {
    if (guess[index] !== answer[index]) {
      break;
    }

    letterOrigins[index] = "player";

    newlyDiscovered.push(index);

    knownPrefixLength++;
    index++;
  }

  guessInput.value = "";

  renderLetters(newlyDiscovered);

  if (newlyDiscovered.length === 0) {
    feedback.textContent = "The next letter wasn't correct.";
    feedback.className = "feedback";

    shakeWord();
    vibrate(18);
  } else if (newlyDiscovered.length === 1) {
    feedback.textContent = "Next letter found.";
    feedback.className = "feedback success";

    vibrate(20);
  } else {
    feedback.textContent = `${newlyDiscovered.length} letters in a row found.`;
    feedback.className = "feedback success";

    vibrate([18, 25, 22]);
  }

  if (allLettersKnown()) {
    setTimeout(() => {
      finishRound({
        gaveUp: false
      });
    }, 520);

    return;
  }

  guessInput.focus();
}

function allLettersKnown() {
  return knownPrefixLength >= currentWord.word.length;
}

function invalidGuess(message) {
  feedback.textContent = message;
  feedback.className = "feedback error";

  shakeWord();
  vibrate(35);
}

function shakeWord() {
  lettersElement.classList.remove("shake");

  void lettersElement.offsetWidth;

  lettersElement.classList.add("shake");
}

giveUpButton.addEventListener("click", () => {
  if (solved || loadingWord || !currentWord) return;

  currentXP = Math.max(0, currentXP - 100);

  updateXP();

  finishRound({
    gaveUp: true
  });
});

function finishRound({ gaveUp: didGiveUp }) {
  if (solved) return;

  solved = true;
  gaveUp = didGiveUp;

  game.classList.add("solved");

  closeHelp();

  guessInput.value = "";
  guessInput.disabled = true;

  renderLetters();
  animateWin();

  if (gaveUp) {
    streak = 0;

    streakElement.textContent = streak;

    feedback.textContent = "Word revealed — press Enter to continue.";
    feedback.className = "feedback";

    saveStats();

    setTimeout(showResult, 300);

    prefetchNextWords();

    return;
  }

  feedback.textContent = "Correct — press Enter to continue.";
  feedback.className = "feedback success";

  totalXP += currentXP;
  streak++;

  totalXPElement.textContent = totalXP;
  streakElement.textContent = streak;

  saveStats();

  setTimeout(() => {
    playSound("success");
  }, 100);

  vibrate([24, 35, 48]);

  setTimeout(showResult, 480);

  prefetchNextWords();
}

function animateWin() {
  const boxes = lettersElement.querySelectorAll(".letter");

  boxes.forEach((box, index) => {
    setTimeout(() => {
      box.classList.add("win");
    }, Math.min(index * 55, 550));
  });
}

function showResult() {
  resultLabel.textContent = gaveUp
    ? "Word revealed"
    : "Word learned";

  document.getElementById("resultWord").textContent = currentWord.word;

  document.getElementById("resultTranslation").textContent =
    currentWord.german;

  document.getElementById("earnedXP").textContent = gaveUp
    ? 0
    : currentXP;

  document.getElementById("resultMeaning").textContent =
    currentWord.definition;

  document.getElementById("resultExample").textContent =
    currentWord.englishExample;

  document.getElementById("resultGermanExample").textContent =
    currentWord.germanExample;

  document.getElementById("resultWordType").textContent =
    currentWord.wordType;

  if (sourceNote) {
    sourceNote.textContent =
      currentWord.exampleSource === "Tatoeba"
        ? "Example pair from Tatoeba"
        : "Curated example";
  }

  result.classList.add("visible");

  setTimeout(() => {
    result.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 100);
}

nextButton.addEventListener("click", nextWord);

async function nextWord() {
  if (loadingWord) return;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  await startGame();
}

document.addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  if (event.repeat || loadingWord) return;
  if (!solved) return;
  if (soundPanel.classList.contains("open")) return;

  event.preventDefault();

  nextWord();
});

function updateXP() {
  currentXPElement.textContent = currentXP;
}

function loadStats() {
  const savedXP = Number(
    localStorage.getItem("guessTheWordXP")
  );

  const savedStreak = Number(
    localStorage.getItem("guessTheWordStreak")
  );

  if (Number.isFinite(savedXP)) {
    totalXP = savedXP;
  }

  if (Number.isFinite(savedStreak)) {
    streak = savedStreak;
  }

  totalXPElement.textContent = totalXP;
  streakElement.textContent = streak;
}

function saveStats() {
  localStorage.setItem("guessTheWordXP", totalXP);
  localStorage.setItem("guessTheWordStreak", streak);
}

async function fetchWithTimeout(url, timeout) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    return await fetch(url, {
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeWord(word) {
  if (typeof word !== "string") return null;

  const cleaned = word
    .trim()
    .toLowerCase();

  if (!/^[a-z]+$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

function cleanSentence(text) {
  if (typeof text !== "string") return "";

  return text
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGerman(text) {
  return String(text)
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsWholeWord(sentence, word) {
  const escaped = escapeRegExp(word);
  const regex = new RegExp(`\\b${escaped}\\b`, "i");

  return regex.test(sentence);
}

function escapeRegExp(text) {
  return text.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function tokenizeEnglish(text) {
  return text
    .toLowerCase()
    .match(/[a-z]+/g) || [];
}

function decodeHtmlEntities(text) {
  const textarea = document.createElement("textarea");

  textarea.innerHTML = text;

  return textarea.value;
}

function delay(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

function vibrate(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeSoundPanel();
  }
});

loadAudio();
loadSoundSettings();
loadStats();
initializeGame();