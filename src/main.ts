import { CIPHER_FILE_001, CIPHER_FILES } from './content/cipher-files';
import { mountCipherApp, type CipherApp } from './ui/cipher/cipher-controller';
import { mountDailyApp } from './ui/daily/daily-controller';
import './styles.css';

mountDailyApp();
const cipherApp = mountCipherApp(CIPHER_FILE_001);
mountRouter(cipherApp);

function mountRouter(cipher: CipherApp): void {
  const dailyView = requiredElement<HTMLElement>('#daily-view');
  const cipherView = requiredElement<HTMLElement>('#cipher-view');
  const dailyHeaderActions = requiredElement<HTMLElement>('#daily-header-actions');
  const cipherFileSelect = requiredElement<HTMLSelectElement>('#cipher-file-select');
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-route-link]')];

  cipherFileSelect.replaceChildren(...CIPHER_FILES.map((file) => {
    const option = document.createElement('option');
    option.value = file.id;
    const fileNumber = file.id.replace('file-', '').padStart(3, '0');
    option.textContent = `Puzzle ${fileNumber} · ${difficultyLabel(file.metadata.difficulty)}`;
    return option;
  }));
  cipherFileSelect.addEventListener('change', () => {
    window.location.hash = `#/cipher/${cipherFileSelect.value}`;
  });

  const renderRoute = (): void => {
    const dailyActive = window.location.hash === '#/daily';
    const requestedFileId = window.location.hash.match(/^#\/cipher\/(file-[a-z0-9-]+)$/)?.[1];
    const activeFile = CIPHER_FILES.find((file) => file.id === requestedFileId) ?? CIPHER_FILE_001;
    if (!dailyActive) {
      cipher.showFile(activeFile);
      cipherFileSelect.value = activeFile.id;
    }
    dailyView.hidden = !dailyActive;
    cipherView.hidden = dailyActive;
    dailyHeaderActions.hidden = !dailyActive;
    document.body.dataset.route = dailyActive ? 'daily' : 'cipher';
    for (const link of links) {
      const active = link.dataset.routeLink === (dailyActive ? 'daily' : 'cipher');
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    if (!dailyActive) cipherView.focus({ preventScroll: true });
  };

  window.addEventListener('hashchange', renderRoute);
  if (!window.location.hash) window.history.replaceState(null, '', '#/cipher/file-001');
  renderRoute();
}

function difficultyLabel(difficulty: 1 | 2 | 3 | 4 | 5): string {
  return ['Gentle', 'Easy', 'Medium', 'Tricky', 'Hard'][difficulty - 1] ?? 'Unknown';
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing application element: ${selector}`);
  return element;
}
