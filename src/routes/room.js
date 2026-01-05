const express = require('express');
const rateLimit = require('express-rate-limit');
const { OpenAI } = require('openai');
const Room = require('../../models/Room');
const ChatMessage = require('../../models/ChatMessage');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy' });

// Simple HTML sanitizer - strips all HTML tags / angle brackets
const sanitizeText = (text) => {
    if (typeof text !== 'string') return '';

    // Remove all angle brackets at the character level to avoid incomplete
    // multi-character sanitization issues that can occur with regex-based
    // tag stripping.
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '<' || ch === '>') {
            continue;
        }
        result += ch;
    }

    return result.trim();
};

// Stricter rate limiter for AI-powered endpoints (per user)
const aiRateLimiter = rateLimit({
    windowMs: 60_000, // 1 minute
    max: 30, // 30 requests per minute per user
    keyGenerator: (req) => req.authUser?.id || 'anonymous', // Rate limit by user ID only
    message: { error: 'Too many requests. Please wait a moment.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for room creation (prevent spam)
const roomCreationLimiter = rateLimit({
    windowMs: 60_000 * 60, // 1 hour
    max: 5, // 5 rooms per hour per user
    keyGenerator: (req) => req.authUser?.id || 'anonymous',
    message: { error: 'Too many rooms created. Please wait.' },
    standardHeaders: true,
    legacyHeaders: false,
});

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

// List rooms user can join or has joined
router.get('/', authenticate, async (req, res) => {
    const userId = req.authUser.id;
    if (!userId) return res.status(400).json({ error: '' });
    try {
        const rooms = await Room.find({ participants: userId }).sort({ updatedAt: -1, createdAt: -1 }).lean();
        res.status(200).json({ rooms });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

// Create a new room (with rate limiting)
router.post('/', authenticate, roomCreationLimiter, async (req, res) => {
    const { name, description, settings, public: isPublic } = req.body;
    const ownerId = req.authUser.id;
    
    // Sanitize inputs
    const safeName = sanitizeText(name);
    const safeDescription = sanitizeText(description || '');
    
    if (!ownerId || !safeName || safeName.length > 100 || safeDescription.length > 500) {
        return res.status(400).json({ error: '' });
    }
    try {
        const room = await Room.create({
            name: safeName,
            description: safeDescription,
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

// Send a message to a room (with AI rate limiting)
router.post('/:roomId/messages', authenticate, aiRateLimiter, async (req, res) => {
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

        if (!room.public && !room.participants.includes(userId)) {
            return res.status(400).json({ error: '' });
        }

        if (room.public && !room.participants.includes(userId)) {
            room.participants.push(userId);
            room.updatedAt = new Date();
            await room.save();
        }

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

        const response = await openai.responses.create({
            model: 'gpt-5-chat-latest',
            input: inputHistory
        });

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
router.get('/:roomId/messages', authenticate, async (req, res) => {
    const roomId = req.params.roomId;
    const userId = req.authUser.id;
    if (!roomId || !userId) return res.status(400).json({ error: '' });
    try {
        const room = await Room.findById(roomId);
        if (!room) return res.status(400).json({ error: '' });
        if (!room.public && !room.participants.includes(userId)) {
            return res.status(400).json({ error: '' });
        }
        const messages = await ChatMessage.find({ roomId }).sort({ timestamp: 1 }).lean();
        res.status(200).json({ messages });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

// Update room description (and optionally name/settings) - owner only
router.patch('/:roomId', authenticate, async (req, res) => {
    const roomId = req.params.roomId;
    const userId = req.authUser.id;
    const { description, name, settings } = req.body;
    
    // Sanitize description if provided
    const safeDescription = typeof description === 'string' ? sanitizeText(description) : undefined;
    
    if (!roomId || !userId ||
        (safeDescription !== undefined && safeDescription.length > 500)) {
        return res.status(400).json({ error: '' });
    }
    try {
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ error: '' });
        // Only allow owner to edit
        if (String(room.ownerId) !== String(userId)) return res.status(403).json({ error: '' });

        if (safeDescription !== undefined) room.description = safeDescription;
        // optionally name/settings
        // if (typeof name === 'string') room.name = sanitizeText(name);
        // if (settings && typeof settings === 'object') room.settings = settings;

        room.updatedAt = new Date();
        await room.save();
        res.status(200).json({ room });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

// List all public rooms (open access)
router.get('/public-rooms', authenticate, async (req, res) => {
    try {
        const rooms = await Room.find({ public: true }).sort({ updatedAt: -1, createdAt: -1 }).lean();
        res.status(200).json({ rooms });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

// Delete a room message
router.delete('/messages/:messageId', authenticate, async (req, res) => {
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

// Translate message to Japanese (with AI rate limiting)
router.post('/translate-message', authenticate, aiRateLimiter, async (req, res) => {
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

module.exports = router;
