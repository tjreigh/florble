import { expect, test } from 'vitest';

import { isDevelopmentHostname } from '../../src/platform/development-host';

test('development hosts are restricted to local server addresses', () => {
  for (const hostname of ['localhost', 'app.localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']) {
    expect(isDevelopmentHostname(hostname)).toBe(true);
  }
  for (const hostname of ['florble.example', 'localhost.example', '', null]) {
    expect(isDevelopmentHostname(hostname)).toBe(false);
  }
});
