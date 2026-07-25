// Thin wrapper around the what3words REST API (https://developer.what3words.com/).
// Free tier: sign up for an API key and set VITE_WHAT3WORDS_API_KEY in .env
// (see .env.example). Without a key, callers should fall back to manual
// lat/lon entry - see MapView / FeasibilityWizard.

const API_BASE = 'https://api.what3words.com/v3'

export function getApiKey(): string | null {
  const key = import.meta.env.VITE_WHAT3WORDS_API_KEY
  return key && key.length > 0 ? key : null
}

export interface W3WCoordinates {
  lat: number
  lng: number
}

const WORDS_PATTERN = /^\s*\/{0,3}([a-z]+)\.([a-z]+)\.([a-z]+)\s*$/i

export function isPlausibleWhat3Words(input: string): boolean {
  return WORDS_PATTERN.test(input)
}

function normaliseWords(input: string): string {
  const match = WORDS_PATTERN.exec(input)
  if (!match) return input.trim()
  return `${match[1]}.${match[2]}.${match[3]}`.toLowerCase()
}

export async function convertToCoordinates(words: string): Promise<W3WCoordinates> {
  const key = getApiKey()
  if (!key) {
    throw new Error('No what3words API key configured (VITE_WHAT3WORDS_API_KEY).')
  }
  const normalised = normaliseWords(words)
  const url = `${API_BASE}/convert-to-coordinates?words=${encodeURIComponent(normalised)}&key=${encodeURIComponent(key)}`
  const res = await fetch(url)
  const body = await res.json()
  if (!res.ok || body.error) {
    throw new Error(body.error?.message ?? `what3words lookup failed (${res.status})`)
  }
  return body.coordinates as W3WCoordinates
}

export async function convertTo3wa(lat: number, lon: number): Promise<string> {
  const key = getApiKey()
  if (!key) {
    throw new Error('No what3words API key configured (VITE_WHAT3WORDS_API_KEY).')
  }
  const url = `${API_BASE}/convert-to-3wa?coordinates=${lat},${lon}&key=${encodeURIComponent(key)}`
  const res = await fetch(url)
  const body = await res.json()
  if (!res.ok || body.error) {
    throw new Error(body.error?.message ?? `what3words reverse lookup failed (${res.status})`)
  }
  return body.words as string
}
