// on the docker, dotenv no need
// require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { OpenAI } = require('openai');
const path = require('path');
const mongoose = require('mongoose');
const ChatMessage = require('../models/ChatMessage');
const Chat = require('../models/Chat');
const app = express();
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Simple authentication middleware using Supabase access token
async function authenticate(req, res, next) {
    try {
        if (!supabase) return res.status(500).json({ error: '' });
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) return res.status(400).json({ error: '' });
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data || !data.user) return res.status(400).json({ error: '' });
        req.authUser = data.user;
        next();
    } catch {
        return res.status(400).json({ error: '' });
    }
}
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

app.use(express.json());
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

// Initial system prompt
const systemPrompt = {
    role: 'developer',
    content: [
        'You are an AI English conversation tutor.',
        'Always format responses using markdown for readability.',
        'In every response, mix English and Japanese sentences so the user can learn English.',
        "First, suggest a more beautiful version of the user's English, then continue the conversation."
    ].join('\n')
};

// Lightweight input validators
const isObjectId = (v) => typeof v === 'string' && mongoose.Types.ObjectId.isValid(v);
const isUUID = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const isNonEmptyString = (v, max = 2000) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isStringMax = (v, max) => typeof v === 'string' && v.length <= max;

// Endpoint to get all messages for a chatId
app.get('/chat-history', authenticate, async (req, res) => {
    const chatId = req.query.chatId; // This should be the Chat _id
    const userId = req.query.userId;
    if (!chatId || !userId) return res.status(400).json({ error: '' });
    // Ensure the authenticated user matches requested userId
    if (!req.authUser || String(req.authUser.id) !== String(userId)) {
        return res.status(400).json({ error: '' });
    }
    if (!isObjectId(chatId) || !(isObjectId(userId) || isUUID(userId))) {
        return res.status(400).json({ error: '' });
    }
    try {
        const messages = await ChatMessage.find({ chatId, userId }).sort({ timestamp: 1 }).lean();
        res.status(200).json({ messages });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

// Endpoint to get all chat IDs with their last message date and title (only userId's), sorted by date descending
app.get('/chats-with-title', authenticate, async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: '' });
    if (!req.authUser || String(req.authUser.id) !== String(userId)) {
        return res.status(400).json({ error: '' });
    }
    if (!(isObjectId(userId) || isUUID(userId))) return res.status(400).json({ error: '' });
    try {
        // Get all chats for this user, ordered by timestamp descending (newest first)
        const chats = await Chat.find({ userId }).sort({ timestamp: -1 }).lean();
        res.status(200).json({ chats });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

// POST / for chatbot
// AI-powered input prediction endpoint
app.post('/writing-suggestions', async (req, res) => {
    const { context, input } = req.body;
    // context: last LLM message as string (no role), input: current user input as string
    if (!isNonEmptyString(input, 2000) || !isStringMax(context, 5000)) {
        return res.status(400).json({ error: '' });
    }
    try {
        const safeInput = input.trim();
        const safeContext = String(context).slice(0, 5000);
        // Compose OpenAI input: system prompt, context, and input as plain strings
        const systemPrompt = {
            role: 'developer',
            content: [
                "You are an autocomplete engine for a chat app.",
                "This is the last message from the chat: \"" + safeContext + "\".",
                "This is the user's unfinished input: \"" + safeInput + "\".",
                "Suggest ONLY 3 possible next words or short phrases (in English) that could follow the user's input, based on the chat context. Respond ONLY with the suggestions, comma separated. Do NOT generate a full sentence, reply, or explanation."
            ].join(' ')
        };
        const response = await openai.responses.create({
            model: 'gpt-5-chat-latest',
            input: [systemPrompt]
        });
        // Parse suggestions from output_text
        let suggestions = [];
        if (response.output_text) {
            suggestions = response.output_text.split(',').map(s => s.trim()).filter(Boolean);
        }
        res.status(200).json({ suggestions });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

app.post('/', async (req, res) => {
    const userMessage = req.body.message;
    let chatId = req.body.chatId; // This should be the Chat _id or null
    const userId = req.body.userId; // Optional - can be null for logged-out users
    if (!isNonEmptyString(userMessage, 2000)) return res.status(400).json({ error: '' });
    if (chatId && !isObjectId(String(chatId))) return res.status(400).json({ error: '' });
    if (userId && !(isObjectId(String(userId)) || isUUID(String(userId)))) return res.status(400).json({ error: '' });
    try {
        const safeMessage = userMessage.trim();
        // If chatId is null, create a new chat and use its _id
        if (!chatId) {
            // Generate chat title
            const titlePrompt = [
                {
                    role: 'developer',
                    content: 'Generate a short, descriptive chat title (max 8 words) based on the following user message. Respond ONLY with the title.'
                },
                { role: 'user', content: safeMessage }
            ];
            const titleResponse = await openai.responses.create({
                model: 'gpt-5-chat-latest',
                input: titlePrompt
            });
            // Create chat document
            const chatDoc = await Chat.create({ userId: userId || null, title: titleResponse.output_text });
            chatId = chatDoc._id;
        }

        // Get all messages for this chatId (and userId if provided)
        const query = userId ? { chatId, userId } : { chatId };
        const allMessages = await ChatMessage.find(query).sort({ timestamp: 1 }).lean();

        // Save user message to DB (userId can be null for anonymous users)
        await ChatMessage.create({ chatId, userId: userId || null, role: 'user', content: safeMessage });

        // Prepare context for LLM
        const cleanedHistory = allMessages.map(msg => ({ role: msg.role, content: msg.content }));
        const inputHistory = [systemPrompt, ...cleanedHistory.slice(-19), { role: 'user', content: safeMessage }];

        // Get assistant response
        const response = await openai.responses.create({
            model: 'gpt-5-chat-latest',
            input: inputHistory
        });

        // Save assistant response to DB
        await ChatMessage.create({ chatId, userId: userId || null, role: 'assistant', content: response.output_text });

        res.status(200).json({ reply: response.output_text, chatId });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

// Serve React app for all other routes (SPA fallback)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dist/index.html'));
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
