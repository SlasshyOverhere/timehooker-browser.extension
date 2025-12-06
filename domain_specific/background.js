// Initialize extension state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ whitelistedDomains: [] });
});

// Helper function to check if a URL matches whitelisted domains
function isDomainWhitelisted(url, domains) {
  if (!url || !domains || domains.length === 0) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return domains.some(domain => {
      domain = domain.toLowerCase();
      return hostname === domain || hostname.endsWith('.' + domain);
    });
  } catch (e) {
    return false;
  }
}

// Update badge for a specific tab
function updateBadgeForTab(tabId, url) {
  chrome.storage.local.get(['whitelistedDomains'], (result) => {
    const domains = result.whitelistedDomains || [];
    const isActive = isDomainWhitelisted(url, domains);
    
    if (isActive) {
      chrome.action.setBadgeText({ text: '●', tabId: tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#00ff00', tabId: tabId });
      chrome.action.setTitle({ title: 'Time Accelerator (Active ⚡)', tabId: tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId: tabId });
      chrome.action.setTitle({ title: 'Time Accelerator (Click to manage)', tabId: tabId });
    }
  });
}

// Apply to newly opened/reloaded tabs if domain is whitelisted
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url && 
      !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
    
    chrome.storage.local.get(['whitelistedDomains'], (result) => {
      const domains = result.whitelistedDomains || [];
      
      if (isDomainWhitelisted(tab.url, domains)) {
        setTimeout(() => {
          injectAccelerator(tabId);
          updateBadgeForTab(tabId, tab.url);
        }, 10);
      } else {
        updateBadgeForTab(tabId, tab.url);
      }
    });
  }
});

// Update badge when tab becomes active
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      updateBadgeForTab(tab.tabId, tab.url);
    }
  });
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'domainAdded') {
    // Inject into all matching tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.url && isDomainWhitelisted(tab.url, [message.domain])) {
          injectAccelerator(tab.id);
          updateBadgeForTab(tab.id, tab.url);
        }
      });
    });
  }
  
  if (message.action === 'domainRemoved') {
    // Reload all matching tabs to remove acceleration
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.url && isDomainWhitelisted(tab.url, [message.domain])) {
          chrome.tabs.reload(tab.id);
        }
      });
    });
  }
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
      
      // Override Date constructor
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
  }).catch(() => {}); // Silently fail for restricted pages
}
