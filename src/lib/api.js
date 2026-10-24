const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');

export const UNAUTHORIZED_EVENT = 'bdgy:unauthorized';

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message || `Request failed (${status})`);
    this.status = status;
    this.code = body?.error?.code;
    this.details = body?.error?.details;
    this.missing = body?.error?.missing;
  }
}

/**
 * fetch wrapper: always sends the auth cookie, parses JSON, throws ApiError on non-2xx.
 * A 401 on any request (other than the login/me checks) broadcasts UNAUTHORIZED_EVENT,
 * which the auth provider turns into a redirect to /login.
 */
export async function api(path, { method = 'GET', body, query, signal, silent401 = false } = {}) {
  const url = new URL(API_URL + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
  }

  const isForm = body instanceof FormData;
  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: 'include',
      signal,
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, { error: { message: 'Cannot reach the API. Check your connection or VITE_API_URL.', code: 'NETWORK' } });
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 401 && !silent401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(res.status, data);
  }
  return data;
}

export const apiUrl = API_URL;
export const webUrl = (import.meta.env.VITE_WEB_URL || '').replace(/\/+$/, '');
export const publicCaseStudyUrl = (slug) => (webUrl ? `${webUrl}/case-studies/${slug}` : null);
