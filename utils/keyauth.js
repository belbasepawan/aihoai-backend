class KeyAuth {
    constructor(config) {
        this.name = config.name;
        this.ownerid = config.ownerid;
        this.secret = config.secret; //not used
        this.version = config.version || "1.0";
        this.url = config.url || "https://keyauth.win/api/1.2/";
        this.sessionId = null;
        this.initialized = false;
    }

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

    async license(licenseKey, devicehwid) {
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
            const hwid = devicehwid;
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
                return { success: true, message: data.message || "Access Granted!", info: data};
            } else {
                console.warn("[KeyAuth] Authentication failed:", data.message);
                return { success: false, message: data.message || "Invalid license key." };
            }
        } catch (err) {
            console.error("[KeyAuth] License request error:", err);
            return { success: false, message: "Authentication request failed. Check your internet connection." };
        }
    }
}   

export default KeyAuth;