# AutoMates — group car buying (prototype)

Car buyers join a **brand group in their city** (e.g. *Tata · Chennai*). Everyone sees the
group fill up live. At **5 buyers** we start negotiating with dealers; at **10** we push for
the best (fleet-level) deal.

- **App:** React Native (Expo SDK 58), Android APK built automatically by GitHub Actions
- **Backend:** Supabase (Auth, Postgres, Row Level Security, Realtime)
- **Cities:** Chennai, Bengaluru · **Catalogue:** 25 brands, ~170 models (editable in Supabase)

---

## One-time setup (about 10 minutes)

### 1. Create the database
Supabase dashboard → **SQL Editor** → **New query** → paste all of
`supabase/migrations/20261116000000_automates_init.sql` → **Run**.
It is safe to run again.

### 2. Allow instant sign-up (prototype)
Supabase → **Authentication → Sign In / Providers → Email** → turn **off** “Confirm email” → Save.
(Supabase’s built-in email sender only allows a few emails per hour, so confirmation emails would block testers.)

### 3. Add your Supabase keys to GitHub
Supabase → **Project Settings → API**: copy the **Project URL** and the **anon / publishable** key
(never the `service_role` / secret key).

GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | the anon / publishable key |

### 4. Build the APK
Every push to `main` builds automatically. To build manually: **Actions → Build Android APK → Run workflow**.
Takes ~10–15 min. When it finishes, open **Releases** (right side of the repo page) on your phone,
download `AutoMates-N.apk`, and install it (allow “install unknown apps” when Android asks).

---

## Running the founder side (no admin app yet)

- **See who joined:** SQL Editor → `select * from admin.leads;`
  (name, phone, email, brand, city, preferred model, timeline). Not visible to app users.
- **Change group sizes:** Table Editor → `app_settings` → edit `min_group_size` / `best_group_size`.
  Apps pick it up on next open.
- **Move a group forward:** Table Editor → `group_counts` → set `status` to
  `negotiating`, `deal_live` (put the offer text in `deal_note`) or `closed`. All phones update live.
- **Edit catalogue:** `brands` / `models` tables (set `active = false` to hide).
- **Add a city:** insert into `cities`, then run:
  `insert into group_counts (brand_id, city_id) select id, 'hyderabad' from brands on conflict do nothing;`

## Test the “group fills up” flow
Install on 3–5 phones (or create several accounts on one phone, signing out in between).
Join the same brand in the same city — every phone’s counter moves instantly; at 5 the group turns **Ready**.

## Local development (optional)
```bash
cp .env.example .env   # fill in your keys
npm install
npx expo start         # needs a development build or the Expo Go app
```

## Project layout
```
App.js                      app shell, login gate, tabs, back button
src/lib/supabase.js         Supabase client
src/lib/DataContext.js      data loading, live counters, join/leave
src/lib/groupStatus.js      turns counts into "Forming / Ready / Best deal" text
src/screens/                Auth, ProfileSetup, Home (brands), Brand, MyGroups, Profile
supabase/migrations/        database schema, security rules, catalogue seed
.github/workflows/          APK build
```
