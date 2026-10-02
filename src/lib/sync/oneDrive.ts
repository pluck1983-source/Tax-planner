import type { IPublicClientApplication } from '@azure/msal-browser';
import { Capacitor } from '@capacitor/core';
import { AuthRequiredError, type CloudProvider, type RemoteFileMeta } from './types';

/**
 * OneDrive backend. Signs in with Microsoft (MSAL, browser-only OAuth with
 * PKCE - no server) and keeps one JSON file in the app's own folder,
 * OneDrive > Apps > <app name>. The Files.ReadWrite.AppFolder permission only
 * reaches that folder, never the rest of the user's OneDrive.
 */

const CLIENT_ID = import.meta.env.VITE_ONEDRIVE_CLIENT_ID as string | undefined;
const SCOPES = ['Files.ReadWrite.AppFolder'];
const FILE_NAME = 'tax-planner-data.json';
const GRAPH = 'https://graph.microsoft.com/v1.0';
const FILE_URL = `${GRAPH}/me/drive/special/approot:/${FILE_NAME}`;

interface DriveItem {
  id: string;
  eTag: string;
  lastModifiedDateTime: string;
  '@microsoft.graph.downloadUrl'?: string;
}

let clientPromise: Promise<IPublicClientApplication> | null = null;

/**
 * Loads MSAL on first use (it's only needed once sync is switched on) and
 * completes a sign-in redirect if the page has just come back from one.
 */
function getClient(): Promise<IPublicClientApplication> {
  if (!CLIENT_ID) return Promise.reject(new Error('OneDrive sync is not configured for this build'));
  if (!clientPromise) {
    clientPromise = (async () => {
      const { PublicClientApplication } = await import('@azure/msal-browser');
      const client = new PublicClientApplication({
        auth: {
          clientId: CLIENT_ID,
          // "common" accepts both personal Microsoft accounts and work/school accounts.
          authority: 'https://login.microsoftonline.com/common',
          redirectUri: new URL(import.meta.env.BASE_URL, window.location.origin).href,
        },
        // localStorage so a sign-in survives closing the app, not just the tab.
        cache: { cacheLocation: 'localStorage' },
      });
      await client.initialize();
      try {
        const result = await client.handleRedirectPromise();
        if (result?.account) client.setActiveAccount(result.account);
      } catch {
        // Sign-in was cancelled or failed on Microsoft's page - carry on
        // signed out; the next token request reports that as AuthRequiredError.
      }
      return client;
    })();
    clientPromise.catch(() => {
      clientPromise = null;
    });
  }
  return clientPromise;
}

async function getToken(): Promise<string> {
  const client = await getClient();
  const account = client.getActiveAccount() ?? client.getAllAccounts()[0];
  if (!account) throw new AuthRequiredError();
  try {
    const result = await client.acquireTokenSilent({ scopes: SCOPES, account });
    return result.accessToken;
  } catch {
    // Expired refresh token, or the browser blocked the silent fallback -
    // either way the user has to sign in again.
    throw new AuthRequiredError();
  }
}

async function graphFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const response = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  if (response.status === 401) throw new AuthRequiredError();
  return response;
}

function toMeta(item: DriveItem): RemoteFileMeta {
  return { id: item.id, modifiedTime: item.lastModifiedDateTime, version: item.eTag };
}

async function getItem(): Promise<DriveItem | null> {
  const response = await graphFetch(FILE_URL);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`OneDrive request failed (${response.status})`);
  return (await response.json()) as DriveItem;
}

export const oneDriveProvider: CloudProvider = {
  id: 'onedrive',
  label: 'OneDrive',

  // The native iOS shell serves the app from capacitor://localhost, which
  // Microsoft won't accept as a sign-in redirect - sync is web/PWA only.
  isConfigured: () => Boolean(CLIENT_ID) && !Capacitor.isNativePlatform(),

  async signIn(interactive) {
    if (!interactive) {
      await getToken();
      return;
    }
    const client = await getClient();
    // Full-page redirect rather than a popup - popups are unreliable on
    // iPhone, especially for an app installed to the home screen.
    await client.loginRedirect({ scopes: SCOPES, prompt: 'select_account' });
    await new Promise<never>(() => {});
  },

  async signOut() {
    const client = await getClient().catch(() => null);
    // Forget the sign-in on this device only, without signing out of Microsoft everywhere.
    await client?.clearCache();
  },

  async getMeta() {
    const item = await getItem();
    return item ? toMeta(item) : null;
  },

  async download() {
    // Graph's /content endpoint redirects in a way browsers reject (CORS), so
    // use the short-lived pre-authenticated download URL from the metadata.
    const item = await getItem();
    const url = item?.['@microsoft.graph.downloadUrl'];
    if (!url) throw new Error('OneDrive file disappeared while syncing - try again');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`OneDrive download failed (${response.status})`);
    return response.text();
  },

  async upload(content) {
    const response = await graphFetch(`${FILE_URL}:/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: content,
    });
    if (!response.ok) throw new Error(`OneDrive upload failed (${response.status})`);
    return toMeta((await response.json()) as DriveItem);
  },
};
