(function() {
  // Check if enabled on load
  chrome.storage.local.get(['enabled'], (result) => {
    if (result.enabled) {
      injectAccelerator();
    }
  });
  
  // Listen for toggle messages
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'toggle') {
      if (message.enabled) {
        injectAccelerator();
      } else {
        location.reload();
      }
    }
  });
  
  function injectAccelerator() {
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
    window.Date = new Proxy(OriginalDate, {
      construct(target, args) {
        if (args.length === 0) {
          const now = dateStartTime + ((oDateNow() - dateStartTime) * SPEED);
          return new target(now);
        }
        return new target(...args);
      },
      apply(target, thisArg, args) {
        const now = dateStartTime + ((oDateNow() - dateStartTime) * SPEED);
        return target.call(thisArg, now);
      }
    });
    window.Date.now = Date.now;
    window.Date.parse = OriginalDate.parse;
    window.Date.UTC = OriginalDate.UTC;
    window.Date.prototype = OriginalDate.prototype;
    
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
    console.log('[⚡] Time acceleration 1000x ACTIVE');
  }
})();
