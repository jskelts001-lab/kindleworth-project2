# Kindleworth Dashboard

A team availability dashboard: a weekly poll grid, an editable "your
availability" panel, a busiest-team-members ranking (week/month/year), and
upcoming weeks — styled after the Kindleworth app mockup.

This is currently a **static front end** (no server, no database). It's
built so that plugging it into a real Twilio WhatsApp poll backend later
is a small, well-contained change rather than a rewrite.

## Running it

Just open [index.html](index.html) in a browser — it works standalone.

For the best experience, serve the folder with a local dev server instead
of double-clicking the file, since some browsers block `fetch()` of local
files (the app falls back to embedded sample data in that case, so it
still works either way):

```powershell
# any of these work
npx serve .
python -m http.server 5500
# or use the VS Code "Live Server" extension
```

## Project structure

```
index.html              markup
styles.css               dark theme, matches the mockup
script.js                rendering + interactions, loads data, no build step
data/poll-results.json   sample data, shaped like a future API response
```

## Data shape

[data/poll-results.json](data/poll-results.json) is deliberately shaped like
what a backend fed by Twilio WhatsApp responses would eventually return:

- `members` — the people being polled, including a `phone` field (the
  WhatsApp number a real response would come from)
- `weeks[].responses` — `{ memberId: [score, score, ...] }` per day, `1–5`.
  **Weekdays only (Mon–Fri, 5 values)** — the office is treated as closed on
  weekends, so `weekStart`/`weekEnd` run Monday–Friday and there's no
  Saturday/Sunday polling. The calendar view marks Sat/Sun as closed for any
  month, independent of this data, so no extra work is needed there when
  adding future weeks — just keep new `weeks[]`/`upcomingWeeks[]` entries
  Mon–Fri too.
- `busyness` — `{ week|month|year: { memberId: averageScore } }`, the
  precomputed averages behind the "Busiest Team Members" panel. Currently
  hand-set sample numbers; once real polls exist, this should be a rolling
  average computed from stored responses instead of a static block.
- `upcomingWeeks` — unrelated to Twilio, just UI content

`script.js`'s `loadData()` currently does `fetch("data/poll-results.json")`.
Swapping that URL for a real endpoint (e.g. `/api/poll-results`) that
returns the same shape is the only change the front end needs.

## Plan for the Twilio WhatsApp integration

Not built yet — this is the intended next step:

1. **Twilio setup**: a WhatsApp-enabled Twilio number (sandbox for testing,
   a real number for production), plus `TWILIO_ACCOUNT_SID` and
   `TWILIO_AUTH_TOKEN`.
2. **Poll delivery**: send each member a WhatsApp message per poll cycle
   (Twilio Messaging API or a Twilio Studio Flow), asking them to reply
   with their availability for the week — either free text ("Mon 2, Tue 3
   ...") or a step-by-step conversational flow.
3. **Webhook**: a small backend (e.g. Node/Express) exposing a
   `POST /webhook/twilio` route, registered as the number's incoming-message
   webhook. Twilio POSTs `From` (the member's phone) and `Body` (their
   reply) to it on every incoming message.
4. **Parsing + matching**: match `From` to a `members[].phone`, parse the
   reply into day/score pairs, and upsert into storage (a database
   eventually — the current JSON file's shape is the target structure).
5. **Serving results**: replace `data/poll-results.json` with an API route
   (`GET /api/poll-results`) that reads from that storage and returns the
   same JSON shape. Point `loadData()` in [script.js](script.js) at it.
6. **New Poll button**: currently a placeholder toast in
   [script.js](script.js) — wire it to trigger step 2 (send that week's
   WhatsApp poll to all members) once delivery exists.
7. **Reminders**: "Awaiting Responses" (Overview) and "Remind" per member are
   also placeholder toasts. A member counts as awaiting if they have no entry
   at all in `weeks[activeWeekIndex].responses` — see `getAwaitingMembers()`
   in [script.js](script.js). Wire "Remind" to send that one member a
   follow-up WhatsApp message via Twilio.

## Notes

- Score colors/labels: `1` Very Busy (red) → `5` Very Free (green),
  matching the legend above the poll table.
- The "Your Availability" panel edits `DATA` in memory only — nothing
  persists yet. Once the API from step 5 exists, its update handler should
  `PATCH`/`POST` back to it instead of just re-rendering locally.
