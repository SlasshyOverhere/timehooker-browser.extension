// Listen for toggle from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggle') {
    const isEnabled = message.enabled;
    
    // Apply to all existing tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
          if (isEnabled) {
            injectAccelerator(tab.id);
          } else {
            chrome.tabs.reload(tab.id);
          }
        }
      });
    });
  }
});

// Apply to newly opened/reloaded tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
    chrome.storage.local.get(['enabled'], (result) => {
      if (result.enabled) {
        // Small delay to ensure document_start timing
        setTimeout(() => {
          injectAccelerator(tabId);
        }, 10);
      }
    });
  }
});

function injectAccelerator(tabId) {
  // Inject directly into the page's main world BEFORE any page scripts run
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
