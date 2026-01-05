// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');

// Import routes
const chatRoutes = require('./routes/chat');
const roomRoutes = require('./routes/room');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const app = express();
// Security hardening
app.disable('x-powered-by');
app.use(helmet());
// Set Content Security Policy to allow Supabase connections
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "https://uesmrlothnuxcxfsjget.supabase.co"],
            imgSrc: ["'self'", 'data:'],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
            fontSrc: ["'self'", 'https:', 'data:'],
            objectSrc: ["'none'"],
            frameAncestors: ["'self'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
        },
    })
);
app.use(cors({
    origin: ['https://aigooooo.com', /^https?:\/\/localhost(:\d+)?$/],
    methods: ['GET','POST','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
    credentials: true,
    maxAge: 600
}));
app.use(express.json({ limit: '1mb' }));
const limiter = rateLimit({ windowMs: 60_000, max: 60 });
app.use(limiter);
// Serve built frontend assets first (so /assets/* resolves to dist assets)
app.use(express.static(path.join(__dirname, '../public/dist')));
// Serve other public files (markdown, images, etc.)
app.use(express.static(path.join(__dirname, '../public')));

// Mount routers
app.use('/', chatRoutes);
app.use('/rooms', roomRoutes);

// Serve React app for all other routes (SPA fallback)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dist/index.html'));
});

module.exports = app;
