/** Identify hostnames used by the project's local development server. */
export function isDevelopmentHostname(hostname: unknown): hostname is string {
  if (typeof hostname !== 'string') return false;
  const normalized = hostname.toLowerCase();
  return normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized === '127.0.0.1'
    || normalized === '0.0.0.0'
    || normalized === '::1'
    || normalized === '[::1]';
}
