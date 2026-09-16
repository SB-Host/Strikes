# Strike Log — Google Form setup

Five minutes, one copy-paste. The script builds the form, all 30 names, the
reasons, and a spreadsheet that counts everyone's strikes on its own.

## Run it

1. Go to **[script.google.com](https://script.google.com)** and click
   **New project**.
2. Delete whatever is in the editor, paste in everything from **`Code.gs`**,
   and save.
3. Pick **`setUpStrikes`** from the function dropdown at the top, then hit
   **Run**.
4. Google will ask for permission the first time. It says "Google hasn't
   verified this app" because the script is yours and unpublished, not because
   anything is wrong. Click **Advanced → Go to Untitled project (unsafe)** and
   allow it.
5. Open **View → Execution log**. Three links are waiting there.

## The three links do different jobs

**The form link** goes to your leaders and nobody else. Anyone holding it can
log a strike, so treat it like the key it is.

**The sheet link** goes to everyone. Share it as **Viewer**, not Editor — under
Share, set "Anyone with the link" to Viewer, or add the guys individually.
Viewer means they can read and sort but can't change a number.

**The form editor link** stays with you. That's where you'd reword a question
or add an option by hand.

## What everybody sees

The sheet opens on a **Standings** tab: every name, how many strikes they're
carrying, when the last one landed, how many days ago that was, and what it was
for. Two strikes turns the cell orange, three or more turns it red. Click any
column header to sort — tap **Strikes** to see who's piling them up.

The **Recent** tab is the same data as a running log, newest at the top. That's
the tab that answers "wait, when did I get that one."

**Form Responses** is the raw feed. It's the source of truth; the other two tabs
read from it.

## Day to day

**Giving a strike** — open the form, pick a name, pick a reason, submit. The
sheet updates in a second or two. No one has to text you.

**Taking one back** — open the Form Responses tab and delete that row. Standings
recalculates itself. That's the whole undo.

**Adding or dropping people** — edit the `PEOPLE` list at the top of the script,
then run **`syncRoster`** instead of `setUpStrikes`. It updates the form's
dropdown and rebuilds Standings without touching a single existing strike.
Running `setUpStrikes` a second time would build a whole second form, so don't.

## Two things to know going in

**The Notes field is public.** Everyone with the sheet link can read it, because
they can read every column. Fine for "showed up 25 minutes late" — keep anything
you wouldn't say in the group chat out of it.

**The form doesn't know who submitted unless Google lets it.** The script turns
on verified email collection, which works on most accounts and quietly skips
itself where it doesn't. Check the Form Responses tab after the first submission:
if there's no Email column, open the form's Settings → Responses and switch
**Collect email addresses** to **Verified**. Without it, a strike has no
fingerprints on it.

## If you'd rather not touch a script

It's maybe ten minutes by hand, and Forms makes the long list painless:

1. New form at [forms.google.com](https://forms.google.com).
2. First question, type **Who**, set it to **Dropdown**. Click the first option
   and paste all 30 names in at once — Forms splits a pasted list into separate
   options automatically. Mark it Required.
3. Second question, type **Why**, set it to **Multiple choice** (not Dropdown —
   dropdowns can't have an Other box). Add the four reasons, then click
   **Add "Other"**. Mark it Required.
4. Third question, **Notes**, short answer, leave it optional.
5. Responses tab → the green Sheets icon → **Create a new spreadsheet**.

You'll have a working form and a response sheet. What you won't have is the
Standings tab, so nobody can see their own count at a glance — they'd be
counting rows. That tab is the reason the script exists.
