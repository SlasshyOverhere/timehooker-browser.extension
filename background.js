// Initialize extension state and badge
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ enabled: false });
  updateBadge(false);
});

// Handle icon click - toggle state
chrome.action.onClicked.addListener(async (tab) => {
  const result = await chrome.storage.local.get(['enabled']);
  const newState = !(result.enabled || false);
  
  await chrome.storage.local.set({ enabled: newState });
  updateBadge(newState);
  
  // Apply to all existing tabs
  const tabs = await chrome.tabs.query({});
  tabs.forEach((t) => {
    if (t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://')) {
      if (newState) {
        injectAccelerator(t.id);
      } else {
        chrome.tabs.reload(t.id);
      }
    }
  });
});

// Apply to newly opened/reloaded tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
    chrome.storage.local.get(['enabled'], (result) => {
      if (result.enabled) {
        setTimeout(() => {
          injectAccelerator(tabId);
        }, 10);
      }
    });
  }
});

// Update badge to show state
function updateBadge(isEnabled) {
  if (isEnabled) {
    chrome.action.setBadgeText({ text: '●' });
    chrome.action.setBadgeBackgroundColor({ color: '#00ff00' });
    chrome.action.setTitle({ title: 'Time Accelerator (Active ⚡)' });
  } else {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'Time Accelerator (Click to activate)' });
  }
}

// Restore badge state on startup
chrome.storage.local.get(['enabled'], (result) => {
  updateBadge(result.enabled || false);
});

function injectAccelerator(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId, allFrames: true },
    world: 'MAIN',
    injectImmediately: true,
    func: function() {
      if (window.__timeAcceleratorApplied) return;
      const SPEED = 1000;

      // Override setTimeout
      const oSetTimeout = window.setTimeout;
      window.setTimeout = function(fn, delay, ...args) {
        return oSetTimeout.call(this, fn, Math.max(delay / SPEED, 0), ...args);
      };

      // Override setInterval
      const oSetInterval = window.setInterval;
      window.setInterval = function(fn, delay, ...args) {
        return oSetInterval.call(this, fn, Math.max(delay / SPEED, 0), ...args);
      };

      // Override Date.now
      const oDateNow = Date.now;
      const dateStartTime = oDateNow();
      Date.now = function() {
        return dateStartTime + ((oDateNow() - dateStartTime) * SPEED);
      };

      // Override Date constructor completely
      const OriginalDate = Date;
      const DateProxy = new Proxy(OriginalDate, {
        construct(target, args) {
          if (args.length === 0) {
            const acceleratedTime = dateStartTime + ((oDateNow() - dateStartTime) * SPEED);
            return new target(acceleratedTime);
          }
          return new target(...args);
        },
        apply(target, thisArg, args) {
          if (args.length === 0) {
            const acceleratedTime = dateStartTime + ((oDateNow() - dateStartTime) * SPEED);
            return new target(acceleratedTime).toString();
          }
          return new target(...args).toString();
        }
      });
      DateProxy.now = Date.now;
      DateProxy.parse = OriginalDate.parse;
      DateProxy.UTC = OriginalDate.UTC;
      DateProxy.prototype = OriginalDate.prototype;
      window.Date = DateProxy;

      // Override performance.now
      const oPerformanceNow = performance.now.bind(performance);
      const perfStartTime = oPerformanceNow();
      performance.now = function() {
        return perfStartTime + ((oPerformanceNow() - perfStartTime) * SPEED);
      };

      // Override requestAnimationFrame
      const oRequestAnimationFrame = window.requestAnimationFrame;
      window.requestAnimationFrame = function(callback) {
        return oSetTimeout(function() {
          callback(performance.now());
        }, Math.max(16.67 / SPEED, 0));
      };

      // Override cancelAnimationFrame
      window.cancelAnimationFrame = function(id) {
        return clearTimeout(id);
      };

      window.__timeAcceleratorApplied = true;
      console.log('%c⚡ TIME ACCELERATION 1000x ACTIVE ⚡', 'color: #00ff00; font-size: 16px; font-weight: bold;');
    }
  });
}
