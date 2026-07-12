console.log("LinkedIn Slop Filter: content script loaded");

const DEFAULT_SETTINGS = {
  threshold: 2,
  reviewMode: false,
  rules: {
    emojiBullets: true,
    engagementCloser: true,
    emDashes: true,
    buzzwords: true,
    hashtagSpam: true,
    commandHooks: true,
    questionBookend: true,
    promotedAlwaysHide: true
  }
};

let settings = DEFAULT_SETTINGS;
const postRegistry = new Map(); // textEl -> { post, text, promoted, labelEl }

const style = document.createElement("style");
style.textContent = `
  .slop-hidden { display: none !important; overflow-anchor: none !important; }
  .slop-flagged-review { outline: 3px solid #e74c3c !important; outline-offset: -3px; padding-top: 28px !important; overflow-anchor: none !important; }
  .slop-flagged-review [data-testid="expandable-text-box"] {
    -webkit-line-clamp: unset !important;
    max-height: none !important;
    overflow: visible !important;
  }
  .slop-flagged-review [data-testid="expandable-text-button"] {
    display: none !important;
  }
  .slop-review-label {
    position: absolute; top: 0; left: 0; right: 0;
    background: #e74c3c; color: white; font-size: 12px; font-weight: 600;
    padding: 4px 10px; z-index: 10;
  }
`;
document.head.appendChild(style);

function startsWithQuestion(text) {
  const firstSentence = text.trim().split(/\n|(?<=[.?!])\s/)[0] || "";
  return firstSentence.trim().endsWith("?");
}

function endsWithQuestion(text) {
  const withoutHashtags = text.replace(/#\w+/g, "").trim();
  return withoutHashtags.endsWith("?");
}

function slopScore(text, rules) {
  let score = 0;
  const reasons = [];

  if (rules.emojiBullets) {
    const bulletEmojis = (text.match(/[🔹✅👉📌💡🚀🚫🔍📢🤝]/g) || []).length;
    if (bulletEmojis >= 3) { score++; reasons.push("emoji bullets"); }
  }
  if (rules.engagementCloser) {
    const closers = /(what do you think|do you agree|let me know (in the comments|below)|thoughts\?|share your (thoughts|experience)|have you (ever|experienced)|comment below|drop a comment)/i;
    if (closers.test(text)) { score++; reasons.push("engagement bait closer"); }
  }
  if (rules.emDashes) {
    const emDashes = (text.match(/—/g) || []).length;
    if (emDashes >= 3) { score++; reasons.push("excessive em-dashes"); }
  }
  if (rules.buzzwords) {
    const buzzwords = /(game-?changer|unlock|leverage|in today'?s fast-paced world|at the end of the day)/i;
    if (buzzwords.test(text)) { score++; reasons.push("corporate buzzwords"); }
  }
  if (rules.hashtagSpam) {
    const hashtagCount = (text.match(/#\w+/g) || []).length;
    if (hashtagCount >= 5) { score++; reasons.push("hashtag spam"); }
  }
  if (rules.commandHooks) {
    const commandHooks = /(stop scrolling|save this|bookmark this|tag someone|read that again|screenshot this)/i;
    if (commandHooks.test(text)) { score++; reasons.push("command hook"); }
  }
  if (rules.questionBookend && startsWithQuestion(text) && endsWithQuestion(text)) {
    score++; reasons.push("question bookend");
  }

  return { score, reasons };
}

function isPromoted(post) {
  const textEl = post.querySelector('[data-testid="expandable-text-box"]');
  const spans = post.querySelectorAll('span');
  for (const span of spans) {
    if (textEl && textEl.contains(span)) continue;
    const t = span.textContent.trim();
    if (/^Promoted\s*(•|$)/.test(t)) return true;
  }
  return false;
}

function applyDecision(entry) {
    const { post, text, promoted } = entry;
  
    post.classList.remove("slop-hidden", "slop-flagged-review");
    if (entry.labelEl) {
      entry.labelEl.remove();
      entry.labelEl = null;
    }
  
    const { score, reasons } = slopScore(text, settings.rules);
    const shouldFlag = promoted
      ? settings.rules.promotedAlwaysHide
      : score >= settings.threshold;
  
    if (!shouldFlag) return;
  
    const allReasons = promoted ? ["promoted", ...reasons] : reasons;
  
    if (settings.reviewMode) {
        post.classList.add("slop-flagged-review");
        post.style.position = "relative";
    
        const label = document.createElement("div");
        label.className = "slop-review-label";
        label.textContent = `🚫 Would hide: ${allReasons.join(", ")}`;
        post.prepend(label);
        entry.labelEl = label;
      } else {
        post.classList.add("slop-hidden");
      }
  }

function applyAll() {
  postRegistry.forEach(applyDecision);
  updateHiddenCount();
}

function updateHiddenCount() {
  const hiddenCount = document.querySelectorAll(".slop-hidden").length;
  chrome.storage.local.set({ hiddenCount });
}

function processPost(post) {
  const textEl = post.querySelector('[data-testid="expandable-text-box"]');
  if (!textEl) return;
  if (postRegistry.has(textEl)) return;

  const text = textEl.textContent;
  const promoted = isPromoted(post);
  const entry = { post, text, promoted, labelEl: null };
  postRegistry.set(textEl, entry);

  applyDecision(entry);
  updateHiddenCount();
}

function scanForPosts() {
  document.querySelectorAll('div[role="listitem"]').forEach(processPost);
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== 1) continue;
      const posts = new Set();
      if (node.matches?.('div[role="listitem"]')) posts.add(node);
      node.querySelectorAll?.('div[role="listitem"]').forEach(el => posts.add(el));
      const ancestor = node.closest?.('div[role="listitem"]');
      if (ancestor) posts.add(ancestor);
      posts.forEach(processPost);
    }
  }
});

chrome.storage.local.get(DEFAULT_SETTINGS, (stored) => {
  settings = {
    threshold: stored.threshold,
    reviewMode: stored.reviewMode,
    rules: { ...DEFAULT_SETTINGS.rules, ...stored.rules }
  };
  scanForPosts();
  observer.observe(document.body, { childList: true, subtree: true });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.threshold) settings.threshold = changes.threshold.newValue;
  if (changes.reviewMode) settings.reviewMode = changes.reviewMode.newValue;
  if (changes.rules) settings.rules = { ...settings.rules, ...changes.rules.newValue };
  applyAll();
});
