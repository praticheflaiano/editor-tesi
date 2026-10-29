import assert from "node:assert/strict"
import test from "node:test"

import { extraOrigins, originAllowed, readOpen, readSaved } from "./protocol.ts"

const zip = () => new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2]).buffer

test("solo il portale e le sue anteprime possono aprire un file nell'editor", () => {
  assert.ok(originAllowed("https://portale-docenti.vercel.app"))
  assert.ok(originAllowed("https://portale-docenti-git-ccr-f78121-86c8c6-praticheflaianos-projects.vercel.app"))
  assert.ok(!originAllowed("https://portale-docenti.vercel.app.evil.com"))
  assert.ok(!originAllowed("https://evil-git-x-praticheflaianos-projects.vercel.app"))
  assert.ok(!originAllowed("https://portale-docenti-git-x-altro-team.vercel.app"))
  assert.ok(!originAllowed("null"))
  assert.ok(originAllowed("https://docenti.example.it", extraOrigins("https://docenti.example.it/, nonvalida")))
  assert.deepEqual(extraOrigins("javascript:alert(1),https://a.it"), ["https://a.it"])
})

test("un messaggio «apri» vale solo con un file ZIP e campi puliti", () => {
  const open = readOpen({ type: "apri", file: zip(), nome: "Tesi.docx", autore: "  Prof. Rossi ", modo: "x" })
  assert.equal(open?.autore, "Prof. Rossi")
  assert.equal(open?.modo, "revisioni")
  assert.equal(readOpen({ type: "apri", file: new TextEncoder().encode("<html>").buffer, nome: "a" }), null)
  assert.equal(readOpen({ type: "apri", file: "testo" }), null)
  assert.equal(readOpen({ type: "salva" }), null)
  assert.equal(readOpen(null), null)
  assert.equal(readOpen({ type: "apri", file: zip(), autore: "" })?.autore, "Relatore")
})

test("la risposta del portale dopo il salvataggio", () => {
  assert.deepEqual(readSaved({ type: "salvato" }), { type: "salvato" })
  assert.equal(readSaved({ type: "errore", messaggio: 3 })?.type, "errore")
  assert.equal(readSaved({ type: "altro" }), null)
})
