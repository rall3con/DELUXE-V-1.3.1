# Gestore Conto — PRD

## Overview
Mobile app (Expo React Native) for personal money management with a central balance and user-created sections (pots) like Risparmi, Vacanze, Emergenze. Data lives locally on the device (AsyncStorage), no auth, no backend.

## Core features
- **Saldo totale** at top of Home: sum of all section balances.
- **Entrate** add to the selected section balance (and total).
- **Uscite** subtract from the selected section balance (and total).
- **Trasferimenti** move money between sections (no effect on total).
- **Sezioni** CRUD: create custom sections with name, target, icon, color (purple/pink/green).
- **Movimenti** list, filterable by type (Tutti / Entrate / Uscite / Trasferimenti); long-press to delete.
- **Analisi** monthly donut (entrate vs uscite) + spese per categoria breakdown.

## Design
- Dark theme (black/gray) with purple/pink/green accents, following `design_guidelines.json`.
- Hero balance card uses an abstract background image with gradient scrim.
- 4-tab bottom navigation: Home, Sezioni, Movimenti, Analisi.

## Storage
- `AsyncStorage` key `gestore_conto_state_v1`.
- Default seed: one section "Conto Principale".

## Notable files
- `src/store.ts` — state, CRUD, totals, formatting.
- `src/types.ts` — Section, Transaction, categories.
- `src/components/AddTransactionSheet.tsx` — segmented income/expense/transfer sheet.
- `src/components/AddSectionSheet.tsx` — section creator.
- `app/(tabs)/*` — screens.

## Multi-currency (added)
- Base currency is **EUR** (all amounts stored in EUR for consistency).
- User can display balances in **EUR, USD, GBP, JPY, CHF, PLN, CNY, CAD, AUD** via chip on Home and Analisi screens.
- Live rates from `api.frankfurter.dev` (free, no API key), cached 1h in AsyncStorage, pull-to-refresh button in picker.
- Inputs (new transaction amount, section target) accept values in the currently displayed currency and are converted back to EUR before storage; a hint shows the EUR equivalent when a non-EUR currency is active.

## Analisi improvements
- Month navigator (prev/next, forward disabled on current month).
- Donut shows a readable % with legend; empty state when no data.
- Currency chip in header.

## Phase 1 — new features (added)

### Movimenti ricorrenti
- CRUD completo in `Impostazioni → Ricorrenti`.
- Alla prossima apertura dell'app, `processRecurring()` genera tutti i movimenti maturati dall'ultimo giorno processato fino a oggi, con la data corretta (non quella odierna).
- Pausa / riprendi per ogni regola; eliminare la regola non tocca i movimenti già creati.

### Scadenze bollette
- CRUD in `Impostazioni → Scadenze`.
- Banner in Home per scadenze entro 7 giorni con colori semantici (verde ok, giallo entro 3g, rosso oggi/scaduta).
- "Paga ora" crea un'uscita nella sezione scelta e, se ricorrente, pianifica la prossima; se "una tantum", archivia la scadenza.
- "Fatto" (quando non c'è importo) archivia senza creare uscita.

### Blocco app PIN + biometria
- PIN a 4 cifre, salvato come SHA-256 in SecureStore (AsyncStorage su web).
- Biometria opzionale (Face ID / impronta) via `expo-local-authentication`; PIN resta sempre obbligatorio come fallback.
- App bloccata al cold start e dopo 60s in background.
- Reset app con doppia conferma (perde tutti i dati).

### Categorie personalizzate
- CRUD in `Impostazioni → Categorie` separate per Entrate e Uscite.
- Categorie built-in (seed) modificabili (nome, icona, colore) ma non eliminabili.
- Eliminazione di una categoria personalizzata: se ha movimenti collegati viene archiviata (`(archiviata)`), altrimenti rimossa.
- Form "Nuova Entrata/Uscita" e "Ricorrente" leggono dinamicamente le categorie attive.

### Impostazioni
- Nuova schermata raggiungibile dall'icona a rotella in Home header.
- Lista con icona + titolo + sotto-testo; stato live di PIN, biometria, numero regole/scadenze/categorie custom.

## Fase 2 (prossimamente)
- Notifiche di sistema per le scadenze (richiede build nativa).
- Modifica di un movimento esistente.
- Allegare foto scontrino a un movimento.

## Fase 3 (dopo la Fase 2)
- Export/import JSON per backup/ripristino.
- Multi-conto formale (carte separate oltre a sezioni).
- Report mensile PDF.

## Config server (added)
- `src/config.ts` è l'unico punto che decide dove inviare le chiamate API. Esporta `getBackendUrl()`, `setBackendUrlOverride()`, `apiUrl(path)`.
- Dall'app: *Impostazioni → Server* permette di sovrascrivere l'URL a runtime (salvato in AsyncStorage, sopravvive ai riavvii) o ripristinare il default.
- Per self-host: modifica `DEFAULT_BACKEND_URL` in `src/config.ts` oppure usa l'override da UI. Istruzioni in `backend/README.md`.

## Scanner scontrini con Gemini (added)
- Nuova quick action "Scontrino" sulla Home (icona camera, accento blu).
- Flusso `/receipt-scan`:
  1. Scegli fotocamera o galleria (`expo-image-picker` con permessi iOS/Android dichiarati in `app.json`).
  2. L'immagine viene codificata base64 e inviata direttamente a Google Generative Language API (`gemini-3-flash-preview` default; selezionabile anche 3.5 Flash, 3.1 Pro, 2.5 Flash).
  3. Gemini risponde con JSON strutturato: `store`, `date`, `items[]`, `total`. Prompt forzato in italiano con `responseMimeType=application/json`.
  4. Schermata di revisione: tutte le righe editabili (nome, prezzo, quantità). Se una riga ha prezzo mancante o 0, è evidenziata in rosso ("⚠ Correggi questa riga") e il bottone Salva è disabilitato.
  5. Prima di salvare, conferma modale con riepilogo totale + nome supermercato.
  6. Il movimento viene salvato come uscita con `receipt: { store, items[], scannedAt, imageUri }`; totale = somma delle righe convertita in EUR.
- La chiave API Gemini viene salvata **solo sul dispositivo** in `expo-secure-store` (AsyncStorage su web); nulla transita per i server dell'app. UI in *Impostazioni → Scanner scontrini*.
- Lista movimenti: le voci con scontrino mostrano badge `file-text`, titolo = nome supermercato, sottotitolo = "categoria · N voci · sezione". Tap su una voce → `/transaction/[id]`:
  - Dettaglio bello con importo grande, data/sezione/categoria.
  - Elenco completo articoli con prezzo per riga + totale finale.
  - Bottone elimina con conferma.

## Not implemented (user chose "No AI", "No auth")
- Login / sync between devices.
- Push notifications.

## Business enhancement idea
Add a monthly "Risparmio Challenge" widget (optional): suggest moving a small % of each income to a user-chosen savings section automatically — nudges saving behavior and increases retention.
