# Gestore Conto — Backend

FastAPI + MongoDB. Esposto sotto il prefisso `/api`.

## Dove configurare l'URL nell'app

Il frontend (Expo) legge l'URL del backend da `src/config.ts`:

```ts
// src/config.ts
const DEFAULT_BACKEND_URL: string =
  process.env.EXPO_PUBLIC_BACKEND_URL ??
  "https://wallet-tracker-278.preview.emergentagent.com";
```

Due modi per cambiarlo:

1. **Runtime (consigliato)**: dall'app → *Impostazioni → Server* → inserisci il tuo URL. L'app lo salva in locale e sopravvive ai riavvii.
2. **Permanente**: modifica `DEFAULT_BACKEND_URL` in `frontend/src/config.ts` (o la variabile `EXPO_PUBLIC_BACKEND_URL` del `.env`) e rigenera la build.

## Far girare il backend su un server tuo

Requisiti:
- Python 3.11+
- MongoDB raggiungibile

```bash
cd backend
pip install -r requirements.txt
export MONGO_URL="mongodb://localhost:27017"
export DB_NAME="gestore_conto"
uvicorn server:app --host 0.0.0.0 --port 8001
```

Il server deve:
- Esporre le API sotto `/api` (già configurato in `server.py`).
- Avere CORS aperto sull'origine dell'app, o `*` (già configurato).
- Essere raggiungibile tramite HTTPS se usi la build pubblicata (iOS / Android bloccano HTTP senza eccezioni).

Dopo averlo avviato, nell'app vai in *Impostazioni → Server* e incolla il tuo URL (es. `https://api.miodominio.it`).

## Health check veloce

```bash
curl https://TUO_SERVER/api/
# → {"message":"Hello World"}
```
