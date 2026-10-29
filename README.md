# Editor tesi

Editor di file Word (.docx) usato dal **Portale Docenti** per correggere le tesi: le modifiche del relatore diventano revisioni tracciate, con i commenti, e il file salvato si riapre in Word con le revisioni visibili.

È costruito su [SuperDoc](https://github.com/superdoc-dev/superdoc) e distribuito sotto la licenza **GNU AGPL-3.0** (file `LICENSE`), come SuperDoc.

## Come funziona

L'editor è una pagina statica. Non ha un server, non salva dati e non contiene chiavi. Il portale lo apre in un iframe e i due si parlano solo con `postMessage`:

1. l'editor manda `{ type: "pronto" }` alla finestra che lo contiene;
2. il portale risponde con `{ type: "apri", file: ArrayBuffer, nome, autore, modo: "revisioni" | "modifica" }`;
3. con «Salva revisione» l'editor esporta il .docx e manda `{ type: "salva", file, nome }` **solo** all'origine che ha aperto il documento;
4. il portale risponde `{ type: "salvato" }` oppure `{ type: "errore", messaggio }`;
5. l'editor manda anche `aperto`, `modificato` e `chiudi`.

I messaggi accettati arrivano solo dalle origini del portale (`src/protocol.ts`), più quelle in `VITE_PORTAL_ORIGINS` al momento della build. `vercel.json` limita chi può incorniciare la pagina.

## Sviluppo

```bash
npm ci
npm test
npm run dev
npm run build
```
