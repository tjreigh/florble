import {
  GLYPH_MAP,
  GLYPH_PICKER_LETTERS,
  GUESSES,
  TARGETS,
  POSITIONAL_GUESSES,
  INITIAL_CAP,
  FINAL_CAP,
  renderWord,
  scorePositional,
  scorePositionless,
  glyphVariantMarker,
  isValidGuess,
  isDevelopmentHostname,
  dailyAnswer,
} from './game.mjs';

const els = {
  status: document.querySelector('#status'),
  board: document.querySelector('#board'),
  currentGuess: document.querySelector('#current-guess'),
  palette: document.querySelector('#palette'),
  submit: document.querySelector('#submit-button'),
  remove: document.querySelector('#delete-button'),
  rules: document.querySelector('#rules-button'),
  rulesDialog: document.querySelector('#rules-dialog'),
  closeRules: document.querySelector('#close-rules'),
  devControls: document.querySelector('#development-controls'),
  targetSelect: document.querySelector('#target-select'),
  resetTarget: document.querySelector('#reset-target-button'),
  targetDictionary: document.querySelector('#target-dictionary'),
  answerReveal: document.querySelector('#answer-reveal'),
  modeIndicator: document.querySelector('#mode-indicator'),
  guessCounter: document.querySelector('#guess-counter'),
};

const wordLength = TARGETS[0]?.length ?? 5;
const now = new Date();
const dateKey = utcDateKey(now);
const storageKey = `florble:v3:${dateKey}`;
const devTargetKey = 'florble:development-target';
const developmentMode = isDevelopmentHostname(window.location.hostname);
let answer = loadAnswer();

let guesses = loadGuesses();
let current = [];
let finished = false;

function utcDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function glyphFor(letter) {
  return GLYPH_MAP instanceof Map
    ? GLYPH_MAP.get(letter)
    : GLYPH_MAP[letter];
}

function loadAnswer() {
  if (developmentMode) {
    try {
      const savedTarget = localStorage.getItem(devTargetKey);
      if (TARGETS.includes(savedTarget?.toUpperCase())) return savedTarget.toUpperCase();
    } catch {
      // Fall back to the daily target when storage is unavailable.
    }
  }
  return dailyAnswer(now);
}

function loadGuesses() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved?.date !== dateKey || saved?.answer !== answer || !Array.isArray(saved.guesses)) {
      return [];
    }

    const restored = [];
    for (const guess of saved.guesses) {
      if (
        typeof guess !== 'string'
        || !isValidGuess(guess)
        || restored.includes(guess)
        || restored.length >= FINAL_CAP
      ) {
        break;
      }
      restored.push(guess);
      if (guess === answer) break;
    }
    return restored;
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      date: dateKey,
      answer,
      guesses,
      finished,
    }));
  } catch {
    // Storage is an enhancement; gameplay remains functional when it is unavailable.
  }
}

function setStatus(message, tone = '') {
  els.status.textContent = message;
  if (tone) els.status.dataset.tone = tone;
  else delete els.status.dataset.tone;
}

function scoreFor(guess, index) {
  return index < POSITIONAL_GUESSES
    ? scorePositional(guess, answer)
    : scorePositionless(guess, answer);
}

function feedbackLabel(value, positionless) {
  if (value === 'exact') return 'correct glyph identity and position';
  if (value === 'present') {
    return positionless ? 'glyph identity occurs in the answer; position withheld' : 'glyph identity occurs in another position';
  }
  return 'glyph identity does not occur in the answer';
}

function buildGuessRow(guess, feedback, index) {
  const positionless = index >= POSITIONAL_GUESSES;
  const row = document.createElement('div');
  row.className = 'guess-row';
  row.dataset.mode = positionless ? 'positionless' : 'positional';
  row.setAttribute('role', 'row');
  row.setAttribute('aria-label', `Submitted glyph guess ${index + 1}`);

  [...guess].forEach((letter, position) => {
    const result = feedback[position];
    const tile = document.createElement('span');
    tile.className = `tile feedback-${result}`;
    tile.dataset.feedback = result;
    tile.dataset.state = result;
    appendTileContents(tile, letter);
    tile.title = feedbackLabel(result, positionless);
    tile.setAttribute('aria-label', `${glyphIdentityLabel(letter)}, ${feedbackLabel(result, positionless)}`);
    tile.setAttribute('role', 'gridcell');
    row.append(tile);
  });

  return row;
}

function appendTileContents(tile, letter) {
  const glyph = document.createElement('span');
  glyph.className = 'tile-glyph';
  glyph.textContent = glyphFor(letter);
  glyph.setAttribute('aria-hidden', 'true');

  const marker = document.createElement('span');
  marker.className = 'tile-letter';
  marker.textContent = glyphVariantMarker(letter);
  marker.setAttribute('aria-hidden', 'true');
  tile.append(glyph, marker);
}

function glyphIdentityLabel(letter) {
  const marker = glyphVariantMarker(letter);
  return marker ? `glyph ${glyphFor(letter)}, variant ${marker.length}` : `glyph ${glyphFor(letter)}`;
}

function renderCurrent() {
  els.currentGuess.replaceChildren();
  for (let index = 0; index < wordLength; index += 1) {
    const tile = document.createElement('span');
    tile.className = 'tile current-tile';
    const letter = current[index];
    if (letter) appendTileContents(tile, letter);
    tile.setAttribute('aria-label', letter ? `${glyphIdentityLabel(letter)}, position ${index + 1}` : `Empty position ${index + 1}`);
    els.currentGuess.append(tile);
  }
  els.currentGuess.title = 'Current glyph guess';
  els.currentGuess.setAttribute('aria-label', current.length
    ? `Current glyph guess: ${current.map(glyphIdentityLabel).join(', ')}`
    : 'Current guess, empty');
  els.submit.disabled = finished || current.length !== wordLength;
  els.remove.disabled = finished || current.length === 0;
  els.palette.querySelectorAll('button').forEach((button) => {
    button.disabled = finished || current.length >= wordLength;
  });
}

function updateSummary() {
  const degraded = guesses.length >= POSITIONAL_GUESSES && !finished;
  const cap = degraded ? FINAL_CAP : (finished && guesses.length > POSITIONAL_GUESSES ? FINAL_CAP : INITIAL_CAP);
  els.modeIndicator.textContent = degraded || guesses.length > POSITIONAL_GUESSES
    ? 'Positionless feedback'
    : 'Position feedback';
  const displayedGuess = finished ? guesses.length : Math.min(guesses.length + 1, cap);
  els.guessCounter.textContent = `Guess ${displayedGuess} of ${cap}`;
}

function reveal(outcome) {
  els.answerReveal.hidden = false;
  els.answerReveal.replaceChildren();

  const result = document.createElement('strong');
  result.className = 'reveal-outcome';
  result.textContent = outcome;

  const canonical = document.createElement('p');
  canonical.textContent = `Canonical answer: ${answer}`;

  const specimen = document.createElement('p');
  specimen.className = 'rendered-answer';
  specimen.setAttribute('aria-label', `Rendered specimen for ${answer}`);
  specimen.append('Rendered specimen: ');
  const glyphs = document.createElement('span');
  glyphs.textContent = renderWord(answer);
  glyphs.setAttribute('aria-hidden', 'true');
  specimen.append(glyphs);

  els.answerReveal.append(result, canonical, specimen);
}

function deriveFinishedState() {
  const winningIndex = guesses.indexOf(answer);
  const won = winningIndex >= 0;
  const lost = !won && guesses.length >= FINAL_CAP;
  finished = won || lost;
  if (won) {
    reveal('Solved.');
    setStatus(`Solved in ${winningIndex + 1} guesses.`);
  } else if (lost) {
    reveal('No guesses remain.');
    setStatus('No guesses remain.');
  }
}

function addLetter(letter) {
  if (finished || current.length >= wordLength) return;
  current.push(letter);
  renderCurrent();
  setStatus('');
}

function deleteLetter() {
  if (finished || current.length === 0) return;
  current.pop();
  renderCurrent();
  setStatus('');
}

function submitGuess() {
  if (finished) return;
  if (current.length !== wordLength) {
    setStatus(`Choose ${wordLength} glyphs before submitting.`, 'error');
    return;
  }

  const guess = current.join('');
  if (!isValidGuess(guess)) {
    setStatus('That glyph sequence does not resolve to an accepted word. No guess was used.', 'error');
    return;
  }
  if (guesses.includes(guess)) {
    setStatus('That exact underlying word was already submitted. No guess was used.', 'error');
    return;
  }

  const index = guesses.length;
  const feedback = scoreFor(guess, index);
  guesses.push(guess);
  els.board.append(buildGuessRow(guess, feedback, index));
  current = [];

  if (guess === answer) {
    finished = true;
    reveal('Solved.');
    setStatus(`Solved in ${guesses.length} guesses.`);
  } else if (guesses.length >= FINAL_CAP) {
    finished = true;
    reveal('No guesses remain.');
    setStatus('No guesses remain.');
  } else if (guesses.length === POSITIONAL_GUESSES) {
    setStatus(`Position data has been withdrawn. Your guess limit has increased from ${INITIAL_CAP} to ${FINAL_CAP}.`);
  } else {
    setStatus('Guess recorded.');
  }

  updateSummary();
  renderCurrent();
  save();
}

function buildPalette() {
  const fragment = document.createDocumentFragment();
  GLYPH_PICKER_LETTERS.forEach((letter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'glyph-button';
    button.title = glyphIdentityLabel(letter);
    button.setAttribute('aria-label', `Add ${glyphIdentityLabel(letter)}`);

    const glyph = document.createElement('span');
    glyph.className = 'picker-glyph';
    glyph.textContent = glyphFor(letter);
    glyph.setAttribute('aria-hidden', 'true');

    const legend = document.createElement('span');
    legend.className = 'picker-letter';
    legend.textContent = glyphVariantMarker(letter);
    legend.setAttribute('aria-hidden', 'true');

    button.append(glyph, legend);
    button.addEventListener('click', () => addLetter(letter));
    fragment.append(button);
  });
  els.palette.replaceChildren(fragment);
}

function buildTargetDictionary() {
  els.targetDictionary.textContent = `${GUESSES.length} accepted guesses. Possible targets: ${TARGETS.join(', ')}`;

  if (!developmentMode) return;
  const options = TARGETS.map((target) => {
    const option = document.createElement('option');
    option.value = target;
    option.textContent = target;
    return option;
  });
  els.targetSelect.replaceChildren(...options);
  els.targetSelect.value = answer;
}

function restoreBoard() {
  els.board.replaceChildren();
  guesses.forEach((guess, index) => {
    els.board.append(buildGuessRow(guess, scoreFor(guess, index), index));
  });
}

function resetTarget() {
  if (!developmentMode) return;

  const selectedTarget = els.targetSelect.value;
  if (!TARGETS.includes(selectedTarget)) return;

  answer = selectedTarget;
  guesses = [];
  current = [];
  finished = false;

  try {
    localStorage.setItem(devTargetKey, answer);
  } catch {
    // The reset still works for the current page when storage is unavailable.
  }

  restoreBoard();
  els.answerReveal.hidden = true;
  els.answerReveal.replaceChildren();
  setStatus(`Development target set to ${answer}. A fresh puzzle is ready.`);
  updateSummary();
  renderCurrent();
  save();
}

// A tab left open across UTC midnight must move to the new deterministic puzzle.
const nextUtcMidnight = Date.UTC(
  now.getUTCFullYear(),
  now.getUTCMonth(),
  now.getUTCDate() + 1,
);
window.setTimeout(() => window.location.reload(), nextUtcMidnight - now.getTime() + 50);

els.submit.addEventListener('click', submitGuess);
els.remove.addEventListener('click', deleteLetter);
if (developmentMode) {
  els.devControls.hidden = false;
  els.targetSelect.addEventListener('change', resetTarget);
  els.resetTarget.addEventListener('click', resetTarget);
}
els.rules.addEventListener('click', () => {
  if (typeof els.rulesDialog.showModal === 'function') els.rulesDialog.showModal();
  else els.rulesDialog.setAttribute('open', '');
});
els.closeRules.addEventListener('click', () => {
  if (typeof els.rulesDialog.close === 'function') els.rulesDialog.close();
  else els.rulesDialog.removeAttribute('open');
});

document.addEventListener('keydown', (event) => {
  if (els.rulesDialog.open || event.metaKey || event.ctrlKey || event.altKey) return;
  const interactive = event.target.closest?.('button, a, input, textarea, select, [contenteditable="true"]');
  if (event.key === 'Backspace' && !interactive) {
    event.preventDefault();
    deleteLetter();
  } else if (event.key === 'Enter' && !interactive) {
    event.preventDefault();
    submitGuess();
  }
});

buildTargetDictionary();
buildPalette();
restoreBoard();
deriveFinishedState();
if (!finished && guesses.length >= POSITIONAL_GUESSES) {
  setStatus(`Position data is withdrawn. The active guess limit is ${FINAL_CAP}.`);
} else if (!finished && guesses.length > 0) {
  setStatus(`Restored ${guesses.length} submitted ${guesses.length === 1 ? 'guess' : 'guesses'}.`);
}
updateSummary();
renderCurrent();
save();
