import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import session from 'express-session';

import { __dirname } from './utils/pathutils.js';
import { errorResponse } from './utils/helper.js';
import mainRouter from './routes/main.js';


const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(session({
    name: 'app_session',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000
    }
}));

console.log(process.env.KEYAUTHLINK)


// Website routes
app.use('/', mainRouter);

// 404 handler
app.use((req, res) => {
    res.status(404).json(errorResponse("404 not found"));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server started at http://localhost:${PORT}`);
});