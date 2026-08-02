import { ALPHABET, isCanonicalLetter, type CanonicalLetter } from '../../domain/shared/alphabet';
import type { GlyphId } from '../../domain/shared/identifiers';
import { findCipherContradictions } from '../../domain/cipher/cipher-constraints';
import { createCipherState, reduceCipher } from '../../domain/cipher/cipher-reducer';
import type {
  CipherAssignment,
  CipherEvent,
  CipherFileDefinition,
  CipherState,
} from '../../domain/cipher/cipher-types';
import { systemClock, type Clock } from '../../platform/clock';
import {
  createLocalCipherPersistence,
  type CipherPersistence,
} from '../../platform/cipher-persistence';

interface CipherElements {
  readonly view: HTMLElement;
  readonly panel: HTMLElement;
  readonly brief: HTMLElement;
  readonly candidateSummary: HTMLElement;
  readonly status: HTMLElement;
  readonly progress: HTMLElement;
  readonly specimens: HTMLElement;
  readonly selectedGlyph: HTMLElement;
  readonly letterPicker: HTMLElement;
  readonly clearAssignment: HTMLButtonElement;
  readonly confirmAssignment: HTMLButtonElement;
  readonly contradictions: HTMLElement;
  readonly candidates: HTMLElement;
  readonly assignments: HTMLElement;
  readonly viability: HTMLElement;
  readonly revealHint: HTMLButtonElement;
  readonly hintList: HTMLOListElement;
  readonly completion: HTMLElement;
  readonly reset: HTMLButtonElement;
}

interface CipherStatusMessage {
  readonly message: string;
  readonly tone?: 'error';
}

export interface MountCipherAppOptions {
  readonly clock?: Clock;
  readonly persistence?: CipherPersistence;
}

export interface CipherApp {
  showFile(file: CipherFileDefinition): void;
}

export function mountCipherApp(
  file: CipherFileDefinition,
  root: Document = document,
  options: MountCipherAppOptions = {},
): CipherApp {
  const controller = new CipherController(file, root, options);
  controller.mount();
  return controller;
}

class CipherController {
  private readonly elements: CipherElements;
  private readonly clock: Clock;
  private readonly persistence: CipherPersistence;
  private state: CipherState;
  private selectedGlyphId: GlyphId | null = null;
  private status: CipherStatusMessage = {
    message: 'Pick a symbol from any row, then choose the letter you think it represents.',
  };

  constructor(
    private file: CipherFileDefinition,
    private readonly root: Document,
    options: MountCipherAppOptions,
  ) {
    this.elements = queryElements(root);
    this.clock = options.clock ?? systemClock;
    this.persistence = options.persistence ?? createLocalCipherPersistence(window.localStorage);
    this.state = this.restoreState();
    if (this.state.assignments.length > 0 || this.state.revealedHintIds.length > 0) {
      this.status = this.state.status === 'solved'
        ? { message: 'Welcome back — this puzzle is already solved.' }
        : {
            message: `Picked up where you left off: ${this.state.assignments.length} ${this.state.assignments.length === 1 ? 'symbol' : 'symbols'} filled in.`,
          };
      this.save();
    }
  }

  mount(): void {
    this.buildLetterPicker();
    this.bindEvents();
    this.render();
  }

  showFile(file: CipherFileDefinition): void {
    if (file.id === this.file.id) return;
    this.file = file;
    this.selectedGlyphId = null;
    this.state = this.restoreState();
    this.status = this.restoredStatus();
    if (this.state.assignments.length > 0 || this.state.revealedHintIds.length > 0) this.save();
    this.render();
  }

  private bindEvents(): void {
    this.elements.clearAssignment.addEventListener('click', () => {
      if (!this.selectedGlyphId) return;
      this.dispatch({ type: 'assignment-cleared', glyphId: this.selectedGlyphId });
    });
    this.elements.confirmAssignment.addEventListener('click', () => {
      if (!this.selectedGlyphId) return;
      this.dispatch({
        type: 'assignment-confirmed',
        glyphId: this.selectedGlyphId,
        occurredAt: this.clock.now().toISOString(),
      });
    });
    this.elements.revealHint.addEventListener('click', () => {
      const hint = this.file.hints.find((candidate) => (
        !this.state.revealedHintIds.includes(candidate.id)
      ));
      if (hint) this.dispatch({ type: 'hint-revealed', hintId: hint.id });
    });
    this.elements.reset.addEventListener('click', () => this.reset());
    this.root.addEventListener('keydown', (event) => this.handleKeydown(event));
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (this.elements.view.hidden || !this.selectedGlyphId || this.state.status === 'solved') return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const editingControl = event.target instanceof Element
      ? event.target.closest('input, textarea, select, [contenteditable="true"]')
      : null;
    if (editingControl) return;
    const letter = event.key.toUpperCase();
    if (event.key.length === 1 && isCanonicalLetter(letter)) {
      event.preventDefault();
      this.dispatch({ type: 'assignment-set', glyphId: this.selectedGlyphId, letter });
    }
  }

  private dispatch(event: CipherEvent): void {
    const transition = reduceCipher(this.state, event, this.file);
    if (!transition.accepted) {
      this.status = { message: plainCipherRejection(transition.rejection.code), tone: 'error' };
      this.render();
      return;
    }
    this.state = transition.state;
    this.status = { message: statusForEvent(event, this.state, this.file) };
    this.save();
    this.render();
  }

  private selectGlyph(glyphId: GlyphId): void {
    this.selectedGlyphId = glyphId;
    const glyph = this.glyph(glyphId);
    this.status = { message: `${glyph.accessibleName} selected. Which letter does it stand for?` };
    this.render();
  }

  private reset(): void {
    this.state = createCipherState({
      file: this.file,
      startedAt: this.clock.now().toISOString(),
    });
    this.selectedGlyphId = null;
    this.status = { message: 'Fresh start. Pick any symbol to begin.' };
    this.save();
    this.render();
  }

  private buildLetterPicker(): void {
    const buttons = ALPHABET.map((letter) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = letter;
      button.dataset.letter = letter;
      button.setAttribute('aria-label', `Try letter ${letter} for the selected symbol`);
      button.addEventListener('click', () => {
        if (!this.selectedGlyphId) return;
        this.dispatch({ type: 'assignment-set', glyphId: this.selectedGlyphId, letter });
      });
      return button;
    });
    this.elements.letterPicker.replaceChildren(...buttons);
  }

  private render(): void {
    const contradictions = findCipherContradictions(this.file, this.state);
    const contradictionGlyphs = new Set(contradictions.flatMap((item) => item.glyphIds));
    const assignmentMap = new Map(
      this.state.assignments.map((assignment) => [assignment.glyphId, assignment]),
    );

    this.renderFileDetails();
    this.renderStatus();
    this.renderProgress();
    this.renderSpecimens(assignmentMap, contradictionGlyphs);
    this.renderSelected(assignmentMap);
    this.renderContradictions(contradictions);
    this.renderCandidates(assignmentMap);
    this.renderLedger(assignmentMap, contradictionGlyphs);
    this.renderHints();
    this.renderCompletion(assignmentMap);
    this.elements.viability.textContent = contradictions.length === 0
      ? 'Everything fits'
      : 'Something doesn\'t fit';
    this.elements.viability.dataset.state = contradictions.length === 0 ? 'viable' : 'contradiction';
    this.elements.panel.dataset.phase = this.state.status;
  }

  private renderFileDetails(): void {
    const decoys = this.file.candidateWords.length - this.file.specimens.length;
    this.elements.brief.textContent = this.file.brief;
    this.elements.candidateSummary.textContent = `${this.file.specimens.length} answers · ${decoys} decoys`;
  }

  private renderStatus(): void {
    this.elements.status.textContent = this.status.message;
    if (this.status.tone) this.elements.status.dataset.tone = this.status.tone;
    else delete this.elements.status.dataset.tone;
  }

  private renderProgress(): void {
    const confirmed = this.state.assignments.filter((assignment) => (
      assignment.confidence === 'confirmed'
    )).length;
    this.elements.progress.textContent = this.state.status === 'solved'
      ? 'Puzzle solved'
      : `${confirmed} of ${this.file.glyphs.length} letters locked`;
  }

  private renderSpecimens(
    assignments: ReadonlyMap<GlyphId, CipherAssignment>,
    contradictionGlyphs: ReadonlySet<GlyphId>,
  ): void {
    const rows = this.file.specimens.map((specimen, index) => {
      const row = document.createElement('div');
      row.className = 'cipher-specimen-row';
      const label = document.createElement('span');
      label.className = 'specimen-label';
      label.textContent = String(index + 1).padStart(2, '0');
      label.setAttribute('aria-hidden', 'true');
      row.append(label);

      const cells = document.createElement('div');
      cells.className = 'cipher-specimen-cells';
      cells.setAttribute('role', 'group');
      cells.setAttribute('aria-label', `Symbol row ${index + 1}`);
      for (const glyphId of specimen.glyphs) {
        cells.append(this.buildGlyphButton(glyphId, assignments.get(glyphId), contradictionGlyphs));
      }
      row.append(cells);

      const relation = document.createElement('span');
      relation.className = 'specimen-relation';
      relation.textContent = index === 0 ? 'START' : '1 change';
      row.append(relation);
      return row;
    });
    this.elements.specimens.replaceChildren(...rows);
  }

  private buildGlyphButton(
    glyphId: GlyphId,
    assignment: CipherAssignment | undefined,
    contradictionGlyphs: ReadonlySet<GlyphId>,
  ): HTMLButtonElement {
    const glyph = this.glyph(glyphId);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cipher-glyph-cell';
    button.dataset.glyphId = glyphId;
    if (assignment) button.dataset.confidence = assignment.confidence;
    if (glyphId === this.selectedGlyphId) button.dataset.selected = 'true';
    if (contradictionGlyphs.has(glyphId)) button.dataset.contradiction = 'true';
    button.disabled = this.state.status === 'solved';
    button.setAttribute(
      'aria-label',
      `${glyph.accessibleName}, ${assignment ? assignment.confidence === 'confirmed' ? `letter ${assignment.letter} locked in` : `trying letter ${assignment.letter}` : 'no letter chosen'}`,
    );
    button.addEventListener('click', () => this.selectGlyph(glyphId));

    const symbol = document.createElement('span');
    symbol.className = 'cipher-symbol';
    symbol.textContent = glyph.display;
    symbol.setAttribute('aria-hidden', 'true');
    const plaintext = document.createElement('span');
    plaintext.className = 'cipher-plaintext';
    plaintext.textContent = assignment?.letter ?? '?';
    plaintext.setAttribute('aria-hidden', 'true');
    button.append(symbol, plaintext);
    return button;
  }

  private renderSelected(assignments: ReadonlyMap<GlyphId, CipherAssignment>): void {
    const assignment = this.selectedGlyphId ? assignments.get(this.selectedGlyphId) : undefined;
    if (!this.selectedGlyphId) {
      this.elements.selectedGlyph.textContent = 'No symbol selected';
    } else {
      const glyph = this.glyph(this.selectedGlyphId);
      this.elements.selectedGlyph.replaceChildren(
        glyphBadge(glyph.display),
        document.createTextNode(
          assignment
            ? `${glyph.accessibleName} → ${assignment.letter} (${assignment.confidence === 'confirmed' ? 'locked' : 'guess'})`
            : `${glyph.accessibleName} → no letter chosen`,
        ),
      );
    }

    this.elements.letterPicker.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      const selected = button.dataset.letter === assignment?.letter;
      if (selected) button.dataset.selected = 'true';
      else delete button.dataset.selected;
      button.disabled = !this.selectedGlyphId || this.state.status === 'solved';
    });
    this.elements.clearAssignment.disabled = !assignment || this.state.status === 'solved';
    this.elements.confirmAssignment.disabled = !assignment
      || assignment.confidence === 'confirmed'
      || this.state.status === 'solved';
  }

  private renderContradictions(
    contradictions: ReturnType<typeof findCipherContradictions>,
  ): void {
    if (contradictions.length === 0) {
      this.elements.contradictions.hidden = true;
      this.elements.contradictions.replaceChildren();
      return;
    }
    const heading = document.createElement('strong');
    heading.textContent = 'Something doesn\'t fit yet';
    const list = document.createElement('ul');
    for (const contradiction of contradictions) {
      const item = document.createElement('li');
      if (contradiction.code === 'duplicate-letter') {
        const names = contradiction.glyphIds.map((glyphId) => this.glyph(glyphId).accessibleName);
        item.textContent = `The letter ${contradiction.letter ?? ''} is being used for both ${names[0]} and ${names[1]}. Each letter can belong to only one symbol.`;
      } else {
        item.textContent = 'Those letter choices cannot make a complete word ladder from the word bank.';
      }
      list.append(item);
    }
    this.elements.contradictions.hidden = false;
    this.elements.contradictions.replaceChildren(heading, list);
  }

  private renderCandidates(assignments: ReadonlyMap<GlyphId, CipherAssignment>): void {
    const decodedWords = new Set(this.file.specimens.map((specimen) => (
      specimen.glyphs.map((glyphId) => assignments.get(glyphId)?.letter ?? '?').join('')
    )));
    const chips = this.file.candidateWords.map((word) => {
      const chip = document.createElement('span');
      chip.className = 'candidate-chip';
      chip.textContent = word;
      if (decodedWords.has(word)) chip.dataset.resolved = 'true';
      return chip;
    });
    this.elements.candidates.replaceChildren(...chips);
  }

  private renderLedger(
    assignments: ReadonlyMap<GlyphId, CipherAssignment>,
    contradictionGlyphs: ReadonlySet<GlyphId>,
  ): void {
    const rows = this.file.glyphs.map((glyph) => {
      const assignment = assignments.get(glyph.id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ledger-entry';
      if (assignment) button.dataset.confidence = assignment.confidence;
      if (contradictionGlyphs.has(glyph.id)) button.dataset.contradiction = 'true';
      if (glyph.id === this.selectedGlyphId) button.dataset.selected = 'true';
      button.disabled = this.state.status === 'solved';
      button.addEventListener('click', () => this.selectGlyph(glyph.id));
      button.setAttribute('aria-label', `Select ${glyph.accessibleName}`);
      button.append(
        glyphBadge(glyph.display),
        document.createTextNode(assignment ? assignment.letter : '—'),
      );
      const confidence = document.createElement('small');
      confidence.textContent = assignment
        ? assignment.confidence === 'confirmed' ? 'locked' : 'guess'
        : 'not chosen';
      button.append(confidence);
      return button;
    });
    this.elements.assignments.replaceChildren(...rows);
  }

  private renderHints(): void {
    const revealed = this.file.hints.filter((hint) => this.state.revealedHintIds.includes(hint.id));
    this.elements.hintList.replaceChildren(...revealed.map((hint) => {
      const item = document.createElement('li');
      item.textContent = hint.text;
      return item;
    }));
    const remaining = this.file.hints.length - revealed.length;
    this.elements.revealHint.disabled = remaining === 0 || this.state.status === 'solved';
    this.elements.revealHint.textContent = remaining === 0
      ? 'No more hints'
      : `Show hint ${revealed.length + 1} of ${this.file.hints.length}`;
  }

  private renderCompletion(assignments: ReadonlyMap<GlyphId, CipherAssignment>): void {
    if (this.state.status !== 'solved') {
      this.elements.completion.hidden = true;
      this.elements.completion.replaceChildren();
      return;
    }
    const heading = document.createElement('strong');
    heading.className = 'result-score';
    heading.textContent = 'You solved it!';
    const message = document.createElement('p');
    message.className = 'reveal-outcome';
    message.textContent = `All ${this.file.specimens.length} words are decoded, and every symbol fits.`;
    const words = document.createElement('p');
    words.textContent = this.file.specimens.map((specimen) => (
      specimen.glyphs.map((glyphId) => assignments.get(glyphId)?.letter ?? '?').join('')
    )).join(' · ');
    this.elements.completion.hidden = false;
    this.elements.completion.replaceChildren(heading, message, words);
  }

  private restoreState(): CipherState {
    let stored: CipherState | null = null;
    try {
      stored = this.persistence.load(this.file.id);
    } catch {
      // A clean state below keeps the active puzzle playable.
    }
    let state = createCipherState({
      file: this.file,
      startedAt: stored?.startedAt ?? this.clock.now().toISOString(),
    });
    if (!stored) return state;

    for (const hintId of stored.revealedHintIds) {
      const transition = reduceCipher(state, { type: 'hint-revealed', hintId }, this.file);
      if (transition.accepted) state = transition.state;
    }
    for (const assignment of stored.assignments) {
      const tentative = reduceCipher(state, {
        type: 'assignment-set',
        glyphId: assignment.glyphId,
        letter: assignment.letter,
      }, this.file);
      if (!tentative.accepted) continue;
      state = tentative.state;
      if (assignment.confidence === 'confirmed') {
        const confirmed = reduceCipher(state, {
          type: 'assignment-confirmed',
          glyphId: assignment.glyphId,
          occurredAt: stored.completedAt ?? this.clock.now().toISOString(),
        }, this.file);
        if (confirmed.accepted) state = confirmed.state;
      }
    }
    return state;
  }

  private save(): void {
    try {
      this.persistence.save(this.state);
    } catch {
      // Persistence is optional for the active browser session.
    }
  }

  private restoredStatus(): CipherStatusMessage {
    if (this.state.status === 'solved') {
      return { message: 'Welcome back — this puzzle is already solved.' };
    }
    if (this.state.assignments.length > 0 || this.state.revealedHintIds.length > 0) {
      return {
        message: `Picked up where you left off: ${this.state.assignments.length} ${this.state.assignments.length === 1 ? 'symbol' : 'symbols'} filled in.`,
      };
    }
    return {
      message: 'Pick a symbol from any row, then choose the letter you think it represents.',
    };
  }

  private glyph(glyphId: GlyphId) {
    const glyph = this.file.glyphs.find((candidate) => candidate.id === glyphId);
    if (!glyph) throw new Error(`Unknown Cipher glyph: ${glyphId}`);
    return glyph;
  }
}

function statusForEvent(
  event: CipherEvent,
  state: CipherState,
  file: CipherFileDefinition,
): string {
  if (state.status === 'solved') return 'You got it — every word is decoded.';
  if (event.type === 'assignment-set') {
    return `Trying ${event.letter} for the ${glyphName(file, event.glyphId)}.`;
  }
  if (event.type === 'assignment-confirmed') {
    const assignment = state.assignments.find((candidate) => candidate.glyphId === event.glyphId);
    return `Locked in: the ${glyphName(file, event.glyphId)} is ${assignment?.letter ?? '?'}.`;
  }
  if (event.type === 'assignment-cleared') return `Cleared the letter for the ${glyphName(file, event.glyphId)}.`;
  const hint = file.hints.find((candidate) => candidate.id === event.hintId);
  return `Hint: ${hint?.text ?? event.hintId}`;
}

function glyphName(file: CipherFileDefinition, glyphId: GlyphId): string {
  return file.glyphs.find((glyph) => glyph.id === glyphId)?.accessibleName ?? 'symbol';
}

function plainCipherRejection(code: string): string {
  if (code === 'letter-confirmed-elsewhere') return 'That letter is already locked to another symbol.';
  if (code === 'assignment-missing') return 'Choose a letter before locking it in.';
  if (code === 'file-complete') return 'This puzzle is already solved.';
  if (code === 'hint-already-revealed') return 'That hint is already showing.';
  return 'That move does not work here.';
}

function glyphBadge(display: string): HTMLSpanElement {
  const badge = document.createElement('span');
  badge.className = 'ledger-glyph';
  badge.textContent = display;
  badge.setAttribute('aria-hidden', 'true');
  return badge;
}

function queryElements(root: Document): CipherElements {
  return {
    view: requiredElement(root, '#cipher-view'),
    panel: requiredElement(root, '#cipher-panel'),
    brief: requiredElement(root, '#cipher-brief'),
    candidateSummary: requiredElement(root, '#cipher-candidate-summary'),
    status: requiredElement(root, '#cipher-status'),
    progress: requiredElement(root, '#cipher-progress'),
    specimens: requiredElement(root, '#cipher-specimens'),
    selectedGlyph: requiredElement(root, '#selected-glyph'),
    letterPicker: requiredElement(root, '#cipher-letter-picker'),
    clearAssignment: requiredElement(root, '#clear-assignment'),
    confirmAssignment: requiredElement(root, '#confirm-assignment'),
    contradictions: requiredElement(root, '#cipher-contradictions'),
    candidates: requiredElement(root, '#cipher-candidates'),
    assignments: requiredElement(root, '#cipher-assignments'),
    viability: requiredElement(root, '#cipher-viability'),
    revealHint: requiredElement(root, '#reveal-cipher-hint'),
    hintList: requiredElement(root, '#cipher-hint-list'),
    completion: requiredElement(root, '#cipher-completion'),
    reset: requiredElement(root, '#reset-cipher-file'),
  };
}

function requiredElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required Cipher element: ${selector}`);
  return element;
}
