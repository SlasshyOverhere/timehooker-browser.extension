(function() {
  // Check if already injected
  if (window.__timeAcceleratorApplied) return;
  
  const SPEED = 1000;
  let enabled = false;

  // Override setTimeout
  const oSetTimeout = window.setTimeout;
  window.__setTimeout = function(fn, delay, ...args) {
    const actualDelay = enabled ? Math.max(delay / SPEED, 0) : delay;
    return oSetTimeout.call(this, fn, actualDelay, ...args);
  };
  window.setTimeout = window.__setTimeout;

  // Override setInterval
  const oSetInterval = window.setInterval;
  window.__setInterval = function(fn, delay, ...args) {
    const actualDelay = enabled ? Math.max(delay / SPEED, 0) : delay;
    return oSetInterval.call(this, fn, actualDelay, ...args);
  };
  window.setInterval = window.__setInterval;

  // Override Date.now
  const oDateNow = Date.now;
  const dateStartTime = oDateNow();
  let virtualTime = 0;
  
  Date.now = function() {
    if (!enabled) return oDateNow();
    virtualTime += SPEED;
    return dateStartTime + virtualTime;
  };

  // Override Date constructor
  const OriginalDate = Date;
  Date = class extends OriginalDate {
    constructor(...args) {
      if (args.length === 0 && enabled) {
        super(Date.now());
      } else {
        super(...args);
      }
    }
  };
  Date.now = OriginalDate.now;

  // Create toggle button
  const toggleBtn = document.createElement('div');
  toggleBtn.innerHTML = '⚡';
  toggleBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    background: #333;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 999999;
    font-size: 24px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    user-select: none;
  `;
  
  toggleBtn.onclick = () => {
    enabled = !enabled;
    toggleBtn.style.background = enabled ? '#00ff00' : '#333';
    toggleBtn.title = enabled ? 'Acceleration: ON' : 'Acceleration: OFF';
  };
  
  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(toggleBtn);
  });
  
  if (document.body) {
    document.body.appendChild(toggleBtn);
  }

  window.__timeAcceleratorApplied = true;
})();
