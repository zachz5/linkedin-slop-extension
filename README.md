# LinkedIn Slop Filter

A Chrome extension that detects and hides low-quality, formulaic "AI slop" posts from your LinkedIn feed — entirely locally, with no data leaving your browser.

## Install (unpacked)

1. Clone this repo
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select this folder

## The Problem

AI-generated, engagement-bait posts (predictable hooks, emoji bullet lists, hashtag spam, "what do you think? 👇" closers) have taken over LinkedIn feeds. This extension scores each post against a set of known slop patterns and hides the ones that match, so your feed only shows what's actually worth reading.

## How It Works

- Runs as a **Manifest V3 content script** injected directly into `linkedin.com/feed/*`
- Reads the live DOM as you scroll — no fetching or scraping needed
- A `MutationObserver` catches posts loaded via infinite scroll, including LinkedIn's placeholder-swap rendering pattern
- Each post's text is run through a **point-based scoring system**; posts scoring at or above a threshold are hidden
- **Promoted/sponsored posts** are detected and hidden separately from the scoring system
- Settings (threshold, which rules are active, review mode) are stored via `chrome.storage.local` and adjustable from a popup — no code editing required

## Detection Rules

Each rule is independently toggleable and worth 1 point toward the total slop score:

| Rule | Detects |
|---|---|
| Emoji bullets | 3+ of a common "bullet" emoji set (🔹✅👉📌💡🚀🚫🔍📢🤝) |
| Engagement bait closer | "what do you think," "share your experience," "comment below," etc. |
| Excessive em-dashes | 3+ "—" characters in one post |
| Corporate buzzwords | "game-changer," "unlock," "leverage," "in today's fast-paced world," etc. |
| Hashtag spam | 5+ hashtags in one post |
| Command hooks | "Stop scrolling," "Save this," "Bookmark this," etc. |
| Question bookend | Post both opens and closes with a question |
| Promoted (always-hide toggle) | LinkedIn's own "Promoted" label, matched outside the post's body text |

**Deliberately excluded:** phrases like "I'm thrilled/excited to announce," since real users use this constantly for genuine job/promotion announcements — it's not a reliable slop signal.

Default hide threshold: **score ≥ 2**.

## Popup Controls (v2)

Click the extension icon to access:
- **Threshold slider** (1–7) — adjust how aggressive the filter is
- **Rule toggles** — turn individual detection rules on/off
- **Review mode** — instead of hiding flagged posts, outlines them in red with a label explaining why they'd be hidden, and force-expands truncated text so you can read the full post. Useful for calibrating rules against real posts without losing your feed.
- **Hidden count** — how many posts have been hidden on the current page load

## Project History / Build Notes

### v1 — Core detection + hiding
1. Built the extension skeleton (`manifest.json` + `content.js`), loaded unpacked via `chrome://extensions`
2. Found a stable post selector: `div[role="listitem"]` — LinkedIn's class names are hashed/dynamic and unreliable, but this ARIA role attribute stays consistent
3. Found post text via `[data-testid="expandable-text-box"]`
4. Added a `MutationObserver` for infinite scroll, checking both descendants and ancestors (`.closest()`) since LinkedIn sometimes swaps content *inside* an existing post container rather than replacing the whole node
5. Fixed duplicate-processing bugs caused by LinkedIn's placeholder → real-content swap pattern, by marking individual DOM elements as processed rather than deduping by text content
6. Proved safe DOM mutation by appending a 🙂 to post text before building real logic
7. Built the scoring system, iterating against real feed examples (screenshots of actual posts) to catch false negatives and avoid false positives
8. Added promoted-post detection, explicitly excluding the post's own body text from the "Promoted" label search
9. Implemented hide logic: `display: none` for promoted posts and posts scoring ≥ threshold — confirmed working end-to-end

### v2 — Popup UI, adjustable settings, review mode
1. Added `popup.html` / `popup.js` and a `storage` permission in `manifest.json`
2. Settings (threshold, rule toggles, review mode) persisted via `chrome.storage.local`, read on load and live-updated via `chrome.storage.onChanged` — no page refresh needed when changing settings
3. Refactored `content.js` to keep a registry of processed posts so decisions can be re-applied live when settings change
4. Built review mode: flagged posts get a red outline + overlay label instead of being hidden
5. Fixed a scroll-jumping bug caused by **scroll anchoring** — Chrome repositions scroll to keep a nearby element visually stable when content above the viewport changes size/visibility. Fixed by adding `overflow-anchor: none` to hidden and flagged post styles
6. Fixed truncated text in review mode: initially tried programmatically clicking LinkedIn's "...more" button, but this triggered LinkedIn's own internal `scrollIntoView`/focus behavior, causing scroll jumps to every flagged post. Fixed by overriding the truncation via CSS (`-webkit-line-clamp: unset`) instead of clicking anything — same visual result, no side effects

## Known Limitations / Future Ideas

- Rules are pattern/regex-based and will need ongoing tuning as slop phrasing evolves
- No stats tracking over time yet (just current-page hidden count)
- Potential v3: hybrid approach using an AI classifier (e.g. Claude API) for borderline-score posts, now that there's a real rule-based baseline to compare against
