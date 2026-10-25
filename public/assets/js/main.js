/**
 * ============================================================================
 * AIHOAI — Main Dashboard Controller
 * Dynamic KeyAuth License Expiration & Real-time Status Manager
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- 1. Session Verification ---
  const session = KeyAuth.getSession();

  if (!session || !session.authenticated) {
    console.warn('[AIHOAI] Unauthorized access. Redirecting to login...');
    window.location.href = '/';
    return;
  }

  console.log('[AIHOAI] Session active. User authenticated with key:', session.key);
  const info = session.info || {};

  // --- 2. DOM Elements ---
  const keyDisplay = document.getElementById('key-display');
  const keyChipBtn = document.getElementById('key-chip');
  const ringTimeLeft = document.getElementById('ring-time-left');
  const factActivated = document.getElementById('fact-activated');
  const factExpires = document.getElementById('fact-expires');
  const factDevice = document.getElementById('fact-device');
  const connectBtn = document.querySelector('.ph-connect');
  const connectSub = document.querySelector('.ph-connect__sub');
  const statusBadge = document.getElementById('status-badge') || document.querySelector('.ph-status');
  const lastRefreshedLabel = document.getElementById('last-refreshed-label');
  const langBtn = document.querySelector('.ph-lang');

  // --- 3. Populate Authenticated Key ---
  if (keyDisplay && session.key) {
    keyDisplay.textContent = session.key;
  }

  // --- 4. Parse KeyAuth Expiration Date & Countdown ---
  let expiryTimestampMs = null;
  let isLifetime = false;

  const subs = info.subscriptions || [];
  if (subs.length > 0 && subs[0].expiry) {
    const rawExp = subs[0].expiry;
    if (rawExp === 'never' || rawExp === 'lifetime' || Number(rawExp) > 200000000000) {
      isLifetime = true;
    } else {
      const expSec = Number(rawExp);
      if (!isNaN(expSec) && expSec > 0) {
        expiryTimestampMs = expSec < 10000000000 ? expSec * 1000 : expSec;
      }
    }
  } else if (subs.length > 0 && subs[0].timeleft) {
    const timeLeftSec = Number(subs[0].timeleft);
    if (!isNaN(timeLeftSec) && timeLeftSec > 0) {
      expiryTimestampMs = (session.timestamp || Date.now()) + (timeLeftSec * 1000);
    }
  }

  // Default fallback if expiry not explicitly provided
  if (!expiryTimestampMs && !isLifetime) {
    expiryTimestampMs = (session.timestamp || Date.now()) + (30 * 24 * 60 * 60 * 1000);
  }

  // --- 5. Populate Facts Cards ---
  // A. Activated Date
  if (factActivated) {
    let actDate = new Date();
    if (info.createdate) {
      const actSec = Number(info.createdate);
      if (!isNaN(actSec) && actSec > 0) {
        actDate = new Date(actSec < 10000000000 ? actSec * 1000 : actSec);
      }
    } else if (session.timestamp) {
      actDate = new Date(session.timestamp);
    }
    factActivated.textContent = formatDate(actDate);
  }

  // B. Expiry Date
  if (factExpires) {
    if (isLifetime) {
      factExpires.textContent = 'Never (Lifetime)';
    } else if (expiryTimestampMs) {
      factExpires.textContent = formatDate(new Date(expiryTimestampMs));
    }
  }

  // C. Device / OS
  if (factDevice) {
    factDevice.textContent = getDeviceName();
  }

  // --- 6. Live Timer Countdown Loop ---
  function updateCountdown() {
    if (isLifetime) {
      if (ringTimeLeft) ringTimeLeft.textContent = 'LIFETIME';
      return;
    }

    if (!expiryTimestampMs) {
      if (ringTimeLeft) ringTimeLeft.textContent = '--';
      return;
    }

    const now = Date.now();
    const diff = expiryTimestampMs - now;

    if (diff <= 0) {
      if (ringTimeLeft) {
        ringTimeLeft.textContent = 'EXPIRED';
        ringTimeLeft.style.color = '#ff5566';
      }
      setOnlineState(false);
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let displayStr = '';
    if (days > 0) {
      displayStr = `${days}d ${hours}h`;
    } else if (hours > 0) {
      displayStr = `${hours}h ${pad(minutes)}m`;
    } else {
      displayStr = `${pad(minutes)}m ${pad(seconds)}s`;
    }

    if (ringTimeLeft) {
      ringTimeLeft.textContent = displayStr;
    }
  }

  updateCountdown();
  const timerInterval = setInterval(updateCountdown, 1000);

  // --- 7. Copy Key Functionality ---
  if (keyChipBtn && session.key) {
    keyChipBtn.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(session.key);
        } else {
          const tempInput = document.createElement('input');
          tempInput.value = session.key;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
        }

        const actionText = keyChipBtn.querySelector('.ph-keychip__action');
        if (actionText) {
          const originalHTML = actionText.innerHTML;
          actionText.innerHTML = '<span>copied!</span>';
          setTimeout(() => {
            actionText.innerHTML = originalHTML;
          }, 1500);
        }
      } catch (err) {
        console.error('Failed to copy key:', err);
      }
    });
  }

  // --- 8. Real-time Online/Offline Status & Last Refreshed Manager ---
  let lastRefreshedTimestamp = Number(localStorage.getItem('aihoai_last_refreshed')) || Date.now();
  const savedStatus = localStorage.getItem('aihoai_vpn_status') || 'offline';

  function setOnlineState(isOnline, updateTimestamp = true) {
    if (updateTimestamp) {
      lastRefreshedTimestamp = Date.now();
      localStorage.setItem('aihoai_last_refreshed', lastRefreshedTimestamp.toString());
    }
    localStorage.setItem('aihoai_vpn_status', isOnline ? 'online' : 'offline');

    if (statusBadge) {
      if (isOnline) {
        statusBadge.classList.remove('is-offline');
        statusBadge.classList.add('is-online');
        statusBadge.textContent = 'online';
      } else {
        statusBadge.classList.remove('is-online');
        statusBadge.classList.add('is-offline');
        statusBadge.textContent = 'offline';
      }
    }

    updateLastRefreshedText();
  }

  function updateLastRefreshedText() {
    if (!lastRefreshedLabel) return;
    const isOnline = statusBadge && statusBadge.classList.contains('is-online');

    if (!isOnline) {
      lastRefreshedLabel.textContent = 'disconnected • tap to activate';
      return;
    }

    const diffSec = Math.max(0, Math.floor((Date.now() - lastRefreshedTimestamp) / 1000));
    if (diffSec < 10) {
      lastRefreshedLabel.textContent = 'last refreshed just now';
    } else if (diffSec < 60) {
      lastRefreshedLabel.textContent = `last refreshed ${diffSec}s ago`;
    } else {
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) {
        lastRefreshedLabel.textContent = `last refreshed ${diffMin}m ago`;
      } else {
        const diffH = Math.floor(diffMin / 60);
        lastRefreshedLabel.textContent = `last refreshed ${diffH}h ago`;
      }
    }
  }

  // Initialize status on page load
  setOnlineState(savedStatus === 'online', false);

  // Status badge click toggle
  if (statusBadge) {
    statusBadge.addEventListener('click', () => {
      const currentOnline = statusBadge.classList.contains('is-online');
      setOnlineState(!currentOnline, true);
    });
  }

  // Periodic refresh ticker every 5 seconds
  setInterval(updateLastRefreshedText, 5000);

  // --- 9. Add Subscription Button Action ---
  const SUBSCRIPTION_LINK = "happ://crypt5/fzvdyx1jl6KdqhFQYZOufZWA88qNMEFp8DXMFowc/50cFFc2HAr/NmFQ6r1LLj+DOavUwgI1TpzOt5oyl67/ofo2vWZbeaBhQI2jIKP9PUODhFjcw=/h2T=EvYK39I2+WVRjIvRsNFBeSll3W5GHGY2KgVxPsI9t+Es4Q0X9/4MFhKZnajlaiiGi3uSiyOrLxqQa4RG4L48CnPItWhVqIBaV8dfm45tvBphYyQQwyJRhn05/ZDFQR1dvkjtxFjrS842dYkhBFfUs4JrTppcNpIjNAi4YEJ59RV9aCUG2d3fkvkK73HNv5seIWkg8NKLHhW7rSAVTB4yjou/jxxa/sXPqDEn6vKZaPoja26p9N6AiosKFwmMPcP+tnd3XleC2AYvs8c42dkN/Dk3esQx4YE6kC4+dqX9Tv0K6WA5NRHtg+lLJAQPEdAsNR8Vq2hJj8aGfrdAFlo7QNwxdA7UJTnoTgpgDt/2lQJuKA/hZ19AdxavNtdwlarzrdBDTm9s6Ho0EhXx5VM3S9ZNUE+j2BswITBeWnVSOXCzGKCvM2Lc3YMzA9TIBMv23ULkJdNVwIFyQApRbr/3YB0YGZN+uJdtP4foTrLlNJL88Xdl6SFCdX8OoCXu+gf0n9iqac+RVjjo7t52AIgGRUcXElMnOyW7d6bFreYS42/8DGaOa2WvSEHTifSvPqu6j5fdl0mbokUgxOxzhEevgWpFde8wgm5AJsirWmBw0p8RuLJdKpcbeCzQyqGQe7IUM2PzKJiCvdCRri5CE7/1o8X5DvMTXjTgtCHvOu0Onof=ff";

  if (connectBtn) {
    connectBtn.href = SUBSCRIPTION_LINK;

    connectBtn.addEventListener('click', async (e) => {
      // 1. Activate Online status & reset refresh timer
      setOnlineState(true, true);

      // 2. Copy active key to clipboard
      if (session.key) {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(session.key);
          }
        } catch (err) { }
      }

      // 3. Temporary button feedback
      const originalSub = connectSub ? connectSub.textContent : '';
      if (connectSub) {
        connectSub.textContent = 'activating subscription • opening app...';
        setTimeout(() => {
          connectSub.textContent = originalSub;
        }, 2500);
      }
    });
  }

  // --- 10. Language Toggle ---
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      const currentDir = document.documentElement.getAttribute('dir');
      if (currentDir === 'rtl') {
        document.documentElement.setAttribute('dir', 'ltr');
        langBtn.querySelector('span').textContent = 'EN';
      } else {
        document.documentElement.setAttribute('dir', 'rtl');
        langBtn.querySelector('span').textContent = 'AR';
      }
    });
  }

  // --- Helper Formatting Utilities ---
  function pad(num) {
    return num < 10 ? '0' + num : num;
  }

  function formatDate(d) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function getDeviceName() {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return 'iPhone • iOS';
    if (/iPad/i.test(ua)) return 'iPad • iPadOS';
    if (/Android/i.test(ua)) return 'Android Device';
    if (/Windows NT/i.test(ua)) return 'Windows PC';
    if (/Macintosh/i.test(ua)) return 'Mac OS';
    if (/Linux/i.test(ua)) return 'Linux Device';
    return 'Web Client';
  }
});
