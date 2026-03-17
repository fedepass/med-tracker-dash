# PharmAR Dashboard

Dashboard web per la gestione delle preparazioni farmaceutiche oncologiche in ambiente ospedaliero.

## Stack

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** + **shadcn/ui** (componenti)
- **Sonner** (toast notifications)
- **Recharts** (grafici statistiche)

## Prerequisiti

- Node.js ≥ 18
- API REST `pharmar-api` in esecuzione (default: `https://ip87-106-10-111.pbiaas.com`)

## Avvio in sviluppo

```sh
npm install
npm run dev
```

## Variabili d'ambiente

Crea un file `.env.local` nella root:

```env
VITE_API_BASE_URL=https://ip87-106-10-111.pbiaas.com/api/v1
VITE_API_KEY=<chiave_readonly_o_admin>
```

## Build produzione

```sh
npm run build
# output in ./dist — da servire su nginx porta :8443
```

## Struttura principale

```
src/
├── pages/
│   ├── Index.tsx          — Dashboard principale (lista preparazioni)
│   ├── Config.tsx         — Configurazione cappe, farmaci, strategia
│   ├── PreparationDetail.tsx — Dettaglio preparazione + sessione IVEyes
│   └── Stats.tsx          — Statistiche e KPI
├── components/
│   └── dashboard/
│       ├── PreparationsTable.tsx
│       ├── FiltersBar.tsx
│       └── ...
└── lib/
    └── apiClient.ts       — Wrapper fetch con base URL e auth header
```

## Funzionalità principali

### Pagina principale
- Lista preparazioni con filtri (status, priorità, data, farmaco, cappa)
- Ordinamento multi-colonna
- Indicatore errore % con soglie cromatiche
- Colonna "Dosato" con conversione gravimetrica (g → ml usando peso specifico)

### Configurazione farmaci (`/config`)
- Catalogo farmaci con ricerca AIFA (BdnFarmaci open data)
- Lookup automatico codice ATC, AIC, categoria, volume flacone
- Selezione confezione AIFA con auto-compilazione campi tecnici
- Gestione cappe con regole di esclusione/obbligo per farmaco o categoria

### Dettaglio preparazione
- Timeline allestimento con foto fasi
- Sessione gravimetrica IVEyes (tara, post-dose, verdict)
- Dosi supplementari

## Note API

Il frontend usa due endpoint distinti per i farmaci:
- `GET /config/drugs` — gestione catalogo (include tutti i campi: `aic_code`, `vial_volume`, `needs_review`)
- `GET /drugs` — lettura da altri componenti (stesso set di campi dal v2.5.0)
- `PUT /config/drugs/:id` — aggiornamento; i campi non inviati non vengono modificati (null esplicito li azzera)
