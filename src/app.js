// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { OpenAI } = require('openai');
const path = require('path');
const mongoose = require('mongoose');
const ChatMessage = require('../models/ChatMessage');
const Chat = require('../models/Chat');
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
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const app = express();
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
    try {
        const messages = await ChatMessage.find({
            chatId: { $eq: chatId },
            userId: { $eq: userId },
        }).sort({ timestamp: 1 }).lean();
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
    try {
        // Get all chats for this user, ordered by timestamp descending (newest first)
        const chats = await Chat.find({ userId: { $eq: userId } }).sort({ timestamp: -1 }).lean();
        res.status(200).json({ chats });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

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

// don't use authenticate here - allow anonymous users
app.post('/', async (req, res) => {
    const userMessage = req.body.message;
    let chatId = req.body.chatId; // This should be the Chat _id or null
    let userId = req.body.userId; // Optional - can be null for logged-out users
    if (!isNonEmptyString(userMessage, 2000)) return res.status(400).json({ error: '' });
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
        const query = userId
            ? { chatId: { $eq: chatId }, userId: { $eq: userId } }
            : { chatId: { $eq: chatId } };
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


// Room model
const Room = require('../models/Room');

// Special system prompt for room chat (group AI)
const roomSystemPrompt = {
    role: 'developer',
    content: [
        'You are an AI English group conversation assistant.',
        'This is a group chat room for collaborative English learning.',
        'Below is the conversation history for context. At the end, you will see the CURRENT USER MESSAGE to translate.',
        'Translate the user\'s message into natural, fluent English. Do NOT reply with anything else. Do NOT add any explanation, commentary, or extra words. ONLY output the English translation.'
    ].join('\n')
};

// Alternative prompt: enhance user message (not just translate)
const roomEnhancePrompt = {
    role: 'developer',
    content: [
        'You are an AI English group conversation assistant.',
        'This is a group chat room for collaborative English learning.',
        'Below is the conversation history for context. At the end, you will see the CURRENT USER MESSAGE to translate.',
        'Your task: Aggressively and boldly enhance, expand, and transform ONLY the CURRENT USER MESSAGE. Be creative, powerful, and even a little crazy—add wild ideas, dramatic flair, humor, or unexpected twists. Make the message as expressive, engaging, and memorable as possible.',
        'IMPORTANT: Do NOT reply with anything except the enhanced English version of the CURRENT USER MESSAGE. Do NOT add any explanation, commentary, or extra words. Do NOT continue the conversation. ONLY output the enhanced English version.'
    ].join('\n')
};

// Send a message to a room
app.post('/rooms/:roomId/messages', authenticate, async (req, res) => {
    const roomId = req.params.roomId;
    const userId = req.authUser.id;
    const { content } = req.body;
    if (!roomId || !userId || typeof content !== 'string' || !content.trim() || content.length > 2000) {
        return res.status(400).json({ error: '' });
    }
    try {
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(400).json({ error: '' });
        }

        // Allow if public, or if user is a participant
        if (!room.public && !room.participants.includes(userId)) {
            return res.status(400).json({ error: '' });
        }

        // Optionally: auto-add user to participants if public and not already in
        if (room.public && !room.participants.includes(userId)) {
            room.participants.push(userId);
            room.updatedAt = new Date();
            await room.save();
        }

        // Fetch last 10 messages for context (room only)
        const prevMessages = await ChatMessage.find({ roomId }).sort({ timestamp: 1 }).lean();
        const contextHistory = prevMessages.slice(-9).map(msg => ({ role: msg.role, content: msg.content }));
        const inputHistory = [
            roomSystemPrompt,
            ...contextHistory,
            {
                role: 'user',
                content: '[CURRENT USER MESSAGE TO TRANSLATE]: ' + content.trim()
            }
        ];

        // Get AI response
        const response = await openai.responses.create({
            model: 'gpt-5-chat-latest',
            input: inputHistory
        });

        // Store only the AI message
        const aiMessage = await ChatMessage.create({
            roomId,
            userId,
            role: 'user',
            content: response.output_text
        });
        room.updatedAt = new Date();
        await room.save();
        res.status(201).json({ message: aiMessage });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

// Fetch messages for a room
app.get('/rooms/:roomId/messages', authenticate, async (req, res) => {
    const roomId = req.params.roomId;
    const userId = req.authUser.id;
    if (!roomId || !userId) return res.status(400).json({ error: '' });
    try {
        const room = await Room.findById(roomId);
        if (!room) return res.status(400).json({ error: '' });
        // Allow if public, or if user is a participant
        if (!room.public && !room.participants.includes(userId)) {
            return res.status(400).json({ error: '' });
        }
        const messages = await ChatMessage.find({ roomId }).sort({ timestamp: 1 }).lean();
        res.status(200).json({ messages });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

// List rooms user can join or has joined
app.get('/rooms', authenticate, async (req, res) => {
    const userId = req.authUser.id;
    if (!userId) return res.status(400).json({ error: '' });
    try {
        // Find rooms where user is a participant
        const rooms = await Room.find({ participants: userId }).sort({ updatedAt: -1, createdAt: -1 }).lean();
        res.status(200).json({ rooms });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

// Join an existing room (open access for public rooms)
app.post('/rooms/:roomId/join', authenticate, async (req, res) => {
    const roomId = req.params.roomId;
    const userId = req.authUser.id;
    if (!roomId || !userId) return res.status(400).json({ error: '' });
    try {
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ error: '' });
        // Allow join if public, or already a participant
        if (room.public || room.participants.includes(userId)) {
            if (!room.participants.includes(userId)) {
                room.participants.push(userId);
                room.updatedAt = new Date();
                await room.save();
            }
            return res.status(200).json({ room });
        }
        // Not public and not a participant
        return res.status(400).json({ error: '' });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

// Create a new room (support public)
app.post('/rooms', authenticate, async (req, res) => {
    const { name, description, settings, public: isPublic } = req.body;
    const ownerId = req.authUser.id;
    if (!ownerId) return res.status(400).json({ error: '' });
    try {
        // Create room with owner as first participant
        const room = await Room.create({
            name: name || '',
            description: description || '',
            participants: [ownerId],
            ownerId,
            settings: settings || {},
            public: !!isPublic,
        });
        res.status(201).json({ room });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

// List all public rooms (open access)
app.get('/public-rooms', authenticate, async (req, res) => {
    try {
        const rooms = await Room.find({ public: true }).sort({ updatedAt: -1, createdAt: -1 }).lean();
        res.status(200).json({ rooms });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

app.delete('/messages/:messageId', authenticate, async (req, res) => {
  const messageId = req.params.messageId;
  const userId = req.authUser.id;
  if (!messageId || !userId) return res.status(400).json({ error: '' });
  try {
    const msg = await ChatMessage.findById(messageId);
    if (!msg) return res.status(404).json({ error: '' });
    if (String(msg.userId) !== String(userId)) return res.status(403).json({ error: '' });
    await ChatMessage.deleteOne({ _id: messageId });
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '' });
  }
});

// Temporary translation endpoint for frontend session-only translation
app.post('/translate-message', async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') return res.status(400).json({ error: '' });
    try {
        const prompt = [
            { role: 'developer', content: 'Translate the following English into natural Japanese. Respond ONLY with the Japanese translation.' },
            { role: 'user', content: text }
        ];
        const response = await openai.responses.create({
            model: 'gpt-5-chat-latest',
            input: prompt
        });
        res.status(200).json({ translation: response.output_text });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

// Update room description (and optionally name/settings) - owner only
app.patch('/rooms/:roomId', authenticate, async (req, res) => {
    const roomId = req.params.roomId;
    const userId = req.authUser.id;
    const { description, name, settings } = req.body;
    if (!roomId || !userId) return res.status(400).json({ error: '' });
    try {
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ error: '' });
        // Only allow owner to edit
        if (String(room.ownerId) !== String(userId)) return res.status(403).json({ error: '' });

        if (typeof description === 'string') room.description = description;
        // optionally name/settings
        // if (typeof name === 'string') room.name = name;
        // if (settings && typeof settings === 'object') room.settings = settings;

        room.updatedAt = new Date();
        await room.save();
        res.status(200).json({ room });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});


// Serve React app for all other routes (SPA fallback)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dist/index.html'));
});

module.exports = app;
