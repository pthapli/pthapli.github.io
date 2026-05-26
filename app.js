/**
 * Falcon Attribution Demo & Simulator Logic
 * Handles the state machines for simulated cookies, network traffic, and UI panels.
 */

// Global State
const state = {
  currentProtocol: 'third-party', // 'third-party' | 'first-party'
  privacySetting: 'allow-all',    // 'allow-all' | 'block-3rd'
  currentPage: 'publisher',       // 'publisher' | 'shop' | 'success'
  
  // Simulated Cookie Storage
  cookies: {
    'tracker.pthapli.com': {}, // third-party cookies (e.g. _fuid)
    'advertiser.com': {}       // first-party cookies (e.g. _fuid)
  },
  
  // Server-side click sessions (simulating Valkey cache)
  serverSessions: {},
  
  // Active tracking parameters
  activeClickId: null,
  activeUserId: null
};

// DOM Elements
let browserViewport, mockAddressInput, secureIcon, cookieJarList, networkLogs, attributionRing, attributionTitle, attributionDesc, liveTestBtn, realStatusBadge;

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  // Query Elements
  browserViewport = document.getElementById('browser-viewport');
  mockAddressInput = document.getElementById('mock-address-input');
  secureIcon = document.getElementById('secure-icon');
  cookieJarList = document.getElementById('cookie-jar-list');
  networkLogs = document.getElementById('network-logs');
  attributionRing = document.getElementById('attribution-ring');
  attributionTitle = document.getElementById('attribution-title');
  attributionDesc = document.getElementById('attribution-desc');
  liveTestBtn = document.getElementById('btn-live-test');
  realStatusBadge = document.getElementById('real-status-badge');

  // Set up event listeners
  document.getElementById('select-protocol').addEventListener('change', (e) => {
    state.currentProtocol = e.target.value;
    updateAttributionBoard();
    updateCookieJarDisplay();
    logSystem(`Switched tracking protocol to: ${e.target.value === 'third-party' ? 'Third-Party Cookie' : 'First-Party CNAME Delegation'}`);
  });

  document.getElementById('select-privacy').addEventListener('change', (e) => {
    state.privacySetting = e.target.value;
    updateAttributionBoard();
    updateCookieJarDisplay();
    logSystem(`Switched browser privacy policy to: ${e.target.value === 'allow-all' ? 'Standard (Allow 3rd-Party)' : 'Strict (Block 3rd-Party / ITP Active)'}`);
  });

  // Check if real tracker is integrated
  checkRealTrackerStatus();
  
  // Initialize rendering
  renderViewport();
  updateCookieJarDisplay();
});

// System/Console Log Helper
function logSystem(message) {
  const entry = document.createElement('div');
  entry.className = 'network-entry';
  entry.style.borderLeftColor = 'var(--text-muted)';
  entry.innerHTML = `
    <div class="network-entry-header">
      <span class="network-method-url" style="color: var(--text-secondary)">⚙️ SYSTEM</span>
      <span class="network-status" style="color: var(--text-secondary)">INFO</span>
    </div>
    <div style="color: var(--text-secondary); font-size: 0.7rem;">${message}</div>
  `;
  networkLogs.appendChild(entry);
  scrollLogsToBottom();
}

// Network Log Helper
function logNetwork(method, url, status, type, details) {
  const entry = document.createElement('div');
  entry.className = `network-entry ${type}`; // success, blocked, pending
  
  let statusText = status;
  if (type === 'blocked') statusText = 'BLOCKED / BLOCKED_BY_CLIENT';
  
  let cookieLine = '';
  if (details.cookiesSent) {
    cookieLine = `<div class="network-cookie-info attached">🍪 Sent Cookies: ${details.cookiesSent}</div>`;
  } else if (details.cookieBlockedReason) {
    cookieLine = `<div class="network-cookie-info missing">⚠️ Cookie blocked: ${details.cookieBlockedReason}</div>`;
  } else {
    cookieLine = `<div class="network-cookie-info" style="color: var(--text-muted)">🍪 No cookies sent</div>`;
  }

  let setCookieLine = '';
  if (details.setCookie) {
    setCookieLine = `<div class="network-cookie-info attached" style="color: #6366f1">📥 Set-Cookie: ${details.setCookie}</div>`;
  } else if (details.setCookieBlockedReason) {
    setCookieLine = `<div class="network-cookie-info missing">⚠️ Set-Cookie ignored: ${details.setCookieBlockedReason}</div>`;
  }
  
  entry.innerHTML = `
    <div class="network-entry-header">
      <span class="network-method-url"><span class="network-method">${method}</span> ${url}</span>
      <span class="network-status">${statusText}</span>
    </div>
    ${cookieLine}
    ${setCookieLine}
    <div style="color: var(--text-muted); font-size: 0.65rem; margin-top: 0.2rem;">Payload: ${JSON.stringify(details.payload || {})}</div>
  `;
  
  networkLogs.appendChild(entry);
  scrollLogsToBottom();
}

function scrollLogsToBottom() {
  networkLogs.scrollTop = networkLogs.scrollHeight;
}

// Render the Mock Browser Viewport
function renderViewport() {
  if (state.currentPage === 'publisher') {
    mockAddressInput.textContent = 'https://news-hub.com/technology/falcon-wearables-review';
    browserViewport.innerHTML = `
      <div class="sim-page publisher-page">
        <div class="publisher-header">
          <span class="publisher-logo">📰 NewsHub</span>
          <span class="publisher-date">TODAY'S EDITION</span>
        </div>
        <div class="publisher-article">
          <h2>Next-Gen Fitness Trackers Redefine Personal Health Metrics</h2>
          <div class="publisher-meta">By Alex Rivers • Tech Analytics Desk</div>
          <div class="publisher-body">
            <p>Smartwatches are evolving beyond mere notification screens. The latest wearables monitor blood-oxygen levels, track complex sleep patterns, and utilize predictive AI to warn users of heart rate anomalies before they happen. Leading the pack is the new Falcon smartwatch, boasting a sleek chassis and multi-week battery life...</p>
          </div>
        </div>
        
        <div class="banner-ad-container">
          <div class="banner-ad" onclick="simulateAdClick()">
            <div class="ad-visual">⌚</div>
            <div class="ad-content">
              <span class="ad-label">Sponsored ad</span>
              <div class="ad-title">Falcon Smartwatch Premium</div>
              <div class="ad-desc">The ultimate fitness companion. 30-day battery & advanced health AI. Shop Now.</div>
              <div class="ad-cta">Visit Store & Get 15% Off →</div>
            </div>
          </div>
        </div>
        
        <div class="publisher-body">
          <p>Early reviews suggest Falcon's integrated sensors provide hospital-grade precision. Priced starting at $299, it undercuts main competitors while offering a more robust developer API for custom health tracking widgets.</p>
        </div>
      </div>
    `;
  } else if (state.currentPage === 'shop') {
    const params = `?click_id=${state.activeClickId}&user_id=${state.activeUserId}`;
    mockAddressInput.textContent = `https://falcon-store.com/product/smartwatch${params}`;
    
    browserViewport.innerHTML = `
      <div class="sim-page shop-page">
        <div class="shop-header">
          <span class="shop-logo">🦅 FalconStore</span>
          <span class="shop-cart">🛒 Cart (1)</span>
        </div>
        <div class="shop-content">
          <div class="shop-img-container">⌚</div>
          <div class="shop-details">
            <h3>Falcon Smartwatch Premium</h3>
            <p>Advanced fitness wearable with health monitoring, Sleep AI, and 30-day battery.</p>
            <div class="shop-price-row">
              <span class="shop-price">$299.00</span>
              <button class="shop-btn-buy" onclick="simulateCheckout()">Complete Purchase 💳</button>
            </div>
          </div>
        </div>
        <div style="margin-top: 1.5rem; padding: 0.75rem; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); font-size: 0.75rem; color: var(--text-secondary)">
          💡 <strong>Advertiser Code Status:</strong> loads <code>https://${state.currentProtocol === 'third-party' ? 'tracker.pthapli.com' : 'track.advertiser.com'}/js/falcon.js</code> which detects click parameters and fires initialization requests.
        </div>
      </div>
    `;
  } else if (state.currentPage === 'success') {
    mockAddressInput.textContent = `https://falcon-store.com/checkout/success`;
    
    browserViewport.innerHTML = `
      <div class="sim-page">
        <div class="shop-success-overlay">
          <div class="success-icon-glow">🎉</div>
          <h3>Purchase Completed!</h3>
          <p>Your Falcon Smartwatch order has been processed. The transaction was logged, and a conversion tracking signal was fired.</p>
          <button class="shop-btn-reset" onclick="resetSimulator()">Restart Simulation 🔄</button>
        </div>
      </div>
    `;
  }
}

// Simulates clicking the advertisement on NewsHub
function simulateAdClick() {
  logSystem("Ad Banner clicked! Initiating navigation sequence...");
  
  // 1. Generate click details
  const randNum = Math.floor(Math.random() * 900000) + 100000;
  state.activeClickId = `CLK_FALCON_${randNum}`;
  state.activeUserId = `USR_DEMO_${randNum}`;
  
  // 2. Set the third-party cookie in redirect context (simulating landing page click redirection via tracking server)
  // Clicking an ad redirects user through tracker server: tracker.pthapli.com/click?c=...
  // This is a direct navigation to tracker, meaning it's a first-party context on the tracker domain.
  if (state.currentProtocol === 'third-party') {
    // Cookie is set on tracker.pthapli.com directly
    state.cookies['tracker.pthapli.com']['_fuid'] = state.activeUserId;
    
    logNetwork('GET', `https://tracker.pthapli.com/click?click_id=${state.activeClickId}&user_id=${state.activeUserId}`, '302 Found', 'success', {
      payload: { click_id: state.activeClickId, user_id: state.activeUserId },
      setCookie: `_fuid=${state.activeUserId}; Domain=tracker.pthapli.com; Secure; HttpOnly; SameSite=Lax`
    });
    
    // Save state on server
    state.serverSessions[state.activeUserId] = {
      clickId: state.activeClickId,
      userId: state.activeUserId,
      createdAt: new Date().toISOString()
    };
  } else {
    // CNAME First-Party delegation does not need a redirect to tracker domain to set third-party cookie!
    // It goes directly to the shop, and the script handles it.
    logSystem("First-party protocol: Bypassing third-party click redirect. Navigating directly to advertiser shop.");
  }
  
  // Navigate viewport to Shop
  state.currentPage = 'shop';
  renderViewport();
  updateCookieJarDisplay();
  
  // Trigger script /init tracking on shop load
  setTimeout(() => {
    triggerInitCall();
  }, 600);
}

// Simulates the initialization of falcon.js script on Advertiser Shop
function triggerInitCall() {
  logSystem(`Loading tracking script tag falcon.js...`);
  
  if (state.currentProtocol === 'third-party') {
    const trackerUrl = `https://tracker.pthapli.com/init`;
    logNetwork('POST', trackerUrl, '204 No Content', 'success', {
      payload: { click_id: state.activeClickId, user_id: state.activeUserId },
      cookiesSent: ''
    });
    
    logSystem("Script executed successfully. In standard third-party setups, no first-party cookies are created on the shop domain.");
  } else {
    // First-party protocol (CNAME delegation: track.advertiser.com)
    const trackerUrl = `https://track.advertiser.com/init`;
    
    // Server saves session on track.advertiser.com
    state.serverSessions[state.activeUserId] = {
      clickId: state.activeClickId,
      userId: state.activeUserId,
      createdAt: new Date().toISOString()
    };
    
    // Since track.advertiser.com is a subdomain of advertiser.com, the browser accepts cookies on .advertiser.com
    let setCookieHeader = `_fuid=${state.activeUserId}; Domain=.advertiser.com; Secure; HttpOnly; SameSite=Lax; Max-Age=2592000`;
    let setCookieReason = null;
    
    state.cookies['advertiser.com']['_fuid'] = state.activeUserId;
    
    logNetwork('POST', trackerUrl, '204 No Content', 'success', {
      payload: { click_id: state.activeClickId, user_id: state.activeUserId },
      setCookie: setCookieHeader
    });
    
    logSystem("First-party cookie _fuid successfully stored under root domain .advertiser.com! Bypassable by design.");
  }
  
  updateCookieJarDisplay();
}

// Simulates the Checkout Complete action
function simulateCheckout() {
  logSystem("Transaction completed! Triggering conversion attribution tag...");
  
  if (state.currentProtocol === 'third-party') {
    const trackUrl = 'https://tracker.pthapli.com/track';
    
    // Check if the cookie would be sent by browser
    let cookiesSent = null;
    let cookieBlockedReason = null;
    
    if (state.privacySetting === 'block-3rd') {
      cookieBlockedReason = 'Blocked cross-site cookie transmission (Safari ITP / Chrome Third-Party Cookie Restriction)';
    } else {
      cookiesSent = state.cookies['tracker.pthapli.com']['_fuid'] ? `_fuid=${state.cookies['tracker.pthapli.com']['_fuid']}` : null;
    }
    
    const payload = { event: 'purchase', data: { revenue: 299.00, currency: 'USD' } };
    
    if (cookieBlockedReason) {
      logNetwork('POST', trackUrl, '204 No Content', 'blocked', {
        payload: payload,
        cookieBlockedReason: cookieBlockedReason
      });
      
      showAttributionResult(false, "Third-party cookie was BLOCKED. The conversion server received the payload, but could not associate it with any user click. Credit is lost.");
    } else if (cookiesSent) {
      logNetwork('POST', trackUrl, '204 No Content', 'success', {
        payload: payload,
        cookiesSent: cookiesSent
      });
      
      showAttributionResult(true, "Third-party cookie attached successfully! Conversion mapped to Click ID.");
    } else {
      logNetwork('POST', trackUrl, '204 No Content', 'success', {
        payload: payload
      });
      showAttributionResult(false, "No tracking cookie found. Click was not registered prior to checkout.");
    }
    
  } else {
    // First Party CNAME
    const trackUrl = 'https://track.advertiser.com/track';
    
    // First-party cookies are ALWAYS sent to their parent subdomains, even if 3rd-party cookies are blocked!
    let cookiesSent = state.cookies['advertiser.com']['_fuid'] ? `_fuid=${state.cookies['advertiser.com']['_fuid']}` : null;
    const payload = { event: 'purchase', data: { revenue: 299.00, currency: 'USD' } };
    
    if (cookiesSent) {
      logNetwork('POST', trackUrl, '204 No Content', 'success', {
        payload: payload,
        cookiesSent: cookiesSent
      });
      
      showAttributionResult(true, "CNAME First-party cookie attached successfully! Bypassed Safari ITP & Chrome restrictions securely.");
    } else {
      logNetwork('POST', trackUrl, '204 No Content', 'success', {
        payload: payload
      });
      showAttributionResult(false, "No first-party cookie found. Make sure initialization occurred.");
    }
  }
  
  state.currentPage = 'success';
  renderViewport();
}

// Show Attribution Outcome
function showAttributionResult(success, detail) {
  if (success) {
    attributionRing.className = 'status-ring success';
    attributionRing.innerHTML = '✅';
    attributionTitle.textContent = 'ATTRIBUTION SUCCESSFUL';
    attributionTitle.style.color = 'var(--success)';
    
    const clickSession = state.serverSessions[state.activeUserId];
    const clickId = clickSession ? clickSession.clickId : 'N/A';
    attributionDesc.innerHTML = `Connected conversion to click:<br><strong style="font-family: monospace; color:#fff">${clickId}</strong><br><span style="font-size:0.7rem; color:var(--text-secondary)">${detail}</span>`;
  } else {
    attributionRing.className = 'status-ring failed';
    attributionRing.innerHTML = '❌';
    attributionTitle.textContent = 'ATTRIBUTION FAILED';
    attributionTitle.style.color = 'var(--danger)';
    attributionDesc.innerHTML = `Conversion recorded but orphaned.<br><span style="color:var(--text-muted); font-size:0.75rem;">${detail}</span>`;
  }
}

// Update cookie visual display panel
function updateCookieJarDisplay() {
  cookieJarList.innerHTML = '';
  
  // Render Domain Section A: tracker.pthapli.com
  const trackerSection = document.createElement('div');
  trackerSection.className = 'cookie-domain-section';
  
  // Check if we display cookie or mark it blocked in UI
  const trackerCookies = state.cookies['tracker.pthapli.com'];
  let trackerCookieHtml = '';
  
  if (Object.keys(trackerCookies).length === 0) {
    trackerCookieHtml = '<div class="cookie-empty">No cookies stored</div>';
  } else {
    for (const [key, value] of Object.entries(trackerCookies)) {
      // If 3rd party cookies are blocked, mark it visually
      const blockedClass = (state.privacySetting === 'block-3rd') ? 'style="opacity:0.3; text-decoration: line-through;"' : '';
      const blockedLabel = (state.privacySetting === 'block-3rd') ? '<span class="cookie-sec" style="background:rgba(239,68,68,0.1); color:#ef4444">Blocked</span>' : '<span class="cookie-sec">3rd Party</span>';
      
      trackerCookieHtml += `
        <div class="cookie-record" ${blockedClass}>
          <div>
            <span class="cookie-name">${key}</span>
            <span class="cookie-val">${value}</span>
          </div>
          ${blockedLabel}
        </div>
      `;
    }
  }
  
  trackerSection.innerHTML = `
    <div class="cookie-domain-header">
      <span>tracker.pthapli.com</span>
      <span class="scope">Cross-Site Context</span>
    </div>
    <div class="cookie-list">
      ${trackerCookieHtml}
    </div>
  `;
  cookieJarList.appendChild(trackerSection);
  
  // Render Domain Section B: advertiser.com
  const advertiserSection = document.createElement('div');
  advertiserSection.className = 'cookie-domain-section';
  advertiserSection.style.marginTop = '1rem';
  
  const advCookies = state.cookies['advertiser.com'];
  let advCookieHtml = '';
  
  if (Object.keys(advCookies).length === 0) {
    advCookieHtml = '<div class="cookie-empty">No cookies stored</div>';
  } else {
    for (const [key, value] of Object.entries(advCookies)) {
      advCookieHtml += `
        <div class="cookie-record">
          <div>
            <span class="cookie-name">${key}</span>
            <span class="cookie-val">${value}</span>
          </div>
          <span class="cookie-sec" style="background:rgba(16,185,129,0.1); color:#34d399">1st Party</span>
        </div>
      `;
    }
  }
  
  advertiserSection.innerHTML = `
    <div class="cookie-domain-header">
      <span>advertiser.com</span>
      <span class="scope">Same-Site Context</span>
    </div>
    <div class="cookie-list">
      ${advCookieHtml}
    </div>
  `;
  cookieJarList.appendChild(advertiserSection);
}

// Reset Attribution Board to neutral state
function updateAttributionBoard() {
  attributionRing.className = 'status-ring pending';
  attributionRing.innerHTML = '🕒';
  attributionTitle.textContent = 'AWAITING SIMULATION';
  attributionTitle.style.color = 'var(--text-muted)';
  attributionDesc.innerHTML = 'Follow the steps in the Mock Browser to trigger tracking events.';
}

// Reset entire simulator
function resetSimulator() {
  state.currentPage = 'publisher';
  state.cookies['tracker.pthapli.com'] = {};
  state.cookies['advertiser.com'] = {};
  state.serverSessions = {};
  state.activeClickId = null;
  state.activeUserId = null;
  
  updateAttributionBoard();
  updateCookieJarDisplay();
  renderViewport();
  logSystem("Simulator reset. Click simulated ad to start again.");
}

// Verification checks if window.falcon is loaded from tracker.pthapli.com
function checkRealTrackerStatus() {
  // Check if loaded
  if (typeof window.falcon === 'function') {
    realStatusBadge.className = 'status-badge tag-active';
    realStatusBadge.querySelector('.status-text').textContent = 'Falcon Active';
    liveTestBtn.disabled = false;
    logSystem("Real Falcon tracking script detected and connected on parent browser window!");
  } else {
    // Wait a brief period and check again in case of delayed loading
    setTimeout(() => {
      if (typeof window.falcon === 'function') {
        realStatusBadge.className = 'status-badge tag-active';
        realStatusBadge.querySelector('.status-text').textContent = 'Falcon Active';
        liveTestBtn.disabled = false;
        logSystem("Real Falcon tracking script detected and connected!");
      } else {
        realStatusBadge.className = 'status-badge tag-inactive';
        realStatusBadge.querySelector('.status-text').textContent = 'Falcon Offline';
        liveTestBtn.disabled = true;
        logSystem("Notice: Real Falcon tracking script is not loaded in this window environment (pointing to tracker.pthapli.com). Live testing disabled, sandbox simulator remains fully functional.");
      }
    }, 1500);
  }
}

// Execute a real pixel conversion request to tracker.pthapli.com
function fireRealConversion() {
  if (typeof window.falcon === 'function') {
    const transactionId = 'TXN-' + Math.floor(Math.random() * 900000 + 100000);
    logSystem(`Firing real Falcon pixel: falcon('track', 'purchase', { transaction_id: "${transactionId}", revenue: 299.00 })`);
    
    window.falcon('track', 'purchase', {
      transaction_id: transactionId,
      revenue: 299.00,
      currency: 'USD',
      items: [
        { id: 'FALCON-SMARTWATCH', name: 'Falcon Smartwatch Premium', price: 299.00 }
      ]
    });
    
    alert(`Real tracking pixel fired!\nTransaction ID: ${transactionId}\nCheck browser network console (tracker.pthapli.com) to see HTTP headers.`);
  } else {
    alert("Real Falcon tracking script is offline. Please resolve DNS / run local server at tracker.pthapli.com.");
  }
}

// Copy Code Snippet Helper
function copyCodeSnippet() {
  const code = document.querySelector('.integration-code-block pre').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const copyBtn = document.querySelector('.btn-copy');
    copyBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.textContent = 'Copy';
    }, 2000);
  });
}
