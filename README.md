# Strikes

A shared strike board for a group that runs on accountability. One page everybody
can see, so nobody has to text the person who owns the spreadsheet.

> **Want the five-minute version instead?** [`google-form/`](google-form/) builds
> the same idea as a Google Form plus a Sheet — a dropdown for who, a dropdown for
> why, and a standings tab that counts everyone's strikes on its own. No hosting,
> no accounts, no deploy. Start there if this looks like more than you need.

The spreadsheet answered one question — how many does each person have. This
answers the ones that were living in your text messages instead: how long have
they had it, what do they have to do to get rid of it, who gave it to them and
when, and is anybody about to hit the line.

## What it does that a spreadsheet can't

**Every strike carries its own clock.** A strike knows when it was issued and
shows its age, live, on every screen — "held 11d." Give it a timer and it ages
out on its own at the deadline, no cleanup from you. The board is truthful the
moment somebody opens it, because expired strikes are swept on the way into any
read rather than by a nightly job you have to keep alive.

**Strikes can come with work attached.** A leader can hang a task on a strike —
run teardown solo once, cover somebody's shift. The person sees it under "Your
way out," taps *I did the work*, and it lands in a leader's queue for a sign-off.
That whole exchange used to be a text thread.

**Severity, not just count.** A strike is worth 1 to 3 points. Showing up late
and blowing up at a teammate stop being the same thing, and the board sorts by
what the group actually cares about.

**Disputes go in the app.** Somebody who thinks a strike is wrong writes their
side once, in the app, and it shows up on the leaders' board with a *fair point*
button and an *it stands* button. Either way the answer is recorded.

**Everything is logged.** Every strike, clear, take-back, timer change, dispute
and roster change lands in the Activity tab with a name and a timestamp. When
two people remember a decision differently, the log settles it.

**The board decides what to show.** Three modes, set by the owner:

| Mode | What people see |
| --- | --- |
| **Open board** *(default)* | Everyone sees everyone — names, counts, reasons, timers. |
| **Numbers only** | Everyone sees who's carrying what; reasons stay between that person and the leaders. |
| **Private** | Each person sees only their own. Leaders still see everything. |

Open is the default on purpose. Hiding the board solves half the problem — people
stop asking *how many do I have* — but leaders still have to ask each other
*did somebody already hit him for this*, and the owner is still the switchboard.
Visibility is the mechanism, not a side effect. If it turns sour in practice,
dial it back in Settings without losing any history.

## Roles

- **Member** — sees the board, their own strikes with live timers, the work
  assigned to them, and can dispute anything.
- **Leader** — everything above, plus give and clear strikes, adjust timers,
  take back a mistake, handle disputes, and manage the roster.
- **Owner** — the one account that can change settings, thresholds, quick
  reasons, and promote someone to leader. Created on first boot.

## Getting it running

```bash
npm install
cp .env.example .env.local     # edit AUTH_SECRET and the owner's details
npm run dev                    # http://localhost:3000
```

The database and the owner account are created the first time the app boots.
Sign in with the `OWNER_HANDLE` and `OWNER_PIN` from your `.env.local`.

Want to click around with a believable group first:

```bash
npm run seed                   # 8 people, a spread of strikes; every PIN is 123456
```

Clear it out before anyone real touches it — `rm strikes.db` and restart.

### Logging in

There is no email and no password reset flow, because a group like this doesn't
need one. Each person gets a username and a 6-digit PIN. A leader adds someone
from the Roster tab, the app hands back a one-time PIN to pass along, and that
person picks their own the first time they sign in. If somebody forgets it, any
leader resets it in two taps.

PINs are short, so they're stored salted and hashed with scrypt, and the login
cookie is a signed, httpOnly JWT that lasts 60 days.

## Deploying it

It runs on SQLite locally and on [Turso](https://turso.tech) (the same engine,
hosted) in production, so nothing about the code changes between the two.

1. Create a free database at Turso and grab the URL and auth token.
2. Deploy to Vercel, Fly, Railway — anywhere that runs Next.js.
3. Set these environment variables:

```
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=ey...
AUTH_SECRET=<openssl rand -base64 32>
OWNER_NAME=Your Name
OWNER_HANDLE=yourname
OWNER_PIN=<pick one, change it after first login>
```

`AUTH_SECRET` is required in production — the app refuses to start without it
rather than fall back to a known key. Free tiers on both sides cover a group
this size comfortably.

Tell everyone to open the URL on their phone and add it to their home screen.
It's built mobile-first; a leader can log a strike in three taps standing in a
parking lot.

## Settings worth tuning

- **Strikes age out after** — days until a strike drops on its own. `0` means
  strikes stay until a leader clears them.
- **The line** — the point total that triggers the consequence.
- **Watch list starts at** — where the board starts flagging people.
- **What happens at the line** — written on the board where everyone can read
  it. Spelling it out ahead of time saves the argument later.
- **Quick reasons** — the buttons leaders tap instead of typing. Each carries
  its own severity, timer, and clearing work.

## How it's built

Next.js App Router with server components and server actions, TypeScript,
Tailwind v4, and libSQL. No client-side data fetching and no API layer — pages
read straight from the database on the server, and every write goes through a
server action in `src/app/actions.ts` where the permission checks live.

```
src/lib/          db, schema, auth, domain logic (strikes.ts), settings
src/app/          pages — board, me, member/[id], feed, roster, admin
src/components/   strike card, quick-issue, roster tools, settings form
scripts/seed.ts   sample group
```
