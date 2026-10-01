# Kino XII

Cinema booking app for Redberry Bootcamp XII: browse films, pick a session in one of four venues, choose seats, hold them for 8 minutes and pay.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router · TanStack Query · Zustand · react-hook-form + zod

## Running locally

```bash
npm install
cp .env.example .env   # VITE_API_URL=https://api.kinoxii.redberryinternship.ge/api
npm run dev
```

`npm run build` creates the production build, and `npm test` runs the logic tests.

Test account: `jane@kinoxii.test` / `password` (complete profile, tickets in both tabs). Test card: `4242 4242 4242 4242`, any future expiry, any 3-digit CVV.

## Deploy (Netlify)

Connect the repository. `netlify.toml` already sets the build command, `dist` as the publish folder and the SPA fallback, so deep links like `/sessions?date=…` survive a refresh. Add `VITE_API_URL` under Site settings → Environment variables.

## Project structure

```
src/
  api/          axios client, endpoints, query hooks, error parsing, types
  store/        auth, auth modal + pending actions, booking (hold persistence), toasts
  lib/          validation schemas, guards (auth / profile / age), formatting
  components/   UI kit (Modal, Field, Button, States, Pagination, DateStrip) and layout
  features/     auth, home, sessions, movie, booking, profile
```

## Notable behaviour

- **Protected actions continue after login.** Guarded actions (Select Seats, Notify Me, My Tickets, Profile) are queued as pending and run automatically after login or sign-up. A 401 from any request parks that request, opens the login modal, and replays it with the new token, so the user never clicks twice.
- **The sessions page lives in the URL** (`?venue=galleria,batumi&date=…&format=max&sort=price_asc&page=2`). Refresh, copy-paste and Back/Forward all restore the view. Any filter or sort change resets to page 1. Choosing venues narrows the formats and drops formats those venues don't offer.
- **Nothing is hardcoded.** Venues, formats, languages, time bands, sorts, ticket types and their price ratios, the seat cap and the hold length all come from `GET /filter-options`.
- **The hall map is drawn from the API.** It follows sections → rows → seats, takes row labels from the data, keeps gaps for `unavailable` spots, and uses `aisleAfter` for gangways.
- **Booking flow:**
  - Holds: re-holding replaces the previous hold, and the countdown runs from `expiresAt`, so it doesn't drift.
  - 409 handling: lost seats are named, marked sold and dropped, the rest of the selection is kept, and the map is refetched.
  - Expiry: when the hold runs out, the modal resets to step 1 with a message.
  - Close: closing without paying releases the hold.
  - Refresh mid-checkout: the hold is read back with `GET /holds/{id}`, so a refresh doesn't lose the seats.
- **Errors:**
  - 422 with `errors` is mapped onto fields; 422 with only a message is shown as-is.
  - 500s and network failures show a retry.
  - Every list has loading skeletons and an empty state.
  - Submit buttons are disabled while a request is in flight.
- **Server is the source of truth.** After every mutation (profile, order, refund) the UI renders the server's response or refetches.
