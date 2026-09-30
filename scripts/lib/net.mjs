// Squarespace occasionally drops HTTP/2 connections (GOAWAY) mid-crawl; retry those requests.
export async function withRetry(fn, { tries = 4, delayMs = 1000 } = {}) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (e) {
      if (i >= tries) throw e;
      await new Promise(r => setTimeout(r, delayMs * i));
    }
  }
}
export const fetchRetry = (url, opts) => withRetry(() => fetch(url, opts));
