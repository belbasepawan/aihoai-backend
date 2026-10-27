class KeyAuth {
    constructor(config) {
        this.name = config.name;
        this.ownerid = config.ownerid;
        this.version = config.version || "1.2";
        this.secret = config.secret;
        this.url = config.url || 'https://ai-auth-xff2.onrender.com/api/1.2/';
        this.sessionId = null;
        this.initialized = false;
    }

    async init() {
        try {

            const response = await fetch(this.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    type: 'init',
                    name: this.name,
                    ownerid: this.ownerid,
                    secret: this.secret,
                    ver: this.version
                })
            });


            // debug
            const data = await response.json();

            console.log("Init request:", {
                name: this.name,
                ownerid: this.ownerid,
                version: this.version,
                url: this.url
            });

            console.log("Init response:", data);
            //end debug

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

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


            const response = await fetch(this.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    type: 'license',
                    key: licenseKey,
                    hwid: hwid,
                    sessionid: this.sessionId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                console.log("[KeyAuth] Authentication success:", data);
                return { success: true, message: data.message || "Access Granted!", info: data };
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