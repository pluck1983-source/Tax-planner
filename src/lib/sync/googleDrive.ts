import { Capacitor } from '@capacitor/core';
import { AuthRequiredError, type CloudProvider, type RemoteFileMeta } from './types';

/**
 * Google Drive backend. Signs in with Google's browser-only OAuth flow (a
 * full-page redirect to Google and back - no server, no popup, so it works
 * on an iPhone home-screen app) and keeps one JSON file in the Drive "app
 * data" folder: a hidden folder only this app can see. The drive.appdata
 * scope never reaches the rest of the user's Drive.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'tax-planner-data.json';
/**
 * The access token lives in sessionStorage, not localStorage: it is only good
 * for an hour, and keeping it per-tab means it is gone when the tab or app is
 * closed instead of sitting on disk. The sign-in redirect comes back to the
 * same tab (the CSRF state above is already per-tab), so nothing is lost; a
 * new tab just does the usual silent re-sign-in.
 */
const TOKEN_KEY = 'tax-planner-gdrive-token';
/** CSRF check for the sign-in round trip */
const STATE_KEY = 'tax-planner-gdrive-oauth-state';
/** Set when a silent re-sign-in has been tried this session, so it isn't retried in a loop */
const SILENT_TRIED_KEY = 'tax-planner-gdrive-silent-tried';

interface StoredToken {
  token: string;
  expiresAt: number;
}

interface DriveFile {
  id: string;
  modifiedTime: string;
  version: string;
}

function redirectUri(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href;
}

function readToken(): StoredToken | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredToken;
    // Treat tokens as expired a minute early so a request doesn't race expiry.
    return parsed.expiresAt - 60_000 > Date.now() ? parsed : null;
  } catch {
    return null;
  }
}

function writeToken(token: StoredToken | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  else sessionStorage.removeItem(TOKEN_KEY);
}

/**
 * Picks up the access token Google appends to the URL after a sign-in
 * redirect, then removes it from the address bar. Runs once when this module
 * loads, before the app renders.
 */
function consumeRedirectResult() {
  if (!window.location.hash.includes('state=')) return;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const expectedState = sessionStorage.getItem(STATE_KEY);
  if (!expectedState || params.get('state') !== expectedState) return;
  sessionStorage.removeItem(STATE_KEY);
  const token = params.get('access_token');
  if (token) {
    writeToken({ token, expiresAt: Date.now() + Number(params.get('expires_in') ?? 3600) * 1000 });
    sessionStorage.removeItem(SILENT_TRIED_KEY);
  }
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

// Older builds kept the token in localStorage; remove any left behind.
try {
  localStorage.removeItem(TOKEN_KEY);
} catch {
  // storage unavailable - nothing to clear
}
consumeRedirectResult();

function redirectToGoogle(silent: boolean): Promise<never> {
  if (!CLIENT_ID) return Promise.reject(new Error('Google Drive sync is not configured for this build'));
  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: SCOPE,
    state,
    include_granted_scopes: 'true',
    // "none" bounces straight back if the user is still signed in to Google
    // and has already allowed the app; otherwise it returns an error and we
    // show the Reconnect button instead.
    prompt: silent ? 'none' : 'select_account',
  });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  // The page is navigating away - nothing after this should run.
  return new Promise<never>(() => {});
}

async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const stored = readToken();
  if (!stored) throw new AuthRequiredError();
  const response = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${stored.token}` },
  });
  if (response.status === 401) {
    writeToken(null);
    throw new AuthRequiredError();
  }
  if (!response.ok) throw new Error(`Google Drive request failed (${response.status})`);
  return response;
}

function toMeta(file: DriveFile): RemoteFileMeta {
  return { id: file.id, modifiedTime: file.modifiedTime, version: file.version };
}

const FIELDS = 'id,modifiedTime,version';

export const googleDriveProvider: CloudProvider = {
  id: 'google-drive',
  label: 'Google Drive',

  // The native iOS shell serves the app from capacitor://localhost, which
  // Google won't accept as a sign-in redirect - sync is web/PWA only.
  isConfigured: () => Boolean(CLIENT_ID) && !Capacitor.isNativePlatform(),

  async signIn(interactive) {
    if (interactive) return redirectToGoogle(false);
    if (readToken()) return;
    // Tokens only last an hour, so a returning visit usually needs a fresh
    // one. Try one silent round trip per session while online; if Google
    // wants the user to act, it comes back without a token and we stop here.
    if (navigator.onLine && !sessionStorage.getItem(SILENT_TRIED_KEY)) {
      sessionStorage.setItem(SILENT_TRIED_KEY, '1');
      return redirectToGoogle(true);
    }
    throw new AuthRequiredError();
  },

  async signOut() {
    const stored = readToken();
    writeToken(null);
    if (stored) {
      // Best effort - revokes this app's access so a later sign-in asks again.
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(stored.token)}`, {
        method: 'POST',
      }).catch(() => {});
    }
  },

  async getMeta() {
    const params = new URLSearchParams({
      spaces: 'appDataFolder',
      q: `name = '${FILE_NAME}' and trashed = false`,
      fields: `files(${FIELDS})`,
      orderBy: 'modifiedTime desc',
    });
    const response = await driveFetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    const body = (await response.json()) as { files: DriveFile[] };
    return body.files[0] ? toMeta(body.files[0]) : null;
  },

  async download(meta) {
    const response = await driveFetch(`https://www.googleapis.com/drive/v3/files/${meta.id}?alt=media`);
    return response.text();
  },

  async upload(content, existing) {
    if (existing) {
      const response = await driveFetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media&fields=${FIELDS}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: content },
      );
      return toMeta((await response.json()) as DriveFile);
    }
    const boundary = `taxplanner${Date.now()}`;
    const metadata = { name: FILE_NAME, parents: ['appDataFolder'], mimeType: 'application/json' };
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
    const response = await driveFetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=${FIELDS}`,
      { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body },
    );
    return toMeta((await response.json()) as DriveFile);
  },
};
