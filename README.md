# LinkedIn Slop Filter

A Chrome extension that filters AI slop and promotional posts out of your LinkedIn feed.

## How it works

Posts are scored based on common slop signals — emoji bullets, engagement bait closers, excessive em-dashes, corporate buzzwords, hashtag spam, command hooks, and question bookends. Posts scoring 2+ are hidden. Promoted posts are always hidden.

## Install (unpacked)

1. Clone this repo
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select this folder

## Files

- `manifest.json` — extension config
- `content.js` — feed scanner and filter logic
- `images/` — extension icons
