console.log("LinkedIn Slop Filter: content script loaded");

const SLOP_THRESHOLD = 2;

function startsWithQuestion(text) {
  const firstSentence = text.trim().split(/\n|(?<=[.?!])\s/)[0] || "";
  return firstSentence.trim().endsWith("?");
}

function endsWithQuestion(text) {
  const withoutHashtags = text.replace(/#\w+/g, "").trim();
  return withoutHashtags.endsWith("?");
}

function slopScore(text) {
  let score = 0;
  const reasons = [];

  const bulletEmojis = (text.match(/[🔹✅👉📌💡🚀🚫🔍📢🤝]/g) || []).length;
  if (bulletEmojis >= 3) { score++; reasons.push("emoji bullets"); }

  const closers = /(what do you think|do you agree|let me know (in the comments|below)|thoughts\?|share your (thoughts|experience)|have you (ever|experienced)|comment below|drop a comment)/i;
  if (closers.test(text)) { score++; reasons.push("engagement bait closer"); }

  const emDashes = (text.match(/—/g) || []).length;
  if (emDashes >= 3) { score++; reasons.push("excessive em-dashes"); }

  const buzzwords = /(game-?changer|unlock|leverage|in today'?s fast-paced world|at the end of the day)/i;
  if (buzzwords.test(text)) { score++; reasons.push("corporate buzzwords"); }

  const hashtagCount = (text.match(/#\w+/g) || []).length;
  if (hashtagCount >= 5) { score++; reasons.push("hashtag spam"); }

  const commandHooks = /(stop scrolling|save this|bookmark this|tag someone|read that again|screenshot this)/i;
  if (commandHooks.test(text)) { score++; reasons.push("command hook"); }

  if (startsWithQuestion(text) && endsWithQuestion(text)) {
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

function hidePost(post, reason) {
  post.style.display = "none";
  console.log(`HIDDEN [${reason}]`);
}

function processPost(post) {
  const textEl = post.querySelector('[data-testid="expandable-text-box"]');
  if (!textEl) return;
  if (textEl.dataset.slopScored) return;
  textEl.dataset.slopScored = "true";

  const text = textEl.textContent;
  const { score, reasons } = slopScore(text);
  const promoted = isPromoted(post);

  console.log(`Score: ${score} [${reasons.join(", ")}]${promoted ? " [PROMOTED]" : ""} —`, text.slice(0, 150));

  if (promoted) {
    hidePost(post, "promoted");
  } else if (score >= SLOP_THRESHOLD) {
    hidePost(post, reasons.join(", "));
  }
}

document.querySelectorAll('div[role="listitem"]').forEach(processPost);

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

observer.observe(document.body, { childList: true, subtree: true });