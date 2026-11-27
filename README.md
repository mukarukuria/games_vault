# Sunday School Game Vault

A private, personal web application for organising, searching, selecting and evaluating games used in Sunday School classes.

**Live:** _[add Vercel URL after deployment]_
**Status:** MVP complete · In deployment

---

## The problem

Sunday School teachers have game ideas scattered across Word documents, WhatsApp messages and spreadsheets. Planning a lesson means scrolling through all of it, guessing which games fit the group, and hoping the instructions are clear enough to run on the spot.

This app replaces that with one private vault that answers a simple question: *"What game can I play with 12 children in 10 minutes, with no equipment, in a classroom?"* — in a few taps.

## What it does

- **Library of 54 games** across 5 categories, each with full instructions, equipment, timings, group-size recommendations and confidence levels.
- **Filter and sort** by category, group size, time available, equipment, space, energy, difficulty and tags.
- **Add, edit and archive** games. New games start "untested" with only basic fields; once played, mark them as tested to unlock the full data.
- **Record play sessions** with group size, duration and notes.
- **Confidence tracking** — group-size numbers are marked `confirmed`, `estimated` or `unassessed` so recommendations are never presented as facts they aren't.
- **Favourites, variations and classroom adaptations** per game.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| Styling | Plain CSS with custom properties, mobile-first |
| Backend | Supabase (PostgreSQL + Auth + Row Level Security) |
| Hosting | Vercel |
| Version control | GitHub |

No custom backend server — Supabase provides an auto-generated PostgREST API, so the frontend talks to Postgres directly through RLS-guarded queries.

## Technical highlights

- **Database-level access control.** Every row has an `owner_id`, and Row Level Security policies enforce `owner_id = auth.uid()`. Even with the anon key in hand, an unauthenticated visitor sees zero rows. Frontend route protection and database RLS work as two independent layers — the frontend hides screens, the database refuses data.
- **Relational schema with 8 tables** — games, categories, tags, game_tags, variations, adaptations, play sessions, feedback — instead of one monolithic games table. Renaming a category updates every game automatically.
- **Confidence-aware data model.** Group-size recommendations carry an explicit confidence enum and are surfaced as coloured badges everywhere they appear. This was the design's signature feature: making provisional data *look* provisional.
- **Conditional form UX.** The add/edit form only reveals advanced fields (timings, group size, tags, variations) when a game's testing status is not "untested" — so the user is never asked to guess data they don't have, and the database stays clean.
- **Controlled-vocabulary tags** with a fallback "Other" flow: users pick from grouped chips, but can create new tags which are auto-categorised and immediately available for filtering.
- **Mobile-first responsive layout** — bottom tab bar and bottom-sheet filter panel on mobile, sidebar and inline panel on desktop. Same markup, two layouts, via CSS only.

## Data model

**Core:** `games` — name, category, description, instructions, timings, group size (min/ideal/max + confidence), ages/grades, difficulty, energy, testing status, favourite flag.

**Related:** `categories` (5 fixed), `tags` + `game_tags` (many-to-many), `game_variations`, `game_adaptations`, `play_sessions`, `feedback`.

**Security:** RLS enabled on every table, with owner-scoped policies for read, insert, update and delete.

## Setup

### 1. Clone and install

```bash
git clone https://github.com/mukarukuria/games_vault.git
cd games_vault
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```text
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set up the database

Run the database migrations in the Supabase SQL Editor, in this order:

1. Schema
2. Row Level Security policies
3. Tags
4. Game import

### 4. Create your user

There is no signup flow, so create your user in Supabase under **Authentication → Users**.

### 5. Run the app

```bash
npm run dev
```

Open `http://localhost:5173` and sign in.

## Project structure

```text
sunday-school-vault/
├── public/                    # Static assets (favicon etc.)
├── src/
│   ├── main.jsx               # React entry point
│   ├── App.jsx                # Routes and app shell
│   ├── index.css              # Global styles (design tokens, layout, components)
│   ├── lib/
│   │   ├── supabaseClient.js  # Supabase connection
│   │   ├── api.js             # All data queries (games, sessions, feedback)
│   │   └── format.js          # Shared string formatters
│   ├── context/
│   │   └── AuthContext.jsx    # Logged-in user state across the app
│   ├── components/
│   │   ├── AppShell.jsx       # Sidebar + bottom tab bar layout
│   │   ├── ProtectedRoute.jsx # Redirects unauthenticated users to login
│   │   ├── GameCard.jsx       # One game's summary card
│   │   ├── ConfidenceBadge.jsx# Confirmed / estimated / unassessed badge
│   │   └── TagPicker.jsx      # Grouped tag selection UI
│   └── pages/
│       ├── Login.jsx          # Single-user login
│       ├── Dashboard.jsx      # Stats, recently added, needs-review panel
│       ├── Library.jsx        # Full library with filters and sort
│       ├── GameDetail.jsx     # Individual game page + play session modal
│       └── GameForm.jsx       # Add/edit form (same component, two modes)
├── .env                       # Secrets (NOT committed)
├── .gitignore                 # Includes .env
└── package.json
```

## Roadmap

**MVP (complete)**
- Auth, library with filters and sort
- Game detail, add/edit/archive, favourites
- Play session recording
- Variations/adaptations
- Tag system and conditional form

**v1.1 (planned)**
- Full-text search
- Random game selector
- Session planning/shortlist
- Play history analytics
- Feedback UI with star ratings
- "Confirm group size" nudge after sessions
- Full UI refresh with warmer palette and category colour tints

**Future**
- Multi-user support
- Game sharing
- Export/print
- Offline PWA

## Notes

- **Single-user today.** The `owner_id` + RLS pattern means multi-user support requires no schema changes — just a signup flow and a policy edit.
- **Environment file.** `.env` is gitignored — create it manually per machine. The anon key is designed to be public; RLS is what protects data.
- **Data origin.** The initial 54-game collection was curated and standardised from existing Sunday School teaching materials.

## Licence

Private, personal use. Not yet licensed for redistribution.
