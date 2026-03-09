// ─── PharmAR External API client ─────────────────────────────────────────────
//
// In sviluppo (dev): usa il proxy Vite "/ext-api" che inietta x-api-key
//   server-side → la chiave non appare mai nel bundle browser.
//
// In produzione (build): usa l'URL pubblico + chiave da VITE_EXT_API_KEY
//   (impostata come GitHub Actions secret e in .env.production).

const EXT_BASE = import.meta.env.VITE_EXT_API_URL || "/ext-api";
const EXT_KEY  = import.meta.env.VITE_EXT_API_KEY  || "";

/**
 * Fetch verso pharmar-api con autenticazione automatica.
 * `path` deve iniziare con "/" (es. "/preparations", "/cappe").
 */
export function extFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> ?? {}),
  };
  if (EXT_KEY) headers["X-Api-Key"] = EXT_KEY;
  return fetch(`${EXT_BASE}${path}`, { ...init, headers });
}
