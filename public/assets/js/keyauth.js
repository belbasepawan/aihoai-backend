/**
 * ============================================================================
 * KeyAuth JavaScript Client SDK
 * ============================================================================
 */

class KeyAuth {
  constructor(config) {
    this.name = config.name;
    this.ownerid = config.ownerid;
    this.secret = config.secret;
    this.version = config.version || "1.0";
    this.url = config.url || "https://keyauth.win/api/1.2/";
    this.sessionId = null;
    this.initialized = false;
  }

  /**
   * Generates or retrieves a persistent HWID for the browser client
   */
  getHWID() {
    let hwid = localStorage.getItem("keyauth_hwid");

    if (!hwid) {
        hwid = "HWID-" + crypto.randomUUID()
            .replace(/-/g, "")
            .toUpperCase();

        localStorage.setItem("keyauth_hwid", hwid);
    }

    return hwid;
}

  /**
   * Initialize connection with KeyAuth API
   */
  async init() {
    try {
      const initUrl = `${this.url}?type=init&name=${encodeURIComponent(this.name)}&ownerid=${encodeURIComponent(this.ownerid)}&ver=${encodeURIComponent(this.version)}`;
      const response = await fetch(initUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        console.error("[KeyAuth] Init failed:", data.message);
        return { success: false, message: data.message || "Initialization failed" };
      }

      this.sessionId = data.sessionid;
      this.initialized = true;
      console.log("[KeyAuth] Initialized successfully. Session ID:", this.sessionId);
      return { success: true, message: data.message, appinfo: data.appinfo };
    } catch (err) {
      console.error("[KeyAuth] Init network error:", err);
      return { success: false, message: "Unable to connect to KeyAuth authentication servers." };
    }
  }

  /**
   * Authenticate using a license key
   */
  async license(licenseKey) {
    if (!licenseKey || !licenseKey.trim()) {
      return { success: false, message: "Please enter your access key." };
    }

    // Ensure session is initialized
    if (!this.initialized || !this.sessionId) {
      const initRes = await this.init();
      if (!initRes.success) {
        return initRes;
      }
    }

    try {
      const hwid = this.getHWID();
      const loginUrl = `${this.url}?type=license&key=${encodeURIComponent(licenseKey.trim())}&hwid=${encodeURIComponent(hwid)}&sessionid=${encodeURIComponent(this.sessionId)}&name=${encodeURIComponent(this.name)}&ownerid=${encodeURIComponent(this.ownerid)}`;

      const response = await fetch(loginUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log("[KeyAuth] Authentication success:", data);
        // Persist session locally
        localStorage.setItem("keyauth_session", JSON.stringify({
          authenticated: true,
          key: licenseKey.trim(),
          info: data.info || {},
          timestamp: Date.now()
        }));
        return { success: true, message: data.message || "Access Granted!", info: data.info };
      } else {
        console.warn("[KeyAuth] Authentication failed:", data.message);
        return { success: false, message: data.message || "Invalid license key." };
      }
    } catch (err) {
      console.error("[KeyAuth] License request error:", err);
      return { success: false, message: "Authentication request failed. Check your internet connection." };
    }
  }

  /**
   * Check if current browser has an active valid session
   */
  static getSession() {
    try {
      const stored = localStorage.getItem("keyauth_session");
      if (!stored) return null;
      const session = JSON.parse(stored);
      if (session && session.authenticated && session.key) {
        return session;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  /**
   * Logout user and clear session
   */
  static logout() {
    localStorage.removeItem("keyauth_session");
    window.location.href = "/";
  }
}

// Export for browser
window.KeyAuth = KeyAuth;
