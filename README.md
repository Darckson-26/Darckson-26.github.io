# Menu-Bubble-Pearls

A 3-step image selection flow.

## Current behavior

- Step 1 and Step 2 only navigate forward.
- On Step 3, there are no images. The 3 options are shown in one vertical column with counters.
  1. Use + / - to set natural-number counts (never below 0),
  2. press **Add**,
  and the count data is stored in a pending list (not sent yet).
- Each pending item gets a unique `clientRequestId` so each selection can be identified and deduplicated in Apps Script.
- The right panel shows the added count summary to send (it does not display cycle or IDs).
- Each pending option has a **Delete** button; this button turns red on hover.
- **Repeat the cycle** sends all pending selections to Apps Script (with `batchId` + item ids), but for counter data it includes only options whose count is `>= 1`; then it sends `repeat_cycle`, increments cycle id, clears pending items, resets the right panel, and returns to `index.html`.
- **Go to index** returns to `index.html` without sending pending items.
- **Back** returns to the previous page in the flow (`page3 -> page2`, `page2 -> index`, `index -> index`).
- **Reset cycles** button (bottom-left, on `index.html` only) sets the cycle counter back to `0` without sending data.

## Google Sheets logging

This app sends `text/plain` with JSON body to avoid Apps Script CORS preflight issues.
Payload includes:
- `source: "menu-bubble-pearls"`
- `submittedAt`
- `event`, `cycle`, and selection fields.
- `clientRequestId` per selection, plus `requestId` and `timestamp` for each sent record/group.

## Apps Script merge file

Use `apps-script-merge-example.js` in your Apps Script project to:
- route only `source === 'menu-bubble-pearls'` to the menu sheet,
- store selection and repeat metadata (`batchId`, `requestId`, `clientRequestId`, counts),
- optionally use `MENU_BUBBLE_SHEET_NAME` or second-tab fallback.