import "superdoc/style.css"
import "./style.css"
import { SuperDoc } from "superdoc"

import { extraOrigins, originAllowed, readOpen, readSaved, type OpenMessage } from "./protocol.ts"

const status = document.getElementById("stato") as HTMLParagraphElement
const saveButton = document.getElementById("salva") as HTMLButtonElement
const closeButton = document.getElementById("chiudi") as HTMLButtonElement
const tracking = document.getElementById("revisioni") as HTMLInputElement
const allowed = extraOrigins(import.meta.env.VITE_PORTAL_ORIGINS)

let editor: SuperDoc | null = null
let portal: string | null = null
let fileName = "tesi.docx"
let dirty = false
let saving = false

function say(text: string) {
  status.textContent = text
}

/** Manda un messaggio solo al portale che ha aperto il documento. */
function tellPortal(message: Record<string, unknown>, transfer: Transferable[] = []) {
  if (portal) window.parent.postMessage(message, portal, transfer)
}

function open(message: OpenMessage) {
  editor?.destroy()
  fileName = message.nome
  tracking.checked = message.modo === "revisioni"
  editor = new SuperDoc({
    selector: "#editor",
    toolbar: "#toolbar",
    document: new File([message.file], message.nome, {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    documentMode: tracking.checked ? "suggesting" : "editing",
    user: { name: message.autore },
    // Nessun dato esce dal browser: SuperDoc di suo manda un evento a ogni apertura (ingest.superdoc.dev).
    telemetry: { enabled: false },
    onReady: () => {
      saveButton.disabled = false
      say(`${message.nome}: ${tracking.checked ? "le modifiche diventano revisioni" : "modifica diretta"}.`)
      tellPortal({ type: "aperto" })
    },
    onEditorUpdate: () => {
      if (!dirty) tellPortal({ type: "modificato" })
      dirty = true
    },
    onContentError: () => {
      say("Non riesco ad aprire questo file Word.")
      tellPortal({ type: "errore", messaggio: "L'editor non riesce ad aprire questo file Word." })
    },
  })
}

async function save() {
  if (!editor || saving) return
  saving = true
  saveButton.disabled = true
  say("Preparo il file Word…")
  try {
    const blob = await editor.export({ triggerDownload: false, commentsType: "external", isFinalDoc: false })
    const file = await blob.arrayBuffer()
    say("Salvo la revisione nel portale…")
    tellPortal({ type: "salva", file, nome: fileName }, [file])
  } catch {
    saving = false
    saveButton.disabled = false
    say("Non riesco a preparare il file Word. Riprova.")
  }
}

window.addEventListener("message", (event) => {
  if (event.source !== window.parent || !originAllowed(event.origin, allowed)) return
  const opened = readOpen(event.data)
  if (opened) {
    portal = event.origin
    dirty = false
    open(opened)
    return
  }
  if (event.origin !== portal) return
  const saved = readSaved(event.data)
  if (!saved) return
  saving = false
  saveButton.disabled = false
  if (saved.type === "salvato") {
    dirty = false
    say("Revisione salvata nel portale.")
  } else {
    say(saved.messaggio)
  }
})

tracking.addEventListener("change", () => {
  editor?.setDocumentMode(tracking.checked ? "suggesting" : "editing")
  say(tracking.checked ? "Le modifiche diventano revisioni." : "Modifica diretta: le modifiche non sono segnate.")
})
saveButton.addEventListener("click", () => void save())
closeButton.addEventListener("click", () => {
  if (dirty && !window.confirm("Ci sono modifiche non salvate. Chiudere lo stesso?")) return
  tellPortal({ type: "chiudi" })
})

if (window.parent === window) {
  document.body.innerHTML =
    '<div class="avviso"><h1>Editor tesi</h1><p>Questo editor si apre dal Portale Docenti, con il pulsante «Correggi in Word». ' +
    'Da solo non apre file.</p><p>Il codice è libero (AGPL-3.0): <a href="https://github.com/praticheflaiano/editor-tesi">github.com/praticheflaiano/editor-tesi</a>.</p></div>'
} else {
  // Il messaggio non contiene dati: qualsiasi finestra può sapere che l'editor è pronto.
  window.parent.postMessage({ type: "pronto" }, "*")
}
