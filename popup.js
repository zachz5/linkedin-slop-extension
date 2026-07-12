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
  
  const thresholdInput = document.getElementById("threshold");
  const thresholdValue = document.getElementById("thresholdValue");
  const reviewModeInput = document.getElementById("reviewMode");
  const hiddenCountEl = document.getElementById("hiddenCount");
  
  const ruleIds = ["emojiBullets","engagementCloser","emDashes","buzzwords","hashtagSpam","commandHooks","questionBookend","promotedAlwaysHide"];
  
  chrome.storage.local.get(DEFAULT_SETTINGS, (stored) => {
    const rules = { ...DEFAULT_SETTINGS.rules, ...stored.rules };
    thresholdInput.value = stored.threshold;
    thresholdValue.textContent = stored.threshold;
    reviewModeInput.checked = stored.reviewMode;
    ruleIds.forEach(id => {
      document.getElementById(`rule_${id}`).checked = rules[id];
    });
  });
  
  chrome.storage.local.get({ hiddenCount: 0 }, (stored) => {
    hiddenCountEl.textContent = `Hidden on this page: ${stored.hiddenCount}`;
  });
  
  thresholdInput.addEventListener("input", () => {
    thresholdValue.textContent = thresholdInput.value;
    chrome.storage.local.set({ threshold: Number(thresholdInput.value) });
  });
  
  reviewModeInput.addEventListener("change", () => {
    chrome.storage.local.set({ reviewMode: reviewModeInput.checked });
  });
  
  ruleIds.forEach(id => {
    document.getElementById(`rule_${id}`).addEventListener("change", (e) => {
      chrome.storage.local.get(DEFAULT_SETTINGS, (stored) => {
        const rules = { ...DEFAULT_SETTINGS.rules, ...stored.rules, [id]: e.target.checked };
        chrome.storage.local.set({ rules });
      });
    });
  });