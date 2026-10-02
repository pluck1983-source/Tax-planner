import type { PlannerState } from '../types';

/**
 * Pure sync decisions, kept free of browser/provider code so they can be
 * reasoned about (and tested) on their own.
 *
 * Each device remembers a fingerprint of the data as of its last successful
 * sync, plus the cloud file's version at that moment. Comparing both
 * against now tells us which side changed since then.
 */

export type SyncAction = 'none' | 'push' | 'pull' | 'conflict';

export interface SyncDecisionInput {
  localHash: string;
  remoteVersion: string | null;
  /** Null when this device has never synced with the current cloud file */
  syncedHash: string | null;
  syncedRemoteVersion: string | null;
}

export function decideSync(input: SyncDecisionInput): SyncAction {
  if (input.remoteVersion === null) return 'push';
  // A cloud copy exists but this device has never synced with it (e.g. the
  // first time a second device connects) - don't guess which copy wins.
  if (input.syncedHash === null || input.syncedRemoteVersion === null) return 'conflict';

  const localChanged = input.localHash !== input.syncedHash;
  const remoteChanged = input.remoteVersion !== input.syncedRemoteVersion;
  if (localChanged && remoteChanged) return 'conflict';
  if (localChanged) return 'push';
  if (remoteChanged) return 'pull';
  return 'none';
}

/**
 * Fingerprint of the data that matters for syncing. Leaves out the selected
 * year, which is per-device UI state - clicking between years shouldn't
 * count as an edit or trigger an upload.
 */
export function hashState(state: PlannerState): string {
  const { selectedYearId: _ignored, ...data } = state;
  const text = JSON.stringify(data);
  // 53-bit string hash (cyrb53) - only used to detect change, not for security.
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${text.length}:${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)}`;
}

/** Keeps this device's selected year when taking data from the cloud, if it still exists there. */
export function mergeIncoming(incoming: PlannerState, current: PlannerState): PlannerState {
  const keep = current.selectedYearId && incoming.years[current.selectedYearId];
  return keep ? { ...incoming, selectedYearId: current.selectedYearId } : incoming;
}
