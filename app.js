/**
 * Falcon Premium Storefront - Client Application Logic
 * Coordinates checkout modal flows, handles URL parameters, and invokes
 * the real window.falcon tracking script upon successful checkout.
 */

// Global state variables
const state = {
  activeClickId: null,
  activeUserId: null
};

// DOM Elements
let statusBadge, urlParamStatus, checkoutModal, storefrontView, successView, summaryTxnId, trackingDispatchLog;

// Initialize on DOM loaded
window.addEventListener('DOMContentLoaded', () => {
  // Bind Elements
  statusBadge = document.getElementById('falcon-status');
  urlParamStatus = document.getElementById('url-param-status');
  checkoutModal = document.getElementById('checkout-modal');
  storefrontView = document.getElementById('storefront-view');
  successView = document.getElementById('success-view');
  summaryTxnId = document.getElementById('summary-txn-id');
  trackingDispatchLog = document.getElementById('tracking-dispatch-log');

  // Check URL query parameters on load
  checkUrlParameters();

  // Verify if falcon.js script is successfully loaded
  checkFalconScript();
});

/**
 * Checks URL for tracking parameters (like click_id) and displays status.
 */
function checkUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const clickId = urlParams.get('click_id');
  
  if (clickId) {
    state.activeClickId = clickId;
    urlParamStatus.textContent = `Active Click Parameter: ${clickId}`;
    urlParamStatus.className = 'param-status text-active';
  } else {
    // Also look for other standard UTM or ad parameters if any
    const paramKeys = Array.from(urlParams.keys());
    if (paramKeys.length > 0) {
      urlParamStatus.textContent = `Params detected: ${paramKeys.join(', ')}`;
      urlParamStatus.className = 'param-status text-warning';
    } else {
      urlParamStatus.textContent = 'No click parameters detected';
      urlParamStatus.className = 'param-status text-inactive';
    }
  }
}

/**
 * Verifies if window.falcon is defined, updating the header status indicator.
 */
function checkFalconScript() {
  const updateBadge = (active) => {
    if (active) {
      statusBadge.className = 'status-badge tag-active';
      statusBadge.querySelector('.status-text').textContent = 'Falcon Active';
    } else {
      statusBadge.className = 'status-badge tag-inactive';
      statusBadge.querySelector('.status-text').textContent = 'Falcon Offline';
    }
  };

  // Check immediately
  if (typeof window.falcon === 'function') {
    updateBadge(true);
  } else {
    // Retry shortly in case script load is deferred/async
    let retries = 3;
    const interval = setInterval(() => {
      if (typeof window.falcon === 'function') {
        updateBadge(true);
        clearInterval(interval);
      } else {
        retries--;
        if (retries <= 0) {
          updateBadge(false);
          clearInterval(interval);
        }
      }
    }, 500);
  }
}

/**
 * Reloads the page with a newly generated mock click_id parameter.
 * Mimics a referral landing redirect.
 */
function simulateAdClick() {
  const randomId = Math.floor(Math.random() * 900000) + 100000;
  const clickId = `CLK_FALCON_${randomId}`;
  
  // Reload current URL with the new parameter
  const newUrl = new URL(window.location.href);
  newUrl.searchParams.set('click_id', clickId);
  window.location.href = newUrl.toString();
}

/**
 * Clears URL parameters and reloads page back to baseline.
 */
function clearUrlParams() {
  const baselineUrl = window.location.origin + window.location.pathname;
  window.location.href = baselineUrl;
}

/**
 * Shows the checkout modal overlay.
 */
function openCheckoutModal() {
  checkoutModal.classList.add('active');
  // Auto focus cardholder name
  setTimeout(() => {
    document.getElementById('checkout-name').focus();
  }, 150);
}

/**
 * Hides the checkout modal overlay.
 */
function closeCheckoutModal() {
  checkoutModal.classList.remove('active');
}

/**
 * Handles the checkout form submission, dispatches real tracking event, 
 * and shows the confirmation screen.
 */
function handleCheckoutSubmit(event) {
  event.preventDefault();
  
  // Close checkout modal
  closeCheckoutModal();
  
  // Generate mock transaction details
  const randomTxn = Math.floor(Math.random() * 9000000) + 1000000;
  const transactionId = `TXN-${randomTxn}`;
  summaryTxnId.textContent = transactionId;
  
  // Prepare tracking log display
  let logHtml = '';
  
  // Fire conversion tag via window.falcon (if loaded)
  if (typeof window.falcon === 'function') {
    logHtml += `<span class="log-success">✓ window.falcon found</span><br>`;
    logHtml += `<span class="log-cmd">Executing: falcon('track', 'purchase', { transaction_id: "${transactionId}", revenue: 299.00 })</span><br>`;
    
    try {
      window.falcon('track', 'purchase', {
        transaction_id: transactionId,
        revenue: 299.00,
        currency: 'USD',
        items: [
          { id: 'FALCON-SMARTWATCH', name: 'Falcon Smartwatch Premium', price: 299.00 }
        ]
      });
      logHtml += `<span class="log-success">✓ Purchase tracking packet successfully fired.</span>`;
    } catch (e) {
      logHtml += `<span class="log-error">✗ Error executing falcon tracking: ${e.message}</span>`;
    }
  } else {
    logHtml += `<span class="log-error">✗ window.falcon NOT found!</span><br>`;
    logHtml += `<span class="log-muted">Make sure tracker.pthapli.com DNS is resolved and the script loaded successfully. Check your browser network panel.</span>`;
  }
  
  trackingDispatchLog.innerHTML = logHtml;
  
  // Switch layouts
  storefrontView.style.display = 'none';
  successView.style.display = 'flex';
  
  // Scroll to top of window to view order details
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Resets storefront state for subsequent testing.
 */
function resetStore() {
  // Clear form inputs
  document.getElementById('checkout-form').reset();
  
  // Switch layout back
  successView.style.display = 'none';
  storefrontView.style.display = 'grid';
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
