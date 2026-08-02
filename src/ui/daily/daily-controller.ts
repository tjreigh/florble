import {
  dailyDictionary,
  type DailyDictionary,
} from '../../content/daily/accepted-guesses';
import {
  dailyTargetResolver,
  type DailyTargetResolver,
} from '../../content/daily/target-resolver';
import { TARGET_WORDS } from '../../content/daily/target-words';
import {
  GLYPH_MAP,
  GLYPH_PICKER_ROWS,
  renderWord,
} from '../../domain/daily/daily-alphabet';
import type { LetterFeedback } from '../../domain/daily/daily-scoring';
import {
  isCanonicalLetter,
  type CanonicalLetter,
} from '../../domain/shared/alphabet';
import {
  createDailyState,
  reduceDaily,
} from '../../domain/daily/daily-reducer';
import {
  formatDailyOfficialResult,
  formatDailyResult,
} from '../../domain/daily/daily-result';
import {
  OVERTIME_AUTHORIZATION_DELAY_MS,
  confirmedAssistancePositions,
  isUnboundedOvertimeAllowance,
} from '../../domain/daily/overtime';
import type {
  DailyEvent,
  DailyRules,
  DailyState,
  DailyTransition,
} from '../../domain/daily/daily-types';
import {
  millisecondsUntilNextUtcDay,
  systemClock,
  type Clock,
} from '../../platform/clock';
import { isDevelopmentHostname } from '../../platform/development-host';
import {
  createLocalDailyPersistence,
  type DailyPersistence,
  type PersistedDailySession,
} from '../../platform/daily-persistence';

interface DailyElements {
  readonly view: HTMLElement;
  readonly instrument: HTMLElement;
  readonly status: HTMLDivElement;
  readonly board: HTMLDivElement;
  readonly currentGuess: HTMLDivElement;
  readonly palette: HTMLDivElement;
  readonly submit: HTMLButtonElement;
  readonly remove: HTMLButtonElement;
  readonly rules: HTMLButtonElement;
  readonly rulesDialog: HTMLDialogElement;
  readonly closeRules: HTMLButtonElement;
  readonly devControls: HTMLDivElement;
  readonly targetSelect: HTMLSelectElement;
  readonly resetTarget: HTMLButtonElement;
  readonly answerReveal: HTMLElement;
  readonly overtimeAssistance: HTMLElement;
  readonly modeIndicator: HTMLParagraphElement;
  readonly guessCounter: HTMLParagraphElement;
}

export interface MountDailyAppOptions {
  readonly clock?: Clock;
  readonly dictionary?: DailyDictionary;
  readonly persistence?: DailyPersistence;
  readonly targetResolver?: DailyTargetResolver;
}

interface StatusMessage {
  readonly message: string;
  readonly tone?: 'error';
}

export function mountDailyApp(
  root: Document = document,
  options: MountDailyAppOptions = {},
): void {
  new DailyController(root, options).mount();
}

class DailyController {
  private readonly elements: DailyElements;
  private readonly clock: Clock;
  private readonly now: Date;
  private readonly dateKey: string;
  private readonly persistence: DailyPersistence;
  private readonly developmentMode: boolean;
  private readonly rules: DailyRules;

  private state: DailyState;
  private status: StatusMessage = { message: 'Build a five-letter word to begin.' };
  private overtimeTimer: number | null = null;

  constructor(
    private readonly root: Document,
    options: MountDailyAppOptions,
  ) {
    this.elements = queryElements(root);
    this.clock = options.clock ?? systemClock;
    this.now = this.clock.now();
    const puzzle = (options.targetResolver ?? dailyTargetResolver).resolve(this.now);
    this.dateKey = puzzle.id;
    this.persistence = options.persistence ?? createLocalDailyPersistence(window.localStorage);
    this.developmentMode = isDevelopmentHostname(window.location.hostname);
    const dictionary = options.dictionary ?? dailyDictionary;
    this.rules = { isAcceptedGuess: (word) => dictionary.accepts(word) };
    const answer = this.loadAnswer(puzzle.answer);
    const initial = createDailyState({ puzzleId: this.dateKey, answer });
    this.state = this.restoreSession(initial);
    this.status = this.restoredStatus();
    if (this.state.guesses.length > 0 || this.state.currentGuess.length > 0) this.saveSession();
  }

  mount(): void {
    this.buildDevelopmentTargets();
    this.buildPalette();
    this.bindEvents();
    this.render();
    this.scheduleOvertimeAuthorization();

    window.setTimeout(
      () => window.location.reload(),
      millisecondsUntilNextUtcDay(this.now) + 50,
    );
  }

  private bindEvents(): void {
    this.elements.submit.addEventListener('click', () => this.dispatch(this.submittedEvent()));
    this.elements.remove.addEventListener('click', () => this.dispatch({ type: 'letter-removed' }));

    if (this.developmentMode) {
      this.elements.devControls.hidden = false;
      this.elements.targetSelect.addEventListener('change', () => this.resetTarget());
      this.elements.resetTarget.addEventListener('click', () => this.resetTarget());
    }

    this.elements.rules.addEventListener('click', () => {
      if (typeof this.elements.rulesDialog.showModal === 'function') {
        this.elements.rulesDialog.showModal();
      } else {
        this.elements.rulesDialog.setAttribute('open', '');
      }
    });
    this.elements.closeRules.addEventListener('click', () => {
      if (typeof this.elements.rulesDialog.close === 'function') {
        this.elements.rulesDialog.close();
      } else {
        this.elements.rulesDialog.removeAttribute('open');
      }
    });

    this.root.addEventListener('keydown', (event) => this.handleKeydown(event));
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (
      this.elements.view.hidden
      ||
      this.elements.rulesDialog.open
      || event.metaKey
      || event.ctrlKey
      || event.altKey
    ) return;

    const editingControl = event.target instanceof Element
      ? event.target.closest('input, textarea, select, [contenteditable="true"]')
      : null;
    if (editingControl) return;

    const commandControl = event.target instanceof Element
      ? event.target.closest('button, a')
      : null;
    if (commandControl && (event.key === 'Enter' || event.key === ' ')) return;

    const letter = event.key.toUpperCase();
    if (event.key.length === 1 && isCanonicalLetter(letter)) {
      event.preventDefault();
      this.dispatch({ type: 'letter-added', letter });
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      this.dispatch({ type: 'letter-removed' });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.dispatch(this.submittedEvent());
    }
  }

  private dispatch(event: DailyEvent): void {
    const previous = this.state;
    const transition = reduceDaily(previous, event, this.rules);
    if (!transition.accepted) {
      this.status = { message: transition.rejection.message, tone: 'error' };
      this.render();
      return;
    }

    this.state = transition.state;
    this.status = this.statusForAcceptedEvent(previous, event);
    this.saveSession();
    this.render();
    this.scheduleOvertimeAuthorization();
  }

  private statusForAcceptedEvent(previous: DailyState, event: DailyEvent): StatusMessage {
    if (event.type === 'letter-added' || event.type === 'letter-removed') return { message: '' };
    if (event.type === 'overtime-authorized') {
      const authorization = overtimeAuthorizationStatus(this.state.overtimeAllowance);
      if (this.state.assistanceLevel === previous.assistanceLevel) {
        return { message: authorization };
      }
      const positions = this.state.assistanceLevel === 1 ? 'position' : 'positions';
      return {
        message: `${authorization} ${this.state.assistanceLevel} answer ${positions} revealed.`,
      };
    }
    if (this.state.phase === 'complete') {
      return { message: solvedStatus(this.state) };
    }
    if (this.state.phase === 'overtime-pending') {
      return {
        message: previous.phase === 'official'
          ? 'Six guesses used. Hang on…'
          : overtimePendingStatus(this.state.guesses.length - this.state.officialLimit),
      };
    }
    return { message: 'Guess added.' };
  }

  private scheduleOvertimeAuthorization(): void {
    if (this.state.phase !== 'overtime-pending' || this.overtimeTimer !== null) return;
    this.overtimeTimer = window.setTimeout(() => {
      this.overtimeTimer = null;
      this.dispatch({ type: 'overtime-authorized' });
    }, OVERTIME_AUTHORIZATION_DELAY_MS);
  }

  private render(): void {
    this.renderStatus();
    this.renderSummary();
    this.renderBoard();
    this.renderCurrentGuess();
    this.renderPaletteState();
    this.renderAssistance();
    this.renderAnswer();
    this.elements.instrument.dataset.phase = this.state.phase;
  }

  private renderStatus(): void {
    this.elements.status.textContent = this.status.message;
    if (this.status.tone) this.elements.status.dataset.tone = this.status.tone;
    else delete this.elements.status.dataset.tone;
  }

  private renderSummary(): void {
    switch (this.state.phase) {
      case 'official':
        this.elements.modeIndicator.textContent = 'Word clues';
        this.elements.guessCounter.textContent = `Guess ${this.state.guesses.length + 1} of ${this.state.officialLimit}`;
        break;
      case 'overtime-pending':
        this.elements.modeIndicator.textContent = 'Getting another guess';
        this.elements.guessCounter.textContent = this.isUnboundedOvertime()
          ? `Overtime · ${this.state.guesses.length} submitted`
          : `Guess ${this.state.guesses.length} of ${this.state.officialLimit + this.state.overtimeAllowance}`;
        break;
      case 'overtime':
        this.elements.modeIndicator.textContent = 'Overtime clues';
        this.elements.guessCounter.textContent = this.isUnboundedOvertime()
          ? `Overtime · Guess ${this.state.guesses.length + 1}`
          : `Guess ${this.state.guesses.length + 1} of ${this.state.officialLimit + this.state.overtimeAllowance}`;
        break;
      case 'complete':
        this.elements.modeIndicator.textContent = 'Puzzle complete';
        this.elements.guessCounter.textContent = `Result ${formatDailyResult(this.state.result)}`;
        break;
    }
  }

  private renderBoard(): void {
    const rows = this.state.guesses.map((guess, index) => (
      buildGuessRow(guess.word, guess.feedback, index)
    ));
    this.elements.board.replaceChildren(...rows);
    this.elements.board.scrollTop = this.elements.board.scrollHeight;
  }

  private renderCurrentGuess(): void {
    const tiles: HTMLElement[] = [];
    for (let index = 0; index < this.state.wordLength; index += 1) {
      const tile = document.createElement('span');
      tile.className = 'tile current-tile';
      const letter = this.state.currentGuess[index];
      if (letter) appendTileContents(tile, letter);
      tile.setAttribute(
        'aria-label',
        letter
          ? `${glyphIdentityLabel(letter)}, position ${index + 1}`
          : `Empty position ${index + 1}`,
      );
      tiles.push(tile);
    }
    this.elements.currentGuess.replaceChildren(...tiles);
    this.elements.currentGuess.title = 'Current word';
    this.elements.currentGuess.setAttribute(
      'aria-label',
      this.state.currentGuess.length > 0
        ? `Current word: ${this.state.currentGuess.map(glyphIdentityLabel).join(', ')}`
        : 'Current guess, empty',
    );

    const inputAvailable = acceptsInput(this.state);
    this.elements.submit.disabled = !inputAvailable
      || this.state.currentGuess.length !== this.state.wordLength;
    this.elements.remove.disabled = !inputAvailable || this.state.currentGuess.length === 0;
  }

  private buildPalette(): void {
    const fragment = document.createDocumentFragment();
    for (const letters of GLYPH_PICKER_ROWS) {
      const row = document.createElement('div');
      row.className = 'palette-row';
      row.dataset.keyCount = String(letters.length);
      row.setAttribute('role', 'group');

      for (const letter of letters) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'glyph-button';
        button.dataset.letter = letter;
        button.title = glyphIdentityLabel(letter);
        button.setAttribute('aria-label', `Add ${glyphIdentityLabel(letter)}`);

        const glyph = document.createElement('span');
        glyph.className = 'picker-glyph';
        glyph.textContent = glyphFor(letter);
        glyph.setAttribute('aria-hidden', 'true');

        button.append(glyph);
        button.addEventListener('click', () => this.dispatch({ type: 'letter-added', letter }));
        row.append(button);
      }
      fragment.append(row);
    }
    this.elements.palette.replaceChildren(fragment);
  }

  private renderPaletteState(): void {
    const disabled = !acceptsInput(this.state)
      || this.state.currentGuess.length >= this.state.wordLength;
    const knowledge = derivePaletteKnowledge(this.state);
    this.elements.palette.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      button.disabled = disabled;
      const letter = button.dataset.letter;
      if (!letter || !isCanonicalLetter(letter)) return;
      const feedback = knowledge.get(letter) ?? 'unused';
      if (feedback === 'unused') delete button.dataset.state;
      else button.dataset.state = feedback;
      button.dataset.knowledge = feedback;
      const identity = glyphIdentityLabel(letter);
      button.title = `${identity}: ${paletteKnowledgeLabel(feedback)}`;
      button.setAttribute(
        'aria-label',
        `Add ${identity}, ${paletteKnowledgeLabel(feedback)}`,
      );
    });
  }

  private renderAssistance(): void {
    const count = Math.min(this.state.assistanceLevel, this.state.wordLength);
    if (count === 0) {
      this.elements.overtimeAssistance.hidden = true;
      this.elements.overtimeAssistance.replaceChildren();
      return;
    }

    const heading = document.createElement('strong');
    heading.textContent = 'Revealed letters';
    const summary = document.createElement('p');
    summary.textContent = `${count} of ${this.state.wordLength} answer letters revealed.`;
    const row = document.createElement('div');
    row.className = 'assistance-row';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', `${count} revealed answer letters`);
    const confirmedPositions = new Set<number>(confirmedAssistancePositions(count));

    for (let index = 0; index < this.state.wordLength; index += 1) {
      const tile = document.createElement('span');
      tile.className = 'tile assistance-tile';
      const answerLetter = this.state.answer[index];
      if (confirmedPositions.has(index) && answerLetter && isCanonicalLetter(answerLetter)) {
        tile.dataset.confirmed = 'true';
        appendTileContents(tile, answerLetter);
        tile.setAttribute('aria-label', `Position ${index + 1}: ${glyphIdentityLabel(answerLetter)}`);
      } else {
        tile.textContent = '?';
        tile.setAttribute('aria-label', `Position ${index + 1}: not revealed`);
      }
      row.append(tile);
    }

    this.elements.overtimeAssistance.hidden = false;
    this.elements.overtimeAssistance.replaceChildren(heading, summary, row);
  }

  private renderAnswer(): void {
    if (this.state.phase !== 'complete') {
      this.elements.answerReveal.hidden = true;
      this.elements.answerReveal.replaceChildren();
      return;
    }

    const result = document.createElement('strong');
    result.className = 'result-score';
    result.textContent = `Result ${formatDailyResult(this.state.result)}`;

    const outcome = document.createElement('p');
    outcome.className = 'reveal-outcome';
    outcome.textContent = solvedStatus(this.state);

    const official = document.createElement('p');
    official.className = 'official-record';
    official.textContent = `Official score: ${formatDailyOfficialResult(this.state.officialResult)}`;

    const canonical = document.createElement('p');
    canonical.textContent = `Answer: ${this.state.answer}`;

    const specimen = document.createElement('p');
    specimen.className = 'rendered-answer';
    specimen.setAttribute('aria-label', `Symbols for ${this.state.answer}`);
    specimen.append('Symbols: ');
    const glyphs = document.createElement('span');
    glyphs.textContent = renderWord(this.state.answer);
    glyphs.setAttribute('aria-hidden', 'true');
    specimen.append(glyphs);

    this.elements.answerReveal.hidden = false;
    this.elements.answerReveal.replaceChildren(result, outcome, official, canonical, specimen);
  }

  private buildDevelopmentTargets(): void {
    if (!this.developmentMode) return;

    const options = TARGET_WORDS.map((target) => {
      const option = document.createElement('option');
      option.value = target;
      option.textContent = target;
      return option;
    });
    this.elements.targetSelect.replaceChildren(...options);
    this.elements.targetSelect.value = this.state.answer;
  }

  private resetTarget(): void {
    const selected = this.elements.targetSelect.value;
    if (!this.developmentMode || !TARGET_WORDS.includes(selected)) return;
    if (this.overtimeTimer !== null) {
      window.clearTimeout(this.overtimeTimer);
      this.overtimeTimer = null;
    }

    this.state = createDailyState({ puzzleId: this.dateKey, answer: selected });
    this.status = { message: `Started a fresh ${selected} puzzle.` };
    try {
      this.persistence.saveDevelopmentTarget(selected);
    } catch {
      // Development controls still work for the active page when storage is unavailable.
    }
    this.saveSession();
    this.render();
  }

  private loadAnswer(defaultAnswer: string): string {
    if (this.developmentMode) {
      try {
        const saved = this.persistence.loadDevelopmentTarget()?.toUpperCase();
        if (saved && TARGET_WORDS.includes(saved)) return saved;
      } catch {
        // Fall back to the daily answer when storage is unavailable.
      }
    }
    return defaultAnswer;
  }

  private restoreSession(initial: DailyState): DailyState {
    let stored: PersistedDailySession | null = null;
    try {
      stored = this.persistence.load(this.dateKey);
    } catch {
      return initial;
    }
    if (!stored || stored.answer !== initial.answer) return initial;

    let state = initial;
    for (const savedGuess of stored.guesses) {
      if (state.phase === 'complete') break;
      if (state.phase === 'overtime-pending') {
        const authorization = reduceDaily(state, { type: 'overtime-authorized' }, this.rules);
        if (!authorization.accepted) break;
        state = authorization.state;
      }

      const letters = [...savedGuess.word];
      if (letters.length !== state.wordLength || !letters.every(isCanonicalLetter)) break;
      const replayed = replayGuess(state, letters, this.rules, savedGuess.submittedAt);
      if (!replayed.accepted) break;
      state = replayed.state;
    }

    while (
      state.phase === 'overtime-pending'
      && state.overtimeAllowance < stored.overtimeAllowance
    ) {
      const authorization = reduceDaily(state, { type: 'overtime-authorized' }, this.rules);
      if (!authorization.accepted) break;
      state = authorization.state;
    }
    for (const letter of stored.currentGuess) {
      if (!isCanonicalLetter(letter)) break;
      const transition = reduceDaily(state, { type: 'letter-added', letter }, this.rules);
      if (!transition.accepted) break;
      state = transition.state;
    }
    return state;
  }

  private saveSession(): void {
    try {
      this.persistence.save({
        schemaVersion: 4,
        puzzleId: this.dateKey,
        answer: this.state.answer,
        guesses: this.state.guesses.map((guess) => ({
          word: guess.word,
          submittedAt: guess.submittedAt,
        })),
        currentGuess: this.state.currentGuess.join(''),
        overtimeAllowance: this.state.overtimeAllowance,
        assistanceLevel: this.state.assistanceLevel,
        officialResult: this.state.officialResult,
      });
    } catch {
      // Persistence remains optional during the controller migration.
    }
  }

  private submittedEvent(): DailyEvent {
    return { type: 'guess-submitted', submittedAt: this.clock.now().toISOString() };
  }

  private restoredStatus(): StatusMessage {
    if (this.state.phase === 'complete') return { message: solvedStatus(this.state) };
    if (this.state.guesses.length > 0) {
      return {
        message: `Welcome back — ${this.state.guesses.length} ${this.state.guesses.length === 1 ? 'guess' : 'guesses'} restored.`,
      };
    }
    return { message: 'Build a five-letter word to begin.' };
  }

  private isUnboundedOvertime(): boolean {
    return isUnboundedOvertimeAllowance(this.state.overtimeAllowance);
  }
}

function queryElements(root: Document): DailyElements {
  return {
    view: requiredElement(root, '#daily-view'),
    instrument: requiredElement(root, '.instrument-panel'),
    status: requiredElement(root, '#status'),
    board: requiredElement(root, '#board'),
    currentGuess: requiredElement(root, '#current-guess'),
    palette: requiredElement(root, '#palette'),
    submit: requiredElement(root, '#submit-button'),
    remove: requiredElement(root, '#delete-button'),
    rules: requiredElement(root, '#rules-button'),
    rulesDialog: requiredElement(root, '#rules-dialog'),
    closeRules: requiredElement(root, '#close-rules'),
    devControls: requiredElement(root, '#development-controls'),
    targetSelect: requiredElement(root, '#target-select'),
    resetTarget: requiredElement(root, '#reset-target-button'),
    answerReveal: requiredElement(root, '#answer-reveal'),
    overtimeAssistance: requiredElement(root, '#overtime-assistance'),
    modeIndicator: requiredElement(root, '#mode-indicator'),
    guessCounter: requiredElement(root, '#guess-counter'),
  };
}

function requiredElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}

function replayGuess(
  initial: DailyState,
  letters: readonly CanonicalLetter[],
  rules: DailyRules,
  submittedAt: string,
): DailyTransition {
  let state = initial;
  for (const letter of letters) {
    const transition = reduceDaily(state, { type: 'letter-added', letter }, rules);
    if (!transition.accepted) return transition;
    state = transition.state;
  }
  return reduceDaily(state, { type: 'guess-submitted', submittedAt }, rules);
}

function buildGuessRow(
  guess: string,
  feedback: readonly LetterFeedback[],
  index: number,
): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'guess-row';
  row.dataset.mode = 'positional';
  row.setAttribute('role', 'row');
  row.setAttribute('aria-label', `Submitted guess ${index + 1}`);

  [...guess].forEach((letter, position) => {
    const result = feedback[position];
    if (!result || !isCanonicalLetter(letter)) {
      throw new Error(`Invalid submitted guess at position ${position}`);
    }
    const tile = document.createElement('span');
    tile.className = `tile feedback-${result}`;
    tile.dataset.feedback = result;
    tile.dataset.state = result;
    appendTileContents(tile, letter);
    tile.title = feedbackLabel(result);
    tile.setAttribute('aria-label', `${glyphIdentityLabel(letter)}, ${feedbackLabel(result)}`);
    tile.setAttribute('role', 'gridcell');
    row.append(tile);
  });
  return row;
}

function appendTileContents(tile: HTMLElement, letter: CanonicalLetter): void {
  const glyph = document.createElement('span');
  glyph.className = 'tile-glyph';
  glyph.textContent = glyphFor(letter);
  glyph.setAttribute('aria-hidden', 'true');

  tile.append(glyph);
}

function glyphFor(letter: CanonicalLetter): string {
  return GLYPH_MAP[letter];
}

function glyphIdentityLabel(letter: CanonicalLetter): string {
  return `letter ${letter}, symbol ${glyphFor(letter)}`;
}

function feedbackLabel(value: LetterFeedback): string {
  if (value === 'exact') return 'right letter, right spot';
  if (value === 'present') return 'right letter, wrong spot';
  return 'letter is not in the answer';
}

function acceptsInput(state: DailyState): boolean {
  return state.phase === 'official' || state.phase === 'overtime';
}

type PaletteKnowledge = LetterFeedback | 'unused';

function derivePaletteKnowledge(state: DailyState): Map<CanonicalLetter, LetterFeedback> {
  const priority: Readonly<Record<LetterFeedback, number>> = {
    absent: 1,
    present: 2,
    exact: 3,
  };
  const knowledge = new Map<CanonicalLetter, LetterFeedback>();

  for (const guess of state.guesses) {
    [...guess.word].forEach((letter, index) => {
      const feedback = guess.feedback[index];
      if (!feedback || !isCanonicalLetter(letter)) return;
      const current = knowledge.get(letter);
      if (!current || priority[feedback] > priority[current]) knowledge.set(letter, feedback);
    });
  }
  return knowledge;
}

function paletteKnowledgeLabel(value: PaletteKnowledge): string {
  if (value === 'exact') return 'right in at least one spot';
  if (value === 'present') return 'in the answer';
  if (value === 'absent') return 'not in the answer';
  return 'not tried yet';
}

function overtimeAuthorizationStatus(allowance: number): string {
  if (allowance === 1) return 'Not solved yet. One more guess is ready.';
  if (allowance === 2) return 'Still going. Here\'s another guess.';
  if (allowance === 3) return 'No need to stop. Overtime is now open.';
  return 'Keep going — another guess is ready.';
}

function overtimePendingStatus(overtimeGuesses: number): string {
  if (overtimeGuesses === 1) return 'That one didn\'t solve it. One moment…';
  if (overtimeGuesses === 2) return 'Still not there. Hang on…';
  return 'No luck yet. Getting another guess…';
}

function solvedStatus(state: Extract<DailyState, { phase: 'complete' }>): string {
  if (state.result.status === 'solved') {
    return `Solved in ${state.result.officialGuesses} guesses.`;
  }
  return `Solved after ${state.result.overtimeGuesses} overtime ${state.result.overtimeGuesses === 1 ? 'guess' : 'guesses'}.`;
}
