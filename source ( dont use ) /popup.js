const toggleSwitch = document.getElementById('toggle');
const statusText = document.getElementById('status');

// Load current state
chrome.storage.local.get(['enabled'], (result) => {
  const isEnabled = result.enabled || false;
  updateUI(isEnabled);
});

// Toggle on click
toggleSwitch.addEventListener('click', () => {
  chrome.storage.local.get(['enabled'], (result) => {
    const newState = !(result.enabled || false);
    chrome.storage.local.set({ enabled: newState });
    
    // Send message to background script
    chrome.runtime.sendMessage({ 
      action: 'toggle', 
      enabled: newState 
    });
    
    updateUI(newState);
  });
});

function updateUI(isEnabled) {
  if (isEnabled) {
    toggleSwitch.classList.add('active');
    statusText.textContent = 'Enabled ⚡';
    statusText.classList.add('active');
  } else {
    toggleSwitch.classList.remove('active');
    statusText.textContent = 'Disabled';
    statusText.classList.remove('active');
  }
}
