import express from 'express';
import path from 'node:path';
import { __dirname } from '../utils/pathutils.js';

const router = express.Router();

const staticPath = path.join(__dirname, '../static');

// Home page
router.get('/', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// About page
router.get('/main', (req, res) => {
    res.sendFile(path.join(staticPath, 'main.html'));
});


export default router;