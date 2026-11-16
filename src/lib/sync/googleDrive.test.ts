import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

const DRIVE_FILE = 'https://www.googleapis.com/auth/drive.file';
const APPDATA = 'https://www.googleapis.com/auth/drive.appdata';

interface FakeFile {
  id: string;
  name: string;
  space: 'drive' | 'appDataFolder';
  content: string;
  version: number;
}

/** In-memory stand-in for the Drive REST endpoints the provider uses. */
function fakeDrive(files: FakeFile[]) {
  let nextId = 1;
  return vi.fn(async (input: string, init: RequestInit = {}) => {
    const url = new URL(input);
    const method = init.method ?? 'GET';
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
    const meta = (f: FakeFile) => ({ id: f.id, modifiedTime: '2026-11-16T00:00:00Z', version: String(f.version) });

    if (url.pathname === '/drive/v3/files' && method === 'GET') {
      const space = url.searchParams.get('spaces');
      const name = /name = '([^']+)'/.exec(url.searchParams.get('q') ?? '')?.[1];
      return json({ files: files.filter((f) => f.space === space && f.name === name).map(meta) });
    }
    if (url.pathname === '/upload/drive/v3/files' && method === 'POST') {
      const parts = String(init.body).split(/--taxplanner\d+/);
      const metadata = JSON.parse(parts[1].split('\r\n\r\n')[1]);
      const content = parts[2].split('\r\n\r\n')[1].replace(/\r\n$/, '');
      const file: FakeFile = {
        id: `new${nextId++}`,
        name: metadata.name,
        space: metadata.parents?.includes('appDataFolder') ? 'appDataFolder' : 'drive',
        content,
        version: 1,
      };
      files.push(file);
      return json(meta(file));
    }
    const fileMatch = /\/files\/([^/?]+)$/.exec(url.pathname);
    const file = fileMatch && files.find((f) => f.id === fileMatch[1]);
    if (!file) return new Response('not found', { status: 404 });
    if (method === 'GET' && url.searchParams.get('alt') === 'media') return new Response(file.content);
    if (method === 'PATCH' && url.pathname.startsWith('/upload/')) {
      file.content = String(init.body);
      file.version++;
      return json(meta(file));
    }
    if (method === 'PATCH') {
      Object.assign(file, JSON.parse(String(init.body)));
      return json(meta(file));
    }
    return new Response('unexpected', { status: 500 });
  });
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

async function loadProvider(files: FakeFile[], tokenScope = `${DRIVE_FILE} ${APPDATA}`) {
  vi.resetModules();
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client');
  const session = memoryStorage();
  session.setItem(
    'tax-planner-gdrive-token',
    JSON.stringify({ token: 't', expiresAt: Date.now() + 3_600_000, scope: tokenScope }),
  );
  vi.stubGlobal('sessionStorage', session);
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubGlobal('window', { location: { hash: '', pathname: '/', search: '', origin: 'https://x' }, history: {} });
  const fetchMock = fakeDrive(files);
  vi.stubGlobal('fetch', fetchMock);
  const { googleDriveProvider } = await import('./googleDrive');
  return { provider: googleDriveProvider, fetchMock };
}

describe('googleDriveProvider drive.file migration', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('copies the old app-data file into Drive unchanged and keeps the old copy as a renamed backup', async () => {
    const files: FakeFile[] = [
      { id: 'old', name: 'tax-planner-data.json', space: 'appDataFolder', content: '{"years":{"a":1}}', version: 7 },
    ];
    const { provider } = await loadProvider(files);

    const meta = await provider.getMeta();

    const driveCopy = files.find((f) => f.space === 'drive');
    expect(driveCopy?.content).toBe('{"years":{"a":1}}');
    expect(driveCopy?.name).toBe('tax-planner-data.json');
    expect(meta?.id).toBe(driveCopy?.id);
    expect(await provider.download(meta!)).toBe('{"years":{"a":1}}');
    // Old copy is not deleted, only renamed so it's never migrated twice.
    expect(files.find((f) => f.id === 'old')).toMatchObject({ name: 'tax-planner-data.migrated.json', content: '{"years":{"a":1}}' });
  });

  it('migrates only once: a second device finds the Drive copy, not the backup', async () => {
    const files: FakeFile[] = [
      { id: 'old', name: 'tax-planner-data.json', space: 'appDataFolder', content: 'data', version: 7 },
    ];
    const first = await (await loadProvider(files)).provider.getMeta();
    const second = await (await loadProvider(files)).provider.getMeta();
    expect(second?.id).toBe(first?.id);
    expect(files.filter((f) => f.space === 'drive')).toHaveLength(1);
  });

  it('does not resurrect stale app-data content after the Drive file is deleted', async () => {
    const files: FakeFile[] = [
      { id: 'old', name: 'tax-planner-data.json', space: 'appDataFolder', content: 'stale', version: 7 },
    ];
    await (await loadProvider(files)).provider.getMeta();
    files.splice(files.findIndex((f) => f.space === 'drive'), 1);
    expect(await (await loadProvider(files)).provider.getMeta()).toBeNull();
  });

  it('reports a new file as a change even when Drive version numbers happen to match', async () => {
    const files: FakeFile[] = [
      { id: 'old', name: 'tax-planner-data.json', space: 'appDataFolder', content: 'x', version: 1 },
    ];
    const meta = await (await loadProvider(files)).provider.getMeta();
    // The migrated file starts at version 1, same as an old app-data file could have been.
    expect(meta?.version).not.toBe('1');
    expect(meta?.version).toBe(`${meta?.id}:1`);
  });

  it('creates new files in Drive, not the app-data folder', async () => {
    const files: FakeFile[] = [];
    const { provider } = await loadProvider(files);
    expect(await provider.getMeta()).toBeNull();
    const meta = await provider.upload('fresh', null);
    expect(files).toEqual([expect.objectContaining({ id: meta.id, space: 'drive', content: 'fresh' })]);
  });

  it('discards a token issued for the old drive.appdata-only scope', async () => {
    const { provider, fetchMock } = await loadProvider([], APPDATA);
    await expect(provider.getMeta()).rejects.toThrow('Sign-in required');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
