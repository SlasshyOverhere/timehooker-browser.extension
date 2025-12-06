const currentDomainEl = document.getElementById('currentDomain');
const domainStatusEl = document.getElementById('domainStatus');
const addCurrentBtn = document.getElementById('addCurrentBtn');
const removeCurrentBtn = document.getElementById('removeCurrentBtn');
const domainListEl = document.getElementById('domainList');
const manualDomainInput = document.getElementById('manualDomain');
const manualAddBtn = document.getElementById('manualAddBtn');

let currentDomain = null;

// Get current tab's domain
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && tabs[0].url) {
    try {
      const url = new URL(tabs[0].url);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        currentDomain = url.hostname;
        currentDomainEl.textContent = currentDomain;
        updateCurrentDomainStatus();
      } else {
        currentDomainEl.textContent = 'N/A (system page)';
        domainStatusEl.textContent = 'Cannot enable on this page';
        domainStatusEl.className = 'status inactive';
        addCurrentBtn.disabled = true;
      }
    } catch (e) {
      currentDomainEl.textContent = 'N/A';
      addCurrentBtn.disabled = true;
    }
  }
});

// Load and display domain list
function loadDomains() {
  chrome.storage.local.get(['whitelistedDomains'], (result) => {
    const domains = result.whitelistedDomains || [];
    renderDomainList(domains);
    updateCurrentDomainStatus();
  });
}

function renderDomainList(domains) {
  if (domains.length === 0) {
    domainListEl.innerHTML = '<div class="empty-msg">No domains added yet</div>';
    return;
  }
  
  domainListEl.innerHTML = domains.map(domain => `
    <div class="domain-item">
      <span>${domain}</span>
      <button class="delete-btn" data-domain="${domain}">✕</button>
    </div>
  `).join('');
  
  // Add delete handlers
  domainListEl.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => removeDomain(btn.dataset.domain));
  });
}

function updateCurrentDomainStatus() {
  if (!currentDomain) return;
  
  chrome.storage.local.get(['whitelistedDomains'], (result) => {
    const domains = result.whitelistedDomains || [];
    const isWhitelisted = domains.includes(currentDomain);
    
    if (isWhitelisted) {
      domainStatusEl.textContent = 'Active on this domain';
      domainStatusEl.className = 'status active';
      addCurrentBtn.style.display = 'none';
      removeCurrentBtn.style.display = 'block';
    } else {
      domainStatusEl.textContent = ' Not active on this domain';
      domainStatusEl.className = 'status inactive';
      addCurrentBtn.style.display = 'block';
      removeCurrentBtn.style.display = 'none';
    }
  });
}

function addDomain(domain) {
  domain = domain.toLowerCase().trim();
  if (!domain) return;
  
  chrome.storage.local.get(['whitelistedDomains'], (result) => {
    const domains = result.whitelistedDomains || [];
    if (!domains.includes(domain)) {
      domains.push(domain);
      chrome.storage.local.set({ whitelistedDomains: domains }, () => {
        loadDomains();
        // Notify background to inject on matching tabs
        chrome.runtime.sendMessage({ action: 'domainAdded', domain: domain });
      });
    }
  });
}

function removeDomain(domain) {
  chrome.storage.local.get(['whitelistedDomains'], (result) => {
    let domains = result.whitelistedDomains || [];
    domains = domains.filter(d => d !== domain);
    chrome.storage.local.set({ whitelistedDomains: domains }, () => {
      loadDomains();
      // Notify background to reload matching tabs
      chrome.runtime.sendMessage({ action: 'domainRemoved', domain: domain });
    });
  });
}

// Event listeners
addCurrentBtn.addEventListener('click', () => {
  if (currentDomain) addDomain(currentDomain);
});

removeCurrentBtn.addEventListener('click', () => {
  if (currentDomain) removeDomain(currentDomain);
});

manualAddBtn.addEventListener('click', () => {
  addDomain(manualDomainInput.value);
  manualDomainInput.value = '';
});

manualDomainInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addDomain(manualDomainInput.value);
    manualDomainInput.value = '';
  }
});

// Initial load
loadDomains();
