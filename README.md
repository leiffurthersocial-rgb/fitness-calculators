# Vital — All-in-One Health & Fitness Hub

A clean, dark-mode-first single-page app with 15 health, fitness, and
productivity calculators. Built with **Next.js (App Router) + React +
TypeScript + Tailwind CSS**. No backend — your shared profile and logs live in
**localStorage**, so you never re-enter your stats.

## Features

A persistent, collapsible **profile** (age, sex, bodyweight, height, resting
HR) auto-fills every calculator, and a single **metric/imperial toggle**
converts the whole app. Dark mode is the default with a light toggle.

| Group | Tools |
| --- | --- |
| **Strength** | Rep-max (1/3/5RM + table), Training max %, Plate loading, Wilks/DOTS |
| **Cardio** | VO₂ max (3 methods), Heart-rate zones (Karvonen), Pace & race predictor (Riegel) |
| **Body & Nutrition** | TDEE/BMR (Mifflin–St Jeor), Macros (+ pie chart), Body comp (Navy BF%, BMI, WHtR) |
| **Recovery** | Caffeine half-life tracker (decay curve), Sleep cycles, Water intake |
| **Productivity** | Pomodoro timer (with daily tally), Habit tracker (streaks + heatmap) |

Every calculator updates live as you type, labels its outputs, and has an
expandable **“how this is calculated”** note. All formulas live in one
well-commented file: [`lib/formulas.ts`](lib/formulas.ts).

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

```bash
npm run build && npm start   # production build
```

## Deploy to Vercel (zero config)

1. Push this repo to GitHub.
2. Go to <https://vercel.com/new> and import the repo.
3. Accept the defaults (Vercel auto-detects Next.js) and click **Deploy**.

Or from the CLI:

```bash
npm i -g vercel
vercel        # preview
vercel --prod # production
```

## Project structure

```
app/
  layout.tsx         # root layout, theme/profile providers, no-flash dark mode
  page.tsx           # sidebar + mobile nav + content shell
  globals.css        # Tailwind v4 setup, accent color, class-based dark mode
lib/
  formulas.ts        # every calculation, pure & commented — tweak here
  units.ts           # metric/imperial conversion + time/number formatting
  profile.tsx        # shared profile context (localStorage)
  theme.tsx          # dark/light theme context
  useLocalStorage.ts # SSR-safe persisted state hook
  tools.ts           # the calculator registry (groups + components)
components/
  ui.tsx             # shared cards, inputs, results, info notes
  ProfilePanel.tsx   # collapsible profile + unit toggle
  calculators/       # the 15 calculator components
```

> Estimates are for general guidance only and are not medical advice. All data
> stays in your browser.
