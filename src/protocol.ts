/**
 * Messaggi fra il portale (la finestra che apre l'editor) e l'editor.
 * L'editor non chiama nessun server: il file arriva e riparte solo con postMessage.
 */

/** Origini del portale ammesse in produzione e in locale. */
const FIXED_ORIGINS = [
  "https://portale-docenti.vercel.app",
  "https://genesis-roan-nine.vercel.app",
  "http://localhost:3847",
  "http://127.0.0.1:3847",
]

/** Le anteprime Vercel del portale, solo del team del titolare. */
const PREVIEW_ORIGIN = /^https:\/\/(portale-docenti|genesis)-git-[a-z0-9-]+-praticheflaianos-projects\.vercel\.app$/

/** Altre origini aggiunte alla build (VITE_PORTAL_ORIGINS, separate da virgola). */
export function extraOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().replace(/\/+$/, ""))
    .filter((item) => /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(item))
}

export function originAllowed(origin: string, extra: string[] = []) {
  return FIXED_ORIGINS.includes(origin) || extra.includes(origin) || PREVIEW_ORIGIN.test(origin)
}

export const MAX_DOCX_BYTES = 80 * 1024 * 1024

export type OpenMessage = { type: "apri"; file: ArrayBuffer; nome: string; autore: string; modo: "revisioni" | "modifica" }
export type SavedMessage = { type: "salvato" } | { type: "errore"; messaggio: string }

/** Un messaggio «apri» valido dal portale, oppure null. Il .docx deve essere uno ZIP. */
export function readOpen(data: unknown): OpenMessage | null {
  if (!data || typeof data !== "object") return null
  const message = data as Record<string, unknown>
  if (message.type !== "apri") return null
  const file = message.file
  if (!(file instanceof ArrayBuffer) || file.byteLength < 4 || file.byteLength > MAX_DOCX_BYTES) return null
  const head = new Uint8Array(file, 0, 4)
  if (head[0] !== 0x50 || head[1] !== 0x4b || head[2] !== 0x03 || head[3] !== 0x04) return null
  const nome = typeof message.nome === "string" ? message.nome.slice(0, 180) : "tesi.docx"
  const autore = typeof message.autore === "string" && message.autore.trim() ? message.autore.trim().slice(0, 120) : "Relatore"
  const modo = message.modo === "modifica" ? "modifica" : "revisioni"
  return { type: "apri", file, nome, autore, modo }
}

/** La risposta del portale dopo un salvataggio, oppure null. */
export function readSaved(data: unknown): SavedMessage | null {
  if (!data || typeof data !== "object") return null
  const message = data as Record<string, unknown>
  if (message.type === "salvato") return { type: "salvato" }
  if (message.type === "errore") {
    return { type: "errore", messaggio: typeof message.messaggio === "string" ? message.messaggio.slice(0, 300) : "Il portale non ha salvato la revisione." }
  }
  return null
}
