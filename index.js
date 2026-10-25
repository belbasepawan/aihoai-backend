import 'dotenv/config';
import express from 'express';
import path from 'node:path';

import { __dirname } from './utils/pathutils.js';
import { errorResponse } from './utils/helper.js';
import mainRouter from './routes/main.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));

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