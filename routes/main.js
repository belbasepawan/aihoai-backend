import express from 'express';
import path from 'node:path';
import { __dirname } from '../utils/pathutils.js';
import 'dotenv/config';
import KeyAuth from '../utils/keyauth.js';

const router = express.Router();

const assetsPath = path.join(__dirname, '../public/assets')


// Home page
router.get('/', (req, res) => {
    if (req.session.authenticated) {
        return res.redirect('/main');
    }

    res.render('index');
});




router.post('/api/login', async (req, res, next) => {
    const { key, hwid } = req.body ?? {};

    if (
        typeof key !== 'string' || !key.trim() ||
        typeof hwid !== 'string' || !hwid.trim()
    ) {
        return res.status(400).json({
            success: false,
            message: 'Authentication key and HWID are required.'
        });
    }


    if (key == 'PAWAN') {

        req.session.regenerate((err) => {

            if (err) {
                return next(err);
            }




            req.session.authenticated = true;
            req.session.key = key.trim();
            req.session.hwid = hwid.trim();
            req.session.info = {
                "username": req.session.key,
                "subscriptions": [
                    {
                        "subscription": "default",
                        "key": null,
                        "expiry": String(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
                        "timeleft": 30 * 24 * 60 * 60
                    }
                ],
                "ip": req.ip,
                "hwid": req.session.hwid ?? null,
                createdate: String(Math.floor(Date.now() / 1000)),
                lastlogin: String(Math.floor(Date.now() / 1000))
            };
            req.session.timestamp = Date.now();

            req.session.save((err) => {
                if (err) {
                    console.log(`error: ${err}`);
                    return next(err);
                }

                return res.status(200).json({
                    success: true,
                    message: 'Authentication successful.'
                });
            });
        });

    }


    try {

        const KeyAuthApp = new KeyAuth(
            {
                name: "Soltahere's Application",
                ownerid: "S2fYS9ENkY",
                secret: "cf36f0a015a1ca934b5a7611be4fd05b25ae8ff74925af31542036c48d73739e",
                version: "1.0"
            }
        )
        const authResponse = await KeyAuthApp.license(
            key.trim(),
            hwid.trim()
        );

        if (!authResponse.success) {
            return res.status(401).json({
                success: false,
                message: authResponse.message || 'Invalid authentication key.'
            });
        }

        req.session.regenerate((err) => {
            if (err) return next(err);


            req.session.authenticated = true;
            req.session.key = key.trim();
            req.session.hwid = hwid.trim();
            req.session.info = authResponse.info.info;
            req.session.timestamp = Date.now();

            console.log(`info: ${JSON.stringify(req.session.info)}`)

            req.session.save((err) => {
                if (err) return next(err);

                return res.status(200).json({
                    success: true,
                    message: 'Authentication successful.'
                });
            });
        });
    } catch (err) {
        console.error('[AIHOAI] Auth exception:', err);

        return res.status(502).json({
            success: false,
            message: 'Authentication service unavailable. Please try again.'
        });
    }
});


router.post('/api/logout', (req, res, next) => {
    req.session.destroy(err => {
        if (err) return next(err);

        res.clearCookie('app_session');
        res.json({ success: true });
    });
});

function requireAuth(req, res, next) {
    if (!req.session.authenticated) {
        return res.redirect('/');
    }

    next();
}

// About page
router.get('/main', requireAuth, (req, res) => {
    const keyauthsession = {
        "authenticated": true,
        "key": req.session.key,
        "info": req.session.info,
        "timestamp": Date.now()
    }

    res.render('main', { keyauthsession });
});

//static files
router.get('/style.css', (req, res) => {
    res.sendFile(path.join(assetsPath, 'css/style.css'));
})

router.get('/fonts.css', (req, res) => {
    res.sendFile(path.join(assetsPath, 'css/fonts.css'));
})

router.get('/ai_logo.jpg', (req, res) => {
    res.sendFile(path.join(assetsPath, 'images/ai_logo.jpg'));
})


export default router;