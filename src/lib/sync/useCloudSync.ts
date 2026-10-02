import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlannerState } from '../types';
import { exportStateAsJson, importStateFromJson } from '../storage';
import { AuthRequiredError, type CloudProvider, type RemoteFileMeta } from './types';
import { decideSync, hashState, mergeIncoming } from './syncEngine';
import { googleDriveProvider } from './googleDrive';

export type SyncStatus =
  | 'unconfigured' // built without a client ID - sync UI hidden
  | 'off' // configured but not connected on this device
  | 'syncing'
  | 'synced'
  | 'reconnect' // was connected, but sign-in has lapsed and needs a click
  | 'error';

interface SyncMeta {
  providerId: string;
  syncedHash: string | null;
  syncedRemoteVersion: string | null;
  lastSyncedAt: string | null;
}

const META_KEY = 'tax-planner-sync-v1';
/** The copy a conflict resolution overwrote, kept so a wrong choice can be undone via Import */
const BACKUP_KEY = 'tax-planner-sync-backup';
const PUSH_DEBOUNCE_MS = 2000;

const provider: CloudProvider = googleDriveProvider;

function readMeta(): SyncMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    const parsed = raw ? (JSON.parse(raw) as SyncMeta) : null;
    return parsed?.providerId === provider.id ? parsed : null;
  } catch {
    return null;
  }
}

function writeMeta(meta: SyncMeta | null) {
  if (meta) localStorage.setItem(META_KEY, JSON.stringify(meta));
  else localStorage.removeItem(META_KEY);
}

function keepBackup(source: string, content: string) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ savedAt: new Date().toISOString(), source, content }));
  } catch {
    // Storage full - the backup is a nicety, not worth failing the sync over.
  }
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function useCloudSync(state: PlannerState, replaceState: (next: PlannerState) => void) {
  const [status, setStatus] = useState<SyncStatus>(() => {
    if (!provider.isConfigured()) return 'unconfigured';
    return readMeta() ? 'syncing' : 'off';
  });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => readMeta()?.lastSyncedAt ?? null);
  const [error, setError] = useState<string | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const running = useRef(false);
  const rerun = useRef(false);
  /** Set once a silent sign-in fails, so background syncs stop retrying until the user clicks */
  const authLapsed = useRef(false);

  const recordSynced = useCallback((hash: string, remote: RemoteFileMeta) => {
    const now = new Date().toISOString();
    writeMeta({ providerId: provider.id, syncedHash: hash, syncedRemoteVersion: remote.version, lastSyncedAt: now });
    setLastSyncedAt(now);
  }, []);

  const push = useCallback(
    async (remote: RemoteFileMeta | null) => {
      const current = stateRef.current;
      const updated = await provider.upload(exportStateAsJson(current), remote);
      recordSynced(hashState(current), updated);
    },
    [recordSynced],
  );

  const pull = useCallback(
    async (remote: RemoteFileMeta, remoteText: string) => {
      const incoming = mergeIncoming(importStateFromJson(remoteText), stateRef.current);
      // Record before replacing state so the resulting change isn't seen as a local edit to push back.
      recordSynced(hashState(incoming), remote);
      replaceState(incoming);
    },
    [recordSynced, replaceState],
  );

  const sync = useCallback(async () => {
    const meta = readMeta();
    if (!meta || authLapsed.current) return;
    if (running.current) {
      rerun.current = true;
      return;
    }
    running.current = true;
    setStatus('syncing');
    try {
      await provider.signIn(false);
      const remote = await provider.getMeta();
      const action = decideSync({
        localHash: hashState(stateRef.current),
        remoteVersion: remote?.version ?? null,
        syncedHash: meta.syncedHash,
        syncedRemoteVersion: meta.syncedRemoteVersion,
      });

      if (action === 'push') await push(remote);
      else if (action === 'pull' && remote) await pull(remote, await provider.download(remote));
      else if (action === 'conflict' && remote) {
        const remoteText = await provider.download(remote);
        const firstSync = meta.syncedHash === null;
        const useRemote = window.confirm(
          firstSync
            ? `There's already planner data saved in ${provider.label} (last saved ${formatWhen(remote.modifiedTime)}).\n\n` +
                `OK - load it onto this device, replacing what's here.\n` +
                `Cancel - keep this device's data and overwrite the ${provider.label} copy.`
            : `Both this device and ${provider.label} have changes since they last synced.\n\n` +
                `OK - use the ${provider.label} copy (saved ${formatWhen(remote.modifiedTime)}), discarding this device's unsynced changes.\n` +
                `Cancel - keep this device's data and overwrite the ${provider.label} copy.`,
        );
        if (useRemote) {
          keepBackup('this device', exportStateAsJson(stateRef.current));
          await pull(remote, remoteText);
        } else {
          keepBackup(provider.label, remoteText);
          await push(remote);
        }
      } else if (remote) {
        recordSynced(meta.syncedHash ?? hashState(stateRef.current), remote);
      }
      setError(null);
      setStatus('synced');
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        if (meta.syncedHash === null) {
          // Never finished connecting (e.g. sign-in cancelled) - nothing to reconnect to.
          writeMeta(null);
          setStatus('off');
        } else {
          authLapsed.current = true;
          setStatus('reconnect');
        }
      } else {
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    } finally {
      running.current = false;
      if (rerun.current) {
        rerun.current = false;
        void sync();
      }
    }
  }, [push, pull, recordSynced]);

  const connect = useCallback(async () => {
    setStatus('syncing');
    // Record the intent before signing in: the sign-in may leave the page for
    // the provider's and come back, and the reload needs to know to finish syncing.
    // An existing record is kept so reconnecting after a lapsed sign-in
    // doesn't re-ask the first-time question.
    if (!readMeta()) {
      writeMeta({ providerId: provider.id, syncedHash: null, syncedRemoteVersion: null, lastSyncedAt: null });
    }
    try {
      await provider.signIn(true);
      authLapsed.current = false;
      await sync();
    } catch (e) {
      if (e instanceof AuthRequiredError) setStatus('reconnect');
      else {
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    }
  }, [sync]);

  const disconnect = useCallback(() => {
    void provider.signOut();
    writeMeta(null);
    authLapsed.current = false;
    setLastSyncedAt(null);
    setError(null);
    setStatus('off');
  }, []);

  // Sync once on load if this device was connected before.
  useEffect(() => {
    if (readMeta()) void sync();
  }, [sync]);

  // Push edits shortly after they stop, rather than on every keystroke.
  useEffect(() => {
    if (!readMeta()) return;
    const timer = window.setTimeout(() => void sync(), PUSH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [state, sync]);

  // Pick up changes made on another device when coming back to the app.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible' && readMeta()) void sync();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [sync]);

  return { status, lastSyncedAt, error, providerLabel: provider.label, connect, disconnect, syncNow: sync };
}
