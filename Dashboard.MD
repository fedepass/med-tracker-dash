# Dashboard.MD — Product Requirements Document
## PharmAR System — Pharmaceutical Preparation Tracker Dashboard

**Version**: 1.8
**Date**: 2026-02-28
**Lingua**: Italiano (UI), TypeScript/React (stack tecnico)

### Changelog
| Versione | Data | Modifica |
|---|---|---|
| 1.0 | 2026-02-27 | Documento iniziale |
| 1.1 | 2026-02-27 | Dashboard suddivisa in due tab: "Da Valutare" e "Archivio" |
| 1.2 | 2026-02-27 | Bottoni azione tabella rinnovati: etichettati, sfondo colorato, maggiore visibilità |
| 1.3 | 2026-02-27 | Filtro data sostituito con range Da/A + tasto "Oggi"; aggiornati PreparationsTable e StatCards |
| 1.4 | 2026-02-27 | Generazione PDF etichetta 80×80mm con barcode Code128 al click su "Ristampa Etichetta" |
| 1.5 | 2026-02-27 | PDF aperto in nuova scheda browser (no download automatico); bottone "Ristampa Etichetta" disabilitato per preparazioni non ancora terminate (attesa/esecuzione) |
| 1.6 | 2026-02-27 | Aggiunto bottone "Annulla" nell'Archivio (tabella e dettaglio) per ripristinare lo stato precedente di preparazioni validate o rifiutate |
| 1.7 | 2026-02-27 | Fix contatore "Da Valutare": rimossa auto-generazione preparazione dopo validate/rifiuta; il contatore ora diminuisce correttamente alla validazione e aumenta all'annullamento |
| 1.8 | 2026-02-28 | Titolo tab browser aggiornato da "Lovable App" a "Pharma Dashboard"; favicon sostituito con SVG custom (croce medica bianca su cerchio blu `#1e40af`); meta tag OG/Twitter aggiornati e rimossi riferimenti a Lovable |

---

## Indice

1. [Panoramica del Prodotto](#1-panoramica-del-prodotto)
2. [Stack Tecnologico](#2-stack-tecnologico)
3. [Struttura del Progetto](#3-struttura-del-progetto)
4. [Modelli di Dati e Tipi TypeScript](#4-modelli-di-dati-e-tipi-typescript)
5. [Routing e Navigazione](#5-routing-e-navigazione)
6. [Gestione dello Stato](#6-gestione-dello-stato)
7. [Sistema di Autenticazione](#7-sistema-di-autenticazione)
8. [Pagine e Componenti](#8-pagine-e-componenti)
   - 8.1 [Login](#81-login)
   - 8.2 [Dashboard (Index)](#82-dashboard-index)
   - 8.3 [Dettaglio Preparazione](#83-dettaglio-preparazione)
   - 8.4 [Analytics](#84-analytics)
   - 8.5 [404 Not Found](#85-404-not-found)
9. [Componenti Condivisi](#9-componenti-condivisi)
10. [Sistema di Stile e Tema](#10-sistema-di-stile-e-tema)
11. [Dati Statici e Logica di Generazione](#11-dati-statici-e-logica-di-generazione)
12. [Configurazione Build e Tools](#12-configurazione-build-e-tools)
13. [Requisiti Non Funzionali](#13-requisiti-non-funzionali)

---

## 1. Panoramica del Prodotto

### 1.1 Nome e Identità
- **Nome applicazione**: PharmAR System
- **Sottotitolo**: Pharmaceutical Preparation Tracker Dashboard
- **Brand name (login page)**: PharmPrep
- **Titolo tab browser**: Pharma Dashboard
- **Logo**: icona pill (💊) + testo "PharmAR System"
- **Favicon**: `public/favicon.svg` — croce medica bianca su cerchio blu (`#1e40af`), formato SVG 32×32

### 1.2 Scopo
Applicazione web per la gestione, il monitoraggio e la validazione di preparazioni farmaceutiche ospedaliere. Permette al personale farmaceutico di:
- Visualizzare le preparazioni del giorno in una tabella interattiva
- Approvare (validare) o rifiutare preparazioni completate
- Consultare i dettagli completi di ogni preparazione con foto, dosi supplementari, dati etichetta
- Analizzare metriche e KPI tramite grafici e tabelle aggregate

### 1.3 Utenti Target
- Farmacisti supervisori (es. "Dr. Marco Rossi, Supervisore")
- Personale di reparto farmaceutico ospedaliero

### 1.4 Lingua
Tutta l'interfaccia utente è in **italiano**. Il codice sorgente è in inglese/italiano misto.

---

## 2. Stack Tecnologico

### 2.1 Dipendenze di Produzione

| Libreria | Versione | Utilizzo |
|---|---|---|
| `react` | 18.3.1 | Core UI framework |
| `react-dom` | 18.3.1 | DOM rendering |
| `react-router-dom` | 6.30.1 | Client-side routing |
| `react-hook-form` | 7.61.1 | Gestione form |
| `@hookform/resolvers` | 3.10.0 | Validatori per react-hook-form |
| `zod` | 3.25.76 | Schema validation |
| `@tanstack/react-query` | 5.83.0 | Server state management (configurato, non attivamente usato) |
| `recharts` | 2.15.4 | Grafici (Analytics) |
| `jspdf` | latest | Generazione PDF etichetta farmaceutica |
| `jsbarcode` | latest | Generazione barcode Code128 su canvas per embed in PDF |
| `tailwindcss` | 3.4.17 | CSS utility-first framework |
| `tailwind-merge` | 2.6.0 | Merge classi Tailwind |
| `tailwindcss-animate` | 1.0.7 | Animazioni Tailwind |
| `class-variance-authority` | 0.7.1 | Varianti componenti |
| `clsx` | 2.1.1 | Classi condizionali |
| `lucide-react` | 0.462.0 | Icone |
| `date-fns` | 3.6.0 | Formattazione date (con locale `it`) |
| `next-themes` | 0.3.0 | Dark mode (configurato) |
| `sonner` | 1.7.4 | Toast notifications (Sonner) |
| `input-otp` | 1.4.2 | Input OTP |
| `embla-carousel-react` | 8.6.0 | Carousel |
| `react-resizable-panels` | 2.1.9 | Pannelli ridimensionabili |
| `react-day-picker` | 8.10.1 | Calendar picker |
| `vaul` | 0.9.9 | Drawer component |
| `cmdk` | 1.1.1 | Command palette |
| Tutte le librerie `@radix-ui/*` | varie | Primitive UI accessibili |

### 2.2 Dipendenze di Sviluppo

| Libreria | Versione | Utilizzo |
|---|---|---|
| `typescript` | 5.8.3 | Type checking |
| `vite` | 5.4.19 | Build tool e dev server |
| `@vitejs/plugin-react-swc` | 3.11.0 | Plugin Vite per React con SWC |
| `vitest` | 3.2.4 | Test runner |
| `@testing-library/react` | 16.0.0 | Testing utilities |
| `@testing-library/jest-dom` | 6.6.0 | DOM matchers |
| `jsdom` | 20.0.3 | Ambiente DOM per test |
| `eslint` | 9.32.0 | Linter |
| `autoprefixer` | 10.4.21 | PostCSS plugin |
| `postcss` | 8.5.6 | PostCSS |
| `lovable-tagger` | 1.1.13 | Component tagging (dev) |

### 2.3 Script NPM

```json
{
  "dev": "vite",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

---

## 3. Struttura del Progetto

```
project-root/
├── public/
├── src/
│   ├── assets/                    # Immagini JPG (9 foto preparazioni)
│   │   ├── farmaco1.jpg
│   │   ├── farmaco2.jpg
│   │   ├── diluente1.jpg
│   │   ├── diluente2.jpg
│   │   ├── contenitore1.jpg
│   │   ├── contenitore2.jpg
│   │   ├── preparazione1.jpg
│   │   ├── preparazione2.jpg
│   │   └── preparazione3.jpg
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── FiltersBar.tsx     # (non usato nell'app attuale)
│   │   │   ├── Navbar.tsx
│   │   │   ├── PreparationsTable.tsx
│   │   │   ├── RejectDialog.tsx
│   │   │   └── StatCards.tsx
│   │   ├── ui/                    # ~60 componenti shadcn/ui
│   │   │   └── [accordion, alert, avatar, badge, button, card,
│   │   │       calendar, carousel, chart, checkbox, collapsible,
│   │   │       command, context-menu, dialog, drawer, dropdown-menu,
│   │   │       form, hover-card, input, input-otp, label, menubar,
│   │   │       navigation-menu, pagination, popover, progress,
│   │   │       radio-group, resizable, scroll-area, select, separator,
│   │   │       sheet, sidebar, skeleton, slider, sonner, switch,
│   │   │       table, tabs, textarea, toast, toaster, toggle,
│   │   │       toggle-group, tooltip, use-toast, aspect-ratio,
│   │   │       alert-dialog, breadcrumb].tsx
│   │   └── NavLink.tsx
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── PreparationsContext.tsx
│   ├── data/
│   │   └── preparations.ts        # Tipi + dati iniziali + helpers
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── utils.ts               # cn() utility
│   │   └── generateLabelPdf.ts    # Generazione PDF etichetta 80×80mm
│   ├── pages/
│   │   ├── Analytics.tsx
│   │   ├── Index.tsx
│   │   ├── Login.tsx
│   │   ├── NotFound.tsx
│   │   └── PreparationDetail.tsx
│   ├── test/
│   │   ├── example.test.ts
│   │   └── setup.ts
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── components.json                # Config shadcn/ui
├── eslint.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts
```

---

## 4. Modelli di Dati e Tipi TypeScript

File: `src/data/preparations.ts`

### 4.1 Tipi Union

```typescript
type Status = "completata" | "esecuzione" | "errore" | "attesa" | "validata" | "rifiutata"

type Priority = "alta" | "media" | "bassa"

type PrepType = "infusione_iv" | "siringa_ricostituita"

type RejectionReason =
  | "Sovradosaggio"
  | "Sottodosaggio"
  | "Farmaco errato"
  | "Paziente errato"
  | "Contaminazione"
  | "Etichetta errata"
  | "Contenitore errato"
  | "Diluente errato"
  | "Scadenza superata"
  | "Altro"
```

### 4.2 Interfacce

```typescript
interface ComponentPhoto {
  type: "farmaco" | "diluente" | "contenitore" | "preparazione"
  label: string
  url: string           // path immagine locale
  barcode?: string      // numero barcode opzionale
}

interface SupplementaryDose {
  time: string          // formato HH:MM
  amount: number        // quantità numerica
  unit: string          // es. "ml"
  reason: string        // spiegazione testuale
}

interface LabelData {
  patientName: string
  patientId: string
  drug: string
  dosage: string
  route: string         // es. "Endovenosa", "Endovenosa lenta"
  volume: string        // es. "100 ml"
  preparedBy: string
  preparedAt: string    // formato "DD/MM/YYYY HH:MM"
  expiresAt: string     // formato "DD/MM/YYYY HH:MM"
  lotNumber: string     // es. "LOT-2026-02-2847"
  notes: string
}

interface Preparation {
  id: string                    // es. "RX-2847"
  status: Status
  priority: Priority
  prepType: PrepType
  drug: string                  // nome farmaco + dosaggio
  form: string                  // forma farmaceutica
  container: string             // tipo contenitore
  dispensed: number             // ml dispensati
  target: number                // ml target
  errorRate: number             // percentuale errore (es. 0.2)
  executor: string | null       // es. "L. Bianchi"
  executorInitials: string | null  // es. "LB"
  station: string | null        // es. "Cappa 1"
  date: string                  // formato YYYY-MM-DD
  requestedAt: string           // formato HH:MM
  startedAt: string | null      // formato HH:MM
  finishedAt: string | null     // formato HH:MM
  photos: ComponentPhoto[]
  supplementaryDoses: SupplementaryDose[]
  labelData: LabelData
}
```

### 4.3 Dati iniziali (10 preparazioni)

Il file `preparations.ts` esporta un array `preparations` con 10 record predefiniti:

| ID | Farmaco | Status | Priority | PrepType | Executor | Station |
|---|---|---|---|---|---|---|
| RX-2847 | Ceftriaxone 2g | completata | alta | infusione_iv | L. Bianchi | Cappa 1 |
| RX-2846 | Vancomicina 1g | esecuzione | alta | infusione_iv | M. Ferrari | Cappa 2 |
| RX-2845 | Meropenem 2g | errore | alta | infusione_iv | A. Russo | Cappa 1 |
| RX-2844 | Pantoprazolo 40mg | attesa | media | infusione_iv | null | null |
| RX-2843 | Piperacillina/Tazobactam 4.5g | completata | alta | infusione_iv | L. Bianchi | Cappa 1 |
| RX-2842 | Morfina Solfato 10mg | completata | alta | siringa_ricostituita | C. Romano | Cappa 3 |
| RX-2841 | Furosemide 40mg | completata | media | siringa_ricostituita | M. Ferrari | Cappa 2 |
| RX-2840 | Amoxicillina/Acido Clavulanico 2.2g | attesa | media | infusione_iv | null | null |
| RX-2839 | Metronidazolo 500mg | attesa | bassa | infusione_iv | null | null |
| RX-2838 | Insulina Regolare 50UI | completata | alta | siringa_ricostituita | A. Russo | Cappa 1 |

**Dati di riferimento usati per la generazione**:

*Pazienti (8)*: Mario Rossi, Laura Bianchi, Giuseppe Verdi, Anna Neri, Francesco Esposito, Maria Conti, Antonio Lombardi, Giulia Ricci

*Esecutori (5)*: L. Bianchi (LB), M. Ferrari (MF), A. Russo (AR), C. Romano (CR), F. Costa (FC)

*Stazioni (4)*: Cappa 1, Cappa 2, Cappa 3, Cappa 4

*Farmaci (14)*: Ceftriaxone 2g, Vancomicina 1g, Meropenem 2g, Amoxicillina/Clavulanico 2.2g, Piperacillina/Tazobactam 4.5g, Fluconazolo 200mg, Pantoprazolo 40mg, Furosemide 40mg, Insulina Regular 50UI, Morfina Solfato 10mg, Metronidazolo 500mg, Ciprofloxacina 400mg, Levofloxacina 500mg, Tacrolimus 5mg

### 4.4 Photo Assets

Esportati come oggetto `photoAssets`:

```typescript
export const photoAssets = {
  farmaco1: farmaco1Img,
  farmaco2: farmaco2Img,
  diluente1: diluente1Img,
  diluente2: diluente2Img,
  contenitore1: contenitore1Img,
  contenitore2: contenitore2Img,
  preparazione1: preparazione1Img,
  preparazione2: preparazione2Img,
  preparazione3: preparazione3Img,
}
```

**Helper functions**:

```typescript
// Genera array di 4 foto per infusione IV
function ivPhotos(): ComponentPhoto[]

// Genera array di 4 foto per siringa ricostituita
function syringePhotos(): ComponentPhoto[]
```

---

## 5. Routing e Navigazione

### 5.1 Configurazione Route (React Router v6)

File: `src/App.tsx`

```typescript
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={
      <ProtectedRoute><Index /></ProtectedRoute>
    } />
    <Route path="/preparation/:id" element={
      <ProtectedRoute><PreparationDetail /></ProtectedRoute>
    } />
    <Route path="/analytics" element={
      <ProtectedRoute><Analytics /></ProtectedRoute>
    } />
    <Route path="*" element={<NotFound />} />
  </Routes>
</BrowserRouter>
```

### 5.2 ProtectedRoute

```typescript
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
```

### 5.3 URL State Management (Index page)

I filtri della dashboard sono salvati come query params dell'URL:

| Parametro | Tipo | Esempio | Default |
|---|---|---|---|
| `dateFrom` | string (YYYY-MM-DD) | `?dateFrom=2026-02-01` | oggi |
| `dateTo` | string (YYYY-MM-DD) | `?dateTo=2026-02-27` | oggi |
| `status` | Status | `?status=completata` | — (azzerato al cambio tab) |
| `tab` | "da-valutare" \| "archivio" | `?tab=archivio` | "da-valutare" |

Questo permette deep linking e supporto al tasto Back del browser.

**Comportamento al cambio tab**: quando l'utente commuta tra le due tab, il parametro `status` viene rimosso automaticamente dall'URL per evitare filtri incoerenti tra i due contesti.

**Guardie coerenza range**: se l'utente seleziona una data "Da" successiva alla "A", la "A" viene automaticamente allineata alla "Da" (e viceversa), evitando range invertiti.

### 5.4 Navigazione Programmatica

- **NavLink** nel Navbar usa `<Link>` di React Router
- **PreparationsTable** usa `useNavigate()` per andare al dettaglio
- **PreparationDetail** usa `useNavigate(-1)` per tornare indietro

---

## 6. Gestione dello Stato

### 6.1 Architettura

```
App (root)
├── QueryClientProvider         → TanStack React Query (configurato, non attivo)
├── TooltipProvider             → Radix UI tooltips globali
├── BrowserRouter
├── AuthProvider                → Stato autenticazione globale
└── PreparationsProvider        → Stato preparazioni globale
    ├── Toaster                 → Toast notifications
    ├── Sonner                  → Toast alternativo
    └── Routes ...
```

### 6.2 Stato Globale — AuthContext

Stato: `{ isAuthenticated: boolean, username: string | null }`

Persistenza: `sessionStorage` (chiavi: `auth`, `auth_user`)

### 6.3 Stato Globale — PreparationsContext

Stato:
```typescript
{
  preparations: Preparation[],
  rejectionMap: Record<string, RejectionReason>
}
```

Metodi esposti:
```typescript
validatePreparation(id: string): void
rejectPreparation(id: string, reason: RejectionReason): void
getRejectionReason(id: string): RejectionReason | undefined
undoPreparation(id: string): void
```

**Logica post-azione (validate/reject)**: Lo status della preparazione viene aggiornato (`validata` o `rifiutata`). Lo stato precedente viene salvato in `previousStatusMap` prima della modifica. Nessuna nuova preparazione viene generata automaticamente, in modo che i contatori della dashboard riflettano correttamente le azioni dell'utente.

**Logica `undoPreparation`**: Ripristina la preparazione allo stato registrato in `previousStatusMap[id]` (default: `"completata"` se non trovato). Rimuove il motivo di rifiuto da `rejectionMap` e pulisce `previousStatusMap`. La preparazione torna visibile nella tab "Da Valutare". La preparazione generata automaticamente al momento della validazione/rifiuto rimane nell'elenco come entità separata.

### 6.4 Stato Locale

| Pagina/Componente | Stato locale |
|---|---|
| `Index.tsx` | `tab`, `dateFrom`, `dateTo`, `statusFilter` (tutti via `useSearchParams`) |
| `PreparationsTable.tsx` | `selected[]`, `searchQuery`, `sortKey`, `sortDir`, `currentPage` |
| `Analytics.tsx` | `fromDate`, `toDate` |
| `PreparationDetail.tsx` | `rejectDialogOpen` |
| `Login.tsx` | `username`, `password`, `error` |

---

## 7. Sistema di Autenticazione

File: `src/context/AuthContext.tsx`

### 7.1 Credenziali (Hardcoded)

```
Username: pharma
Password: ivone
```

### 7.2 Flusso Login

1. Utente inserisce username e password in `/login`
2. Viene chiamato `login(username, password)` dall'AuthContext
3. Se le credenziali corrispondono:
   - `sessionStorage.setItem("auth", "1")`
   - `sessionStorage.setItem("auth_user", username)`
   - Stato aggiornato: `isAuthenticated = true`
   - Redirect a `/`
4. Se errate: viene mostrato messaggio di errore nel form

### 7.3 Flusso Logout

1. Chiama `logout()` dall'AuthContext
2. Cancella `sessionStorage.auth` e `sessionStorage.auth_user`
3. `isAuthenticated = false`

### 7.4 Persistenza

`sessionStorage` — la sessione è valida finché la scheda del browser rimane aperta.

### 7.5 Inizializzazione

All'avvio dell'app, AuthContext legge `sessionStorage.auth` per ripristinare la sessione dopo un refresh della pagina.

---

## 8. Pagine e Componenti

### 8.1 Login

**File**: `src/pages/Login.tsx`
**Route**: `/login` (pubblica)

#### Layout

- Sfondo grigio chiaro, form centrato verticalmente e orizzontalmente
- Scheda (`<Card>`) con ombra e angoli arrotondati
- Icona cerchio con simbolo farmacia al centro in cima
- Titolo: "PharmPrep"
- Sottotitolo: "Sistema di gestione preparazioni"

#### Elementi Form

| Campo | Tipo | Label | Placeholder |
|---|---|---|---|
| username | `<Input type="text">` | "Username" | "pharma" |
| password | `<Input type="password">` | "Password" | "••••••" |
| submit | `<Button type="submit">` | "Accedi" | — |

#### Comportamento

- Al submit: chiama `auth.login(username, password)`
- In caso di errore: mostra messaggio di errore sotto il form (testo rosso)
- In caso di successo: `navigate("/")` con `replace: true`
- Se già autenticato: redirect immediato a `/`

---

### 8.2 Dashboard (Index)

**File**: `src/pages/Index.tsx`
**Route**: `/` (protetta)

#### Layout

```
<Navbar />
<main>
  <!-- Header: titolo + DatePicker (condiviso tra tab) -->
  <div class="header-row">
    <h1>Dashboard Preparazioni</h1>
    <DatePicker />    <!-- Selettore data, aggiorna query param ?date -->
  </div>

  <!-- Tab switcher -->
  <Tabs value={tab} onValueChange={setTab}>
    <TabsList>
      <TabsTrigger value="da-valutare">
        <ClipboardList /> Da Valutare <Badge>{activeDayPreps.length}</Badge>
      </TabsTrigger>
      <TabsTrigger value="archivio">
        <Archive /> Archivio <Badge>{archivedDayPreps.length}</Badge>
      </TabsTrigger>
    </TabsList>

    <!-- Tab 1: Da Valutare -->
    <TabsContent value="da-valutare">
      <StatCards activeStatus={statusFilter} onStatusClick={...} dateFilter={dateFilterStr} />
      <PreparationsTable mode="active" statusFilter={statusFilter} dateFilter={dateFilterStr} />
    </TabsContent>

    <!-- Tab 2: Archivio -->
    <TabsContent value="archivio">
      <!-- Card validate / rifiutate cliccabili per filtrare -->
      <ArchiveSummaryCards validatedCount={n} rejectedCount={n} statusFilter={statusFilter} />
      <PreparationsTable mode="archived" statusFilter={statusFilter} dateFilter={dateFilterStr} />
    </TabsContent>
  </Tabs>
</main>
```

#### Tab Switcher

Il componente `<Tabs>` di shadcn/ui funge da selettore principale. Entrambe le tab mostrano un **badge con il conteggio** delle preparazioni del giorno per quella categoria, aggiornato in tempo reale.

**Stile tab**:
- Layout: `grid-cols-2` su mobile, `inline-flex` su desktop
- Tab inattiva: sfondo trasparente
- Tab attiva: sfondo `background`, ombra leggera `shadow-sm`
- Badge tab attiva: `bg-primary text-primary-foreground`
- Badge tab inattiva: `bg-muted-foreground/20 text-muted-foreground`

**Comportamento cambio tab**:
- Scrive `?tab=da-valutare` o `?tab=archivio` nell'URL
- Rimuove il parametro `?status` per azzerare filtri incoerenti
- Deep-link e tasto Back del browser supportati

#### Filtro Data (condiviso tra tab)

Controlli posizionati nell'header, sopra le tab. Composto da tre elementi affiancati:

```
[CalendarCheck  Oggi]  Da [📅 gg mmm aaaa]  →  A [📅 gg mmm aaaa]
```

| Elemento | Tipo | Comportamento |
|---|---|---|
| **Oggi** | `<Button>` | Imposta `dateFrom = dateTo = oggi`. Appare in `variant="default"` (pieno) se il range corrisponde già a oggi, altrimenti `variant="outline"` |
| **Da** | `<Popover>` + `<Calendar>` | Seleziona data inizio. Se la data scelta è successiva a `dateTo`, `dateTo` viene automaticamente allineata |
| **A** | `<Popover>` + `<Calendar>` | Seleziona data fine. Se la data scelta è precedente a `dateFrom`, `dateFrom` viene automaticamente allineata |

- Locale: italiano (`it` di date-fns)
- Default: entrambe le date = data odierna
- Scrive `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` nell'URL
- Aggiorna contatori badge tab e tabelle di **entrambe** le tab
- Icone: `CalendarIcon` per i picker, `CalendarCheck` per il tasto Oggi

#### Tab "Da Valutare"

Contiene le preparazioni con status: `attesa`, `esecuzione`, `errore`, `completata`.

Sezioni:
1. **StatCards** (5 schede cliccabili) — vedi [9.3 StatCards](#93-statcards)
2. **PreparationsTable** in `mode="active"` — vedi [9.2 PreparationsTable](#92-preparationstable)

Filtro status: click su una StatCard imposta `?status=<valore>` nell'URL. Click sulla stessa card deseleziona.

#### Tab "Archivio"

Contiene le preparazioni con status: `validata`, `rifiutata`.

Sezioni:
1. **Schede di riepilogo archivio** (2 schede cliccabili):

| Scheda | Icona | Colore | Azione click |
|---|---|---|---|
| Validate | ShieldCheck | verde (`text-status-complete`) | Imposta `?status=validata` |
| Rifiutate | ShieldX | rosso (`text-status-error`) | Imposta `?status=rifiutata` |

Le schede sono stilisticamente identiche alle StatCards: `border-2`, bordo colorato quando attive, sfondo `bg-card`.

2. **PreparationsTable** in `mode="archived"` — vedi [9.2 PreparationsTable](#92-preparationstable)

#### StatCards

Vedi sezione [9.3 StatCards](#93-statcards).

#### PreparationsTable

Vedi sezione [9.2 PreparationsTable](#92-preparationstable).

---

### 8.3 Dettaglio Preparazione

**File**: `src/pages/PreparationDetail.tsx`
**Route**: `/preparation/:id` (protetta)

#### Layout

```
<!-- Header sticky -->
<header sticky>
  <Button back> ← </Button>
  <h1>{id} - {drug}</h1>
  <Badge status />
  <Badge priority />
  <div actions>
    <Button "Stampa Etichetta" />   <!-- Stampa etichetta -->
    <Button "Valida" variant="success" />
    <Button "Rifiuta" variant="destructive" />
  </div>
</header>

<!-- Body -->
<div class="grid-2col">
  <!-- Colonna sinistra -->
  <Section "Foto Componenti">
    <PhotoGrid photos={preparation.photos} />
  </Section>

  <Section "Dosi Supplementari">
    <DoseTable doses={preparation.supplementaryDoses} />
  </Section>

  <Section "Tempi">
    <TimelineRow "Richiesta" requestedAt />
    <TimelineRow "Inizio" startedAt />
    <TimelineRow "Fine" finishedAt />
    <TimelineRow "Durata" calcolata />
  </Section>

  <!-- Colonna destra -->
  <Section "Quantità">
    <StatRow "Volume Target" target />
    <StatRow "Volume Erogato" dispensed />
    <ProgressBar value={dispensed/target * 100} />
    <StatRow "Tasso Errore" errorRate />
  </Section>

  <Section "Esecutore">
    <Avatar initials={executorInitials} />
    <p>{executor}</p>
    <p>{station}</p>
  </Section>

  <Section "Dati Etichetta">
    <LabelDataRows labelData={...} />
  </Section>
</div>

<!-- RejectDialog -->
<RejectDialog
  open={rejectDialogOpen}
  preparationIds={[id]}
  onConfirm={handleReject}
  onCancel={() => setRejectDialogOpen(false)}
/>
```

#### Sezione Foto Componenti

Griglia 2x2 con 4 foto:
- farmaco (tipo: farmaco)
- diluente (tipo: diluente)
- contenitore (tipo: contenitore)
- preparazione finale (tipo: preparazione)

Ogni foto mostra: immagine, label testuale, barcode (se presente).

#### Sezione Dosi Supplementari

Tabella con colonne: Ora, Quantità, Unità, Motivo. Visibile solo se `supplementaryDoses.length > 0`.

#### Sezione Tempi

4 righe con icona orologio:
- Richiesta: `requestedAt`
- Inizio: `startedAt` (o "—" se null)
- Fine: `finishedAt` (o "—" se null)
- Durata: calcolata da startedAt a finishedAt in minuti (es. "27 min")

#### Sezione Quantità

- Volume Target: `{target} ml`
- Volume Erogato: `{dispensed} ml`
- Barra progresso: `(dispensed / target) * 100`%
- Tasso Errore: `{errorRate}%` — rosso se `> 2`, giallo se `> 0`, verde se `= 0`

#### Sezione Dati Etichetta

Griglia di label-valore per tutti i campi di `LabelData`:
- Paziente, ID Paziente
- Farmaco, Dosaggio, Via di somministrazione
- Volume, Preparato da
- Data preparazione, Scadenza
- Numero lotto, Note

#### Azioni

| Pulsante | Azione | Condizione visibilità/abilitazione |
|---|---|---|
| Ristampa Etichetta | `generateLabelPdf(prep)` → genera PDF 80×80mm e lo apre in una nuova scheda browser | Sempre visibile; **disabilitato** se status = `attesa` o `esecuzione` |
| Valida | `validatePreparation(id)` → redirect alla dashboard | Visibile solo se status = `completata` o `errore` |
| Rifiuta | Apre `RejectDialog` | Visibile solo se status = `completata` o `errore` |
| **Annulla** | `undoPreparation(id)` → ripristina status precedente → redirect alla dashboard | Visibile solo se status = `validata` o `rifiutata` |

Il pulsante **Ristampa Etichetta** è **disabilitato** (con tooltip esplicativo) quando la preparazione è in stato `attesa` o `esecuzione`, poiché l'etichetta è valida solo a lavorazione terminata.

Il pulsante **Annulla** appare affiancato al badge di stato `validata`/`rifiutata` e riporta la preparazione nella tab "Da Valutare" con il suo status originale.

#### Generazione PDF Etichetta — `src/lib/generateLabelPdf.ts`

Genera un PDF 80×80mm pronto per la stampa su etichetta farmaceutica.

**Dipendenze**: `jspdf`, `jsbarcode`

**Layout etichetta** (dall'alto verso il basso):

```
┌──────────────────────────────────────────────────┐
│ PharmAR System                          RX-2847  │  ← header (5.5pt grigio / 6.5pt bold)
│ ─────────────────────────────────────────────── │
│ CEFTRIAXONE 2G IN NACL 0.9%                      │  ← farmaco (9pt bold, uppercase)
│ Dose: 2g    Via: Endovenosa                      │  ← dose + via (6.5pt)
│ Volume: 100ml                                    │  ← volume (6.5pt)
│ ─────────────────────────────────────────────── │
│ Paziente: Mario Rossi                            │  ← nome (7.5pt bold)
│ ID: PAZ-20240315-001                             │  ← ID paziente (6pt grigio)
│ ─────────────────────────────────────────────── │
│ Preparato:  27/02/2026 09:12                     │  ← timestamp prep (6.5pt)
│ Scadenza:   28/02/2026 09:12                     │  ← scadenza (6.5pt)
│ Prep. da: L. Bianchi       Lotto: LOT-2026-…    │  ← preparer + lotto (6pt)
│ Note: Infondere in 30 minuti. Conservare a…      │  ← note troncate 1 riga (5.5pt grigio)
│ ─────────────────────────────────────────────── │
│ ║║║║ ║║║ ║║║║ ║║ ║║║║║║║║║║║║║║║║║║║║║║║║║║║  │  ← barcode Code128
│                RX-2847                           │
└──────────────────────────────────────────────────┘
```

**Specifiche tecniche**:

| Campo | Valore |
|---|---|
| Formato pagina | 80×80mm (personalizzato) |
| Margini | 3.5mm per lato |
| Barcode format | Code128 |
| Barcode ID | `preparation.id` (es. "RX-2847") |
| Barcode dimensioni | larghezza = contenuto (73mm), altezza = spazio rimanente |
| Bordo | rettangolo arrotondato `roundedRect` 0.3pt grigio |
| Separatori | linee orizzontali `0.2pt` grigio chiaro |
| Output | PDF aperto in nuova scheda browser (nessun download automatico) |

**Campi inclusi nell'etichetta** (da `preparation.labelData`):

| Campo `LabelData` | Mostrato come |
|---|---|
| `drug` | Farmaco — uppercase bold |
| `dosage` | Dose |
| `route` | Via di somministrazione |
| `volume` | Volume |
| `patientName` | Paziente |
| `patientId` | ID Paziente |
| `preparedAt` | Data preparazione |
| `expiresAt` | Data scadenza |
| `preparedBy` | Preparato da |
| `lotNumber` | Numero lotto (allineato a destra) |
| `notes` | Note (prima riga, troncata) |

**Campi NON inclusi** (non necessari in etichetta): `photos`, `supplementaryDoses`, `executor`, `station`, `errorRate`, `dispensed/target`

**Flusso di generazione**:
```typescript
// 1. Crea documento jsPDF 80×80mm
const pdf = new jsPDF({ unit: "mm", format: [80, 80] })

// 2. Disegna layout testuale
// ...testi, linee, bordo...

// 3. Genera barcode su canvas offscreen
const canvas = document.createElement("canvas")
JsBarcode(canvas, prep.id, { format: "CODE128", ... })

// 4. Embed barcode come immagine PNG nel PDF
pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, w, h)

// 5. Apri in nuova scheda (no download automatico)
const blobUrl = pdf.output("bloburl")
window.open(blobUrl, "_blank")
```

---

### 8.4 Analytics

**File**: `src/pages/Analytics.tsx`
**Route**: `/analytics` (protetta)

#### Layout

```
<Navbar />
<main>
  <h1>Analytics & Reportistica</h1>

  <!-- Filtro Date Range -->
  <div class="date-range-row">
    <DateRangePicker from={fromDate} to={toDate} />
  </div>

  <!-- KPI Cards (6) -->
  <div class="grid-6col">
    <KpiCard "Totale Preparazioni" />
    <KpiCard "In Attesa" />
    <KpiCard "In Esecuzione" />
    <KpiCard "Completate" />
    <KpiCard "Errori" />
    <KpiCard "Tasso Errore Medio" />
  </div>

  <!-- Riga Grafici -->
  <div class="grid-3col">
    <PieChart "Distribuzione per Stato" />
    <PieChart "Distribuzione per Priorità" />
    <Card "Tipo Preparazione & Completamento" />
  </div>

  <!-- Bar Chart Stazioni -->
  <BarChart "Performance Stazioni" />

  <!-- Tabella Riepilogo -->
  <Table "Riepilogo Preparazioni" />
</main>
```

#### Filtro Date Range

Due `<Popover>` + `<Calendar>` (Da — A):
- Default: dal 1° del mese corrente a oggi
- Filtra tutte le preparazioni nell'intervallo `date >= from && date <= to`

#### KPI Cards (6)

| Card | Calcolo |
|---|---|
| Totale Preparazioni | `preparations.length` filtrate |
| In Attesa | `count(status === "attesa")` |
| In Esecuzione | `count(status === "esecuzione")` |
| Completate | `count(status === "completata")` |
| Errori | `count(status === "errore")` |
| Tasso Errore Medio | `avg(errorRate)`% con 2 decimali |

#### Grafici Recharts

**1. PieChart — Distribuzione per Stato**

Dati: conteggio per ciascuno dei 6 status

Colori (HSL custom):
| Status | Colore |
|---|---|
| completata | verde `hsl(152, 60%, 44%)` |
| esecuzione | arancio `hsl(36, 90%, 52%)` |
| errore | rosso `hsl(0, 72%, 56%)` |
| attesa | blu `hsl(215, 80%, 52%)` |
| validata | verde scuro |
| rifiutata | rosso scuro |

Mostra: `<PieChart>` con `<Pie>`, `<Tooltip>`, `<Legend>`

**2. PieChart — Distribuzione per Priorità**

Dati: conteggio per alta/media/bassa

Colori:
| Priorità | Colore |
|---|---|
| alta | rosso |
| media | arancio |
| bassa | verde |

**3. Card — Tipo Preparazione & Completamento**

Mostra:
- Conta `infusione_iv` vs `siringa_ricostituita`
- Percentuale completamento (completata + validata) / totale

**4. BarChart — Performance Stazioni**

Assi:
- X: nome stazione (Cappa 1, 2, 3, 4)
- Y: numero preparazioni

3 barre per stazione:
- Totale (grigio/blu)
- Completate (verde)
- Errori (rosso)

Usa: `<BarChart>`, `<Bar>`, `<XAxis>`, `<YAxis>`, `<CartesianGrid>`, `<Tooltip>`, `<Legend>`

#### Tabella Riepilogo

Colonne: ID, Farmaco, Status (badge), Priorità (badge), Tasso Errore (colorato)

Mostra tutte le preparazioni filtrate per data range.

---

### 8.5 404 Not Found

**File**: `src/pages/NotFound.tsx`
**Route**: `*`

Layout minimale con:
- Messaggio di errore 404
- Link "Torna alla Home" → `<Link to="/">`
- `console.error("404 error: User navigated to:", location.pathname)` al mount

---

## 9. Componenti Condivisi

### 9.1 Navbar

**File**: `src/components/dashboard/Navbar.tsx`

#### Struttura

```
<header class="navbar sticky top-0 z-50">
  <div class="container mx-auto flex items-center justify-between">
    <!-- Brand -->
    <div class="brand">
      <span>💊</span>
      <span>PharmAR System</span>
    </div>

    <!-- Nav Links (hidden su mobile) -->
    <nav class="hidden md:flex">
      <NavLink to="/">Preparazioni</NavLink>
      <NavLink to="/analytics">Analytics</NavLink>
    </nav>

    <!-- Destra: barcode + search + notifiche + utente -->
    <div class="right-section flex items-center gap-3">
      <Input placeholder="Scan barcode..." />     <!-- non funzionale -->
      <Input placeholder="Cerca..." icon={Search} />
      <Button icon={Bell} class="relative">
        <span class="badge red absolute" />        <!-- dot rosso -->
      </Button>
      <div class="user-info flex items-center">
        <Avatar initials="MR" />
        <div>
          <p>Dr. Marco Rossi</p>
          <p class="text-muted text-xs">Supervisore</p>
        </div>
      </div>
    </div>
  </div>
</header>
```

#### NavLink (evidenziazione pagina attiva)

**File**: `src/components/NavLink.tsx`

Usa `useLocation()` per determinare il percorso corrente. Applica classi CSS aggiuntive se `location.pathname === to`.

Classe attiva: `font-semibold text-primary border-b-2 border-primary`
Classe inattiva: `text-muted-foreground hover:text-foreground`

---

### 9.2 PreparationsTable

**File**: `src/components/dashboard/PreparationsTable.tsx`

#### Props

```typescript
interface PreparationsTableProps {
  mode: "active" | "archived"   // "active" = Da Valutare, "archived" = Archivio
  statusFilter?: Status | null
  dateFrom?: string             // YYYY-MM-DD — inizio intervallo
  dateTo?: string               // YYYY-MM-DD — fine intervallo
}
```

> La prop `showArchived` è stata **rimossa** nella v1.1. La prop `dateFilter` è stata **sostituita** da `dateFrom` + `dateTo` nella v1.3.

#### Colonne della Tabella — Modalità `active`

| # | Header | Contenuto | Ordinabile |
|---|---|---|---|
| 0 | Checkbox | Select row | no |
| 1 | ID / Stato | `{id}` + Badge status + Badge priority | sì (status) |
| 2 | Richiesta | `{drug}` + `{container}` | sì (drug) |
| 3 | Quantità | Progress bar + `{dispensed}/{target} ml` | sì (dispensed%) |
| 4 | Errore % | `{errorRate}%` (rosso se >2, giallo se >0) | sì (errorRate) |
| 5 | Postazione | `{station}` | sì (executor) |
| 6 | Tempistiche | `Richiesta: {requestedAt}` / `Inizio: {startedAt}` / `Fine: {finishedAt}` | sì (requestedAt) |
| 7 | Azioni | Icone Valida / Rifiuta / Dettagli | no |

#### Colonne della Tabella — Modalità `archived`

Identiche alla modalità `active`, con queste differenze:
- **Colonna checkbox assente** (non è necessaria la selezione)
- **Colonna Motivo** aggiunta tra "Tempistiche" e "Azioni": mostra il motivo del rifiuto (da `getRejectionReason(id)`) come badge rosso, oppure `—` se non presente (preparazioni validate)
- **Colonna Azioni** contiene solo il bottone Dettagli (ArrowRight)

#### Filtri Interni

- **Search box**: filtra su `id`, `drug`, `form`, `container`, `executor`, `station`, `status`, `priority`, `requestedAt`, `startedAt`, `finishedAt`, `errorRate`, `dispensed`, `target`
- **dateFrom / dateTo props**: filtro per intervallo di date (`p.date >= dateFrom && p.date <= dateTo`). Confronto su stringhe YYYY-MM-DD (ordinamento lessicografico = cronologico)
- **mode prop**: determina quale sottoinsieme di preparazioni è visibile
- **statusFilter prop**: filtro aggiuntivo per status specifico (applicato dopo il mode filter)

**Logica filtri**:
```typescript
// 1. Filtro per intervallo date
if (dateFrom) data = data.filter(p => p.date >= dateFrom)
if (dateTo)   data = data.filter(p => p.date <= dateTo)

// 2. Filtro per mode
if (mode === "archived") {
  data = data.filter(p => p.status === "validata" || p.status === "rifiutata")
} else {
  data = data.filter(p => p.status !== "validata" && p.status !== "rifiutata")
}

// 3. Filtro per status (opzionale, da URL)
if (statusFilter) data = data.filter(p => p.status === statusFilter)

// 4. Ricerca testuale
data = data.filter(p => campi.some(v => v.includes(query)))
```

#### Ordinamento

Click sull'header di colonna ordinabile → imposta `sortKey` e inverte `sortDir` (asc/desc).

Default: nessun ordinamento (ordine originale array).

Implementazione: `[...filtered].sort((a, b) => ...)` lato client.

#### Paginazione

- Elementi per pagina: **10**
- Controlli: Precedente, numeri pagina, Successivo
- Reset a pagina 1 quando cambiano i filtri

#### Selezione e Azioni Bulk (solo `mode="active"`)

- Checkbox in ogni riga → aggiunge/rimuove ID da `selected[]`
- Checkbox header → seleziona/deseleziona tutti nella pagina corrente
- Se `selected.length > 0`: mostra bottone "Valida (N)" nella barra header
- Solo le preparazioni con status `completata` o `errore` vengono incluse nella validazione bulk (le altre sono filtrate)
- In `mode="archived"` la colonna checkbox e le azioni bulk **non sono presenti**

#### Azioni per Riga

I bottoni azione sono **etichettati** (icona + testo) con sfondo colorato sempre visibile, padding generoso e dimensione `text-xs font-semibold`. Si adattano su più righe via `flex-wrap` se lo spazio è insufficiente.

**Modalità `active`**:

| Bottone | Icona | Stile | Condizione | Azione |
|---|---|---|---|---|
| **Valida** | `Check` (h-4 w-4) | `bg-status-complete-bg text-status-complete`, hover `bg-status-complete/20` | status ≠ `attesa` e ≠ `esecuzione` | `validatePreparation(id)` |
| **Rifiuta** | `X` (h-4 w-4) | `bg-status-error-bg text-status-error`, hover `bg-status-error/20` | status ≠ `attesa` e ≠ `esecuzione` | Apre `RejectDialog` |
| **Dettagli** | `ArrowRight` (h-4 w-4) | `bg-primary/10 text-primary`, hover `bg-primary/20` | sempre | `navigate("/preparation/${id}")` |

Per preparazioni con status `attesa` o `esecuzione` viene mostrato solo il bottone **Dettagli**.

**Modalità `archived`**:

| Bottone | Icona | Stile | Azione |
|---|---|---|---|
| **Annulla** | `RotateCcw` (h-4 w-4) | `bg-status-progress-bg text-status-progress`, hover `bg-status-progress/20` | `undoPreparation(id)` → ripristina stato precedente, rimuove motivo rifiuto, sposta la prep nella tab "Da Valutare" |
| **Dettagli** | `ArrowRight` (h-4 w-4) | `bg-primary/10 text-primary`, hover `bg-primary/20` | `navigate("/preparation/${id}")` |

**Struttura comune bottone**:
```
className="inline-flex items-center gap-1.5 rounded-lg {colori} px-3 py-1.5 text-xs font-semibold transition-colors"
```

#### Empty State

Quando `sorted.length === 0` il componente renderizza un pannello centrato con:
- Icona `PackageOpen`
- Testo contestuale diverso per `mode="active"` e `mode="archived"`
- Se la ricerca è attiva: mostra query e link "Cancella ricerca"

#### Badge Status

| Status | Colore Badge |
|---|---|
| completata | verde |
| esecuzione | arancio/giallo |
| errore | rosso |
| attesa | blu |
| validata | verde scuro |
| rifiutata | rosso scuro |

#### Badge Priority

| Priorità | Colore |
|---|---|
| alta | rosso |
| media | arancio |
| bassa | verde |

---

### 9.3 StatCards

**File**: `src/components/dashboard/StatCards.tsx`

#### Props

```typescript
interface StatCardsProps {
  activeStatus: Status | null
  onStatusClick: (status: Status | null) => void
  dateFrom: string   // YYYY-MM-DD — inizio intervallo
  dateTo: string     // YYYY-MM-DD — fine intervallo
}
```

#### Schede (5)

| Card | Icona | Status filtrato | Colore accento |
|---|---|---|---|
| Totale | LayoutGrid | null (tutte) | indigo |
| In Attesa | Clock | "attesa" | blu |
| In Esecuzione | Loader2 | "esecuzione" | arancio |
| Completate | CheckCircle2 | "completata" | verde |
| Con Errori | AlertTriangle | "errore" | rosso |

**Calcolo**: ogni card conta le preparazioni nell'intervallo `dateFrom ≤ date ≤ dateTo` e status corrispondente. Il contatore **Totale** esclude le preparazioni archiviate (status `validata` e `rifiutata`), poiché quelle vivono nella tab "Archivio".

```typescript
// Filtro applicato prima dei conteggi:
const forDate = preparations.filter(p =>
  p.date >= dateFrom && p.date <= dateTo &&
  p.status !== "validata" && p.status !== "rifiutata"
)
```

> `StatCards` è usato **esclusivamente nella tab "Da Valutare"**. La tab "Archivio" ha le proprie schede di riepilogo inline (vedi sezione 8.2).

**Interattività**:
- Click su una card → `onStatusClick(status)` → aggiorna `statusFilter` nell'Index
- Se la card è quella attiva (`activeStatus === status`): bordo/sfondo evidenziato
- Click sulla card già attiva → deseleziona (`onStatusClick(null)`)

**Stile scheda attiva**: bordo colorato + sfondo leggermente colorato della tinta corrispondente.

---

### 9.4 RejectDialog

**File**: `src/components/dashboard/RejectDialog.tsx`

#### Props

```typescript
interface RejectDialogProps {
  open: boolean
  preparationIds: string[]
  onConfirm: (reason: RejectionReason) => void
  onCancel: () => void
}
```

#### Layout

```
<Dialog open={open}>
  <DialogHeader>
    <DialogTitle>
      {preparationIds.length === 1
        ? "Rifiuta Preparazione"
        : `Rifiuta ${n} Preparazioni`}
    </DialogTitle>
    <DialogDescription>
      Seleziona il motivo del rifiuto per {id}.
    </DialogDescription>
  </DialogHeader>

  <Select onValueChange={setSelectedReason}>
    <SelectItem value="Sovradosaggio">Sovradosaggio</SelectItem>
    <SelectItem value="Sottodosaggio">Sottodosaggio</SelectItem>
    <SelectItem value="Farmaco errato">Farmaco errato</SelectItem>
    <SelectItem value="Paziente errato">Paziente errato</SelectItem>
    <SelectItem value="Contaminazione">Contaminazione</SelectItem>
    <SelectItem value="Etichetta errata">Etichetta errata</SelectItem>
    <SelectItem value="Contenitore errato">Contenitore errato</SelectItem>
    <SelectItem value="Diluente errato">Diluente errato</SelectItem>
    <SelectItem value="Scadenza superata">Scadenza superata</SelectItem>
    <SelectItem value="Altro">Altro</SelectItem>
  </Select>

  <DialogFooter>
    <Button variant="outline" onClick={onCancel}>Annulla</Button>
    <Button
      variant="destructive"
      disabled={!selectedReason}
      onClick={() => onConfirm(selectedReason)}
    >
      Conferma Rifiuto
    </Button>
  </DialogFooter>
</Dialog>
```

Il pulsante "Conferma Rifiuto" è **disabled** finché non viene selezionato un motivo.

---

### 9.5 FiltersBar (non usato)

**File**: `src/components/dashboard/FiltersBar.tsx`

Componente con filtri avanzati (Status, Priority, Executor, Drug search, Sort by). Esiste nel codice ma **non è integrato** nell'Index page attuale.

---

## 10. Sistema di Stile e Tema

### 10.1 File CSS Globale

**File**: `src/index.css`

#### Font

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

#### Variabili CSS (Light Mode)

```css
:root {
  /* Colori base */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.625rem;

  /* Colori Status */
  --status-waiting: 215 80% 52%;        /* blu */
  --status-progress: 36 90% 52%;        /* arancio */
  --status-complete: 152 60% 44%;       /* verde */
  --status-error: 0 72% 56%;            /* rosso */

  /* Colori Priority */
  --priority-high: 0 72% 56%;           /* rosso */
  --priority-medium: 36 90% 52%;        /* arancio */
  --priority-low: 152 60% 44%;          /* verde */

  /* Navbar */
  --navbar-bg: 0 0% 100%;
  --navbar-border: 214.3 31.8% 91.4%;

  /* Sidebar */
  --sidebar-background: ...;
  --sidebar-foreground: ...;
  /* (colori completi per sidebar) */
}
```

#### Dark Mode

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... tutte le variabili invertite per dark mode */
}
```

### 10.2 Tailwind Config

**File**: `tailwind.config.ts`

```typescript
export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // Tutti i colori mappati dalle variabili CSS
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        navbar: { bg: "hsl(var(--navbar-bg))", border: "hsl(var(--navbar-border))" },
        status: {
          waiting: "hsl(var(--status-waiting))",
          progress: "hsl(var(--status-progress))",
          complete: "hsl(var(--status-complete))",
          error: "hsl(var(--status-error))",
        },
        priority: {
          high: "hsl(var(--priority-high))",
          medium: "hsl(var(--priority-medium))",
          low: "hsl(var(--priority-low))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

### 10.3 App.css

```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}
/* Animazione logo (non usata) */
.logo { ... }
.logo.react:hover { filter: drop-shadow(0 0 2em #61dafbaa); }
```

### 10.4 Utility `cn()`

**File**: `src/lib/utils.ts`

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Usata in tutti i componenti per combinare classi Tailwind con override corretto.

---

## 11. Dati Statici e Logica di Generazione

### 11.1 PreparationsContext — Generazione Preparazioni

**File**: `src/context/PreparationsContext.tsx`

Dopo ogni azione di validazione o rifiuto, viene generata una nuova preparazione con dati realistici casuali.

**Algoritmo di generazione**:

```typescript
function generatePreparation(counter: number): Preparation {
  // Seleziona tipo di preparazione (50/50)
  const prepType: PrepType = Math.random() > 0.5 ? "infusione_iv" : "siringa_ricostituita"

  // Seleziona status con distribuzione pesata:
  // completata: 40%, esecuzione: 20%, errore: 15%, attesa: 25%
  const statusWeights = [
    { status: "completata", weight: 0.40 },
    { status: "esecuzione", weight: 0.20 },
    { status: "errore",     weight: 0.15 },
    { status: "attesa",     weight: 0.25 },
  ]

  // Seleziona farmaco casuale dall'array di 14
  const drug = drugs[Math.floor(Math.random() * drugs.length)]

  // Target volume: 50-500ml (infusione) o 5-50ml (siringa)
  const target = prepType === "infusione_iv"
    ? Math.round(Math.random() * 450 + 50)
    : Math.round(Math.random() * 45 + 5)

  // Dispensed: target ± errorRate%
  const errorRate = status === "errore"
    ? Math.random() * 8 + 2   // 2-10% se errore
    : Math.random() * 1.5     // 0-1.5% altrimenti

  // Genera dosi supplementari se status è "errore"
  // Genera labelData con dati paziente casuali
  // Assegna executor e station se status !== "attesa"
  // Genera foto con helper ivPhotos() o syringePhotos()

  return {
    id: `RX-${2838 - counter}`,  // ID decrescente
    // ... tutti i campi
  }
}
```

**Counter**: rimosso (l'auto-generazione è stata eliminata per garantire la correttezza dei contatori).

### 11.2 Dati di Lookup Usati nella Generazione

```typescript
const drugs = [
  "Ceftriaxone 2g", "Vancomicina 1g", "Meropenem 2g",
  "Amoxicillina/Acido Clavulanico 2.2g", "Piperacillina/Tazobactam 4.5g",
  "Fluconazolo 200mg", "Pantoprazolo 40mg", "Furosemide 40mg",
  "Insulina Regular 50UI", "Morfina Solfato 10mg",
  "Metronidazolo 500mg", "Ciprofloxacina 400mg",
  "Levofloxacina 500mg", "Tacrolimus 5mg",
]

const patients = [
  { name: "Mario Rossi", id: "PAZ-20240315-001" },
  { name: "Laura Bianchi", id: "PAZ-20240316-002" },
  { name: "Giuseppe Verdi", id: "PAZ-20240317-003" },
  { name: "Anna Neri", id: "PAZ-20240318-004" },
  { name: "Francesco Esposito", id: "PAZ-20240319-005" },
  { name: "Maria Conti", id: "PAZ-20240320-006" },
  { name: "Antonio Lombardi", id: "PAZ-20240321-007" },
  { name: "Giulia Ricci", id: "PAZ-20240322-008" },
]

const executors = [
  { name: "L. Bianchi", initials: "LB" },
  { name: "M. Ferrari", initials: "MF" },
  { name: "A. Russo", initials: "AR" },
  { name: "C. Romano", initials: "CR" },
  { name: "F. Costa", initials: "FC" },
]

const stations = ["Cappa 1", "Cappa 2", "Cappa 3", "Cappa 4"]

const routes = ["Endovenosa", "Endovenosa lenta", "Sottocutanea", "Intramuscolare"]
```

---

## 12. Configurazione Build e Tools

### 12.1 Vite Config

**File**: `vite.config.ts`

```typescript
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import path from "path"
import { componentTagger } from "lovable-tagger"

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}))
```

**Dev Server**: porta 8080, host `::` (tutti gli indirizzi IPv4/IPv6)

### 12.2 TypeScript Config

**File**: `tsconfig.app.json` (principale)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": false,
    "noImplicitAny": false,
    "strictNullChecks": false,
    "skipLibCheck": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

**Nota**: strict mode disabilitato. Gli alias `@/` mappano a `./src/`.

### 12.3 shadcn/ui Config

**File**: `components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### 12.4 Vitest Config

**File**: `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
})
```

### 12.5 ESLint Config

**File**: `eslint.config.js`

Plugin: `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

---

## 13. Requisiti Non Funzionali

### 13.1 Performance

- Build tramite Vite con SWC (compilatore Rust)
- HMR (Hot Module Replacement) in development
- Bundle splitting automatico da Vite
- Immagini locali (no CDN esterne)

### 13.2 Responsività

| Breakpoint | Comportamento |
|---|---|
| Mobile (< 768px) | Navbar links nascosti; layout colonnare |
| Tablet (768-1024px) | Layout ibrido |
| Desktop (> 1024px) | Layout completo; navbar completa |
| Max-width | 1280px (definito in `#root`) |

Hook: `use-mobile.tsx` rileva breakpoint 768px con `window.matchMedia`.

### 13.3 Accessibilità

- Tutti i componenti UI basati su Radix UI (standard accessibilità WAI-ARIA)
- Label associate agli input
- Focus management nei dialog
- Tasti da tastiera per dropdown, dialog, popover

### 13.4 Browser Support

- Moderni browser evergreen (Chrome, Firefox, Safari, Edge)
- ES2020 target
- CSS custom properties (variabili CSS)

### 13.5 Sicurezza (Stato Attuale e Limitazioni)

**Attenzione**: L'applicazione attuale presenta le seguenti limitazioni di sicurezza da risolvere in produzione:

| Problema | Descrizione |
|---|---|
| Credenziali hardcoded | `pharma`/`ivone` nel codice sorgente |
| No HTTPS enforcement | Non gestito lato frontend |
| sessionStorage non cifrato | Credenziali in chiaro |
| No CSRF protection | Nessun token di validazione |
| No rate limiting | Login senza tentativi limitati |

**Per produzione**: Integrare autenticazione backend con JWT, HTTP-only cookies, e API REST/GraphQL.

### 13.6 Internazionalizzazione

- UI completamente in **italiano**
- Date formattate con locale `it` di date-fns
- Formato date: `DD/MM/YYYY` o `YYYY-MM-DD` per i query param
- Formato orari: `HH:MM` (24h)

### 13.7 Testing

- Framework: Vitest con Testing Library
- Ambiente: jsdom
- Coverage: nessuna coverage configurata
- Test esistenti: file di esempio in `src/test/example.test.ts`

---

## Appendice A — Flusso Completo dell'Applicazione

```
[Browser] → /login
     ↓ (credenziali valide)
[sessionStorage.auth=1]
     ↓
[/] Dashboard  (?tab=da-valutare  ←→  ?tab=archivio)
     │
     ├─ TAB "Da Valutare"  (?tab=da-valutare)
     │   - StatCards (5 schede filtro: Totale / Attesa / Esecuzione / Completate / Errori)
     │   - PreparationsTable mode="active"
     │   - Filtra per data, status (via StatCards), ricerca testuale
     │   │
     │   ├─ [Azione Valida riga] → validatePreparation(id) → genera nuova prep
     │   ├─ [Azione Rifiuta riga] → RejectDialog → rejectPreparation(id, reason)
     │   ├─ [Valida selezionati bulk] → validatePreparation(id) × N
     │   └─ [Clicca ArrowRight] → /preparation/:id
     │
     ├─ TAB "Archivio"  (?tab=archivio)
     │   - Schede riepilogo: Validate (verde) / Rifiutate (rosso) — cliccabili per filtrare
     │   - PreparationsTable mode="archived"
     │   - Colonna "Motivo" visibile per le preparazioni rifiutate
     │   └─ [Clicca ArrowRight] → /preparation/:id
     │
     ├─ [/preparation/:id] → Dettaglio Preparazione
     │   - Visualizza tutti i dati
     │   - Foto componenti
     │   - Dosi supplementari
     │   - Tempi e quantità
     │   - Dati etichetta
     │   - Valida / Rifiuta / Stampa
     │
     └─ [NavLink Analytics] → /analytics
            - KPI cards
            - Grafici distribuzione
            - Performance stazioni
            - Tabella riepilogo
```

---

## Appendice B — Componenti shadcn/ui Utilizzati

I seguenti componenti di `src/components/ui/` sono attivamente usati nell'app:

| Componente | Usato in |
|---|---|
| `badge` | Status e priority in tabella e detail |
| `button` | Ovunque |
| `card` | StatCards, Login, Analytics KPIs |
| `calendar` | DatePicker in Index e Analytics |
| `dialog` | RejectDialog |
| `popover` | DatePicker trigger |
| `select` | RejectDialog motivo |
| `table` | PreparationsTable, Analytics summary |
| `progress` | Barra quantità in tabella e detail |
| `avatar` | Esecutore in Navbar e detail |
| `input` | Search, Login form, Navbar |
| `checkbox` | Selezione righe tabella (solo tab "Da Valutare") |
| `tabs` | Switcher tab principale in Index (Da Valutare / Archivio) |
| `separator` | Divisori visivi |
| `tooltip` | Icone azioni |
| `toaster` / `sonner` | Notifiche globali |
| `scroll-area` | Contenitori scrollabili |
| `skeleton` | Loading states |

---

*Documento generato dall'analisi del codice sorgente di PharmAR System.*
*Versione applicazione analizzata: prima release (nessun versioning esplicito nel codice).*
