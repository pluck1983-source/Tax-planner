import type { SyncStatus } from '../lib/sync/useCloudSync';

interface Props {
  status: SyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
  providerLabel: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onSyncNow: () => void;
}

const buttonClass =
  'text-xs px-3 py-1.5 rounded border border-slate-200 hover:border-slate-400 dark:border-slate-700 whitespace-nowrap';

export function CloudSyncControl({ status, lastSyncedAt, error, providerLabel, onConnect, onDisconnect, onSyncNow }: Props) {
  if (status === 'unconfigured') return null;

  if (status === 'off') {
    return (
      <button type="button" onClick={onConnect} className={buttonClass} title={`Save and sync your data via ${providerLabel}`}>
        Sync with {providerLabel}
      </button>
    );
  }

  if (status === 'reconnect') {
    return (
      <button
        type="button"
        onClick={onConnect}
        className="text-xs px-3 py-1.5 rounded border border-amber-300 text-amber-700 hover:border-amber-500 dark:border-amber-800 dark:text-amber-400 whitespace-nowrap"
        title={`Sign-in to ${providerLabel} has expired - changes are saved on this device until you reconnect`}
      >
        Reconnect {providerLabel}
      </button>
    );
  }

  const label =
    status === 'syncing'
      ? 'Syncing…'
      : status === 'error'
        ? 'Sync failed - retry'
        : lastSyncedAt
          ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
          : 'Synced';

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onSyncNow}
        disabled={status === 'syncing'}
        className={`${buttonClass} ${status === 'error' ? 'border-rose-300 text-rose-600 dark:border-rose-900 dark:text-rose-400' : ''}`}
        title={status === 'error' && error ? error : `Saved to ${providerLabel} - click to sync now`}
      >
        {label}
      </button>
      <button
        type="button"
        onClick={() => {
          if (window.confirm(`Stop syncing this device with ${providerLabel}? Your data stays on this device and in ${providerLabel}.`)) {
            onDisconnect();
          }
        }}
        className="text-xs px-2 py-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        title={`Disconnect ${providerLabel}`}
        aria-label={`Disconnect ${providerLabel}`}
      >
        ✕
      </button>
    </div>
  );
}
