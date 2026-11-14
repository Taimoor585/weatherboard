import { AppError } from './types';

/** fetch() with a timeout, abort support and human-readable errors. */
export async function request<T>(
  url: string,
  opts: { signal?: AbortSignal; timeout?: number; headers?: Record<string, string>; service: string },
): Promise<T> {
  const { signal, timeout = 9000, headers, service } = opts;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new AppError(
      'offline',
      `You're offline, so ${service} can't be reached.`,
      'Reconnect to the internet — your last viewed city is still available.',
    );
  }
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, timeout);

  let res: Response;
  try {
    res = await fetch(url, { signal: ctrl.signal, headers });
  } catch (err) {
    if (signal?.aborted) throw err; // caller cancelled — let them ignore it
    if (timedOut) {
      throw new AppError('timeout', `${service} took too long to respond.`, 'The service may be busy. Try again in a few seconds.');
    }
    throw new AppError(
      'network',
      `Couldn't connect to ${service}.`,
      'Check your internet connection, or disable any blocker that might stop the request, then retry.',
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  if (res.status === 429) {
    throw new AppError('rate-limit', `${service} is rate-limiting requests right now.`, 'Wait a moment and try again.');
  }
  if (res.status === 401 || res.status === 403) {
    throw new AppError('auth', `${service} rejected the API key.`, 'Check the API key in your .env file.');
  }
  if (res.status === 404) {
    throw new AppError('not-found', `${service} has no data for that location.`, 'Try a nearby, larger city.');
  }
  if (!res.ok) {
    throw new AppError('server', `${service} returned an error (${res.status}).`, 'This is usually temporary — try again shortly.');
  }
  try {
    return (await res.json()) as T;
  } catch {
    throw new AppError('bad-data', `${service} sent a response we couldn't read.`, 'Try again — if it keeps happening, the service may be changing.');
  }
}

export const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';
