/**
 * ============================================================================
 * AIHOAI / PHANTOM — Client Panel Controller
 * Powered by KeyAuth
 * ============================================================================
 */

// Initialize KeyAuth Client with Application Credentials
const KeyAuthApp = new KeyAuth({
  name: "Soltahere's Application",
  ownerid: "S2fYS9ENkY",
  secret: "cf36f0a015a1ca934b5a7611be4fd05b25ae8ff74925af31542036c48d73739e",
  version: "1.0",
});

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const keyInput = document.getElementById('key-input');
  const pasteBtn = document.getElementById('paste-btn');
  const accessForm = document.getElementById('access-form');
  const unlockBtn = document.getElementById('unlock-btn');
  const unlockBtnText = document.getElementById('unlock-btn-text');
  const unlockSpinner = document.getElementById('unlock-spinner');
  const keyContainer = document.getElementById('key-container');
  const statusMessage = document.getElementById('status-message');

  // --- State ---
  let isAuthenticating = false;

  // --- Pre-initialize KeyAuth session in the background ---
  KeyAuthApp.init().then(res => {
    if (res.success) {
      console.log("[AIHOAI] KeyAuth initialized successfully");
    } else {
      console.warn("[AIHOAI] KeyAuth background init:", res.message);
    }
  });

  // --- Check existing session ---
  const existingSession = KeyAuth.getSession();



  if (existingSession && keyInput) {
    keyInput.value = existingSession.key;
  }

  // --- Auto-format Access Key ---
  // Transforms keystrokes to uppercase and trims invalid whitespace
  if (keyInput) {
    keyInput.addEventListener('input', (e) => {
      let val = e.target.value.toUpperCase();
      // Remove characters that aren't letters, digits, or dashes
      val = val.replace(/[^A-Z0-9-]/g, '');

      e.target.value = val;
      clearStatus();
    });
    

    // Clear error style on focus
    keyInput.addEventListener('focus', () => {
      keyContainer.classList.remove('has-error');
    });
  }

  // --- Paste Clipboard Handling ---
  if (pasteBtn && keyInput) {
    pasteBtn.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text) {
            keyInput.value = text.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
            keyInput.focus();
            showStatus('Key pasted from clipboard', 'info');
          }
        } else {
          keyInput.focus();
          keyInput.select();
          document.execCommand('paste');
        }
      } catch (err) {
        console.warn('Clipboard access denied or unsupported:', err);
        keyInput.focus();
        showStatus('Press Ctrl+V to paste', 'info');
      }
    });
  }

  // --- Form Submission & KeyAuth Authentication ---
  if (accessForm) {
    accessForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isAuthenticating) return;

      const rawKey = keyInput ? keyInput.value.trim() : '';

      // Basic validation check
      if (!rawKey) {
        triggerError('Please enter your access key');
        return;
      }

      if (rawKey.length < 5) {
        triggerError('Invalid key length — check your key');
        return;
      }

      // Start Authentication state
      setAuthenticatingState(true);
      showStatus('Connecting to KeyAuth servers...', 'info');

      try {
        // Authenticate license key against KeyAuth API
        const authResponse = await KeyAuthApp.license(rawKey);

        if (authResponse.success) {
          // Valid key!
          showStatus('Access Granted! Redirecting to panel...', 'success');
          
          if (unlockBtnText) {
            unlockBtnText.textContent = 'authorized';
          }

          // Redirect to the main dashboard page
          setTimeout(() => {
            window.location.href = '/main';
          }, 800);

        } else {
          // Invalid key or expired
          setAuthenticatingState(false);
          triggerError(authResponse.message || 'Invalid license key.');
        }

      } catch (err) {
        console.error('[AIHOAI] Auth exception:', err);
        setAuthenticatingState(false);
        triggerError('Connection error. Please try again.');
      }
    });
  }

  // --- UI Helper Functions ---

  function triggerError(message) {
    showStatus(message, 'error');

    if (keyContainer) {
      keyContainer.classList.add('has-error');
      keyContainer.classList.remove('ph-shake');
      void keyContainer.offsetWidth; // Force reflow for animation restart
      keyContainer.classList.add('ph-shake');
    }

    if (keyInput) {
      keyInput.focus();
    }
  }

  function showStatus(text, type = 'info') {
    if (!statusMessage) return;
    statusMessage.textContent = text;
    statusMessage.className = `ph-status-box ph-status--${type}`;
    statusMessage.style.display = 'block';
  }

  function clearStatus() {
    if (!statusMessage) return;
    statusMessage.textContent = '';
    statusMessage.style.display = 'none';
  }

  function setAuthenticatingState(loading) {
    isAuthenticating = loading;
    if (unlockBtn) {
      unlockBtn.disabled = loading;
    }
    if (unlockBtnText) {
      unlockBtnText.textContent = loading ? 'verifying...' : 'unlock';
    }
    if (unlockSpinner) {
      unlockSpinner.style.display = loading ? 'inline-block' : 'none';
    }
    if (keyInput) {
      keyInput.readOnly = loading;
    }
  }
});
