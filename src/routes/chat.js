const express = require('express');
const { OpenAI } = require('openai');
const Chat = require('../../models/Chat');
const ChatMessage = require('../../models/ChatMessage');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy' });

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
router.get('/chat-history', authenticate, async (req, res) => {
    const chatId = req.query.chatId;
    const userId = req.query.userId;
    if (!chatId || !userId) return res.status(400).json({ error: '' });
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

// Endpoint to get all chat IDs with their last message date and title
router.get('/chats-with-title', authenticate, async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: '' });
    if (!req.authUser || String(req.authUser.id) !== String(userId)) {
        return res.status(400).json({ error: '' });
    }
    try {
        const chats = await Chat.find({ userId: { $eq: userId } }).sort({ timestamp: -1 }).lean();
        res.status(200).json({ chats });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

// AI-powered input prediction endpoint
router.post('/writing-suggestions', async (req, res) => {
    const { context, input } = req.body;
    if (!isNonEmptyString(input, 2000) || !isStringMax(context, 5000)) {
        return res.status(400).json({ error: '' });
    }
    try {
        const safeInput = input.trim();
        const safeContext = String(context).slice(0, 5000);
        const suggestionPrompt = {
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
            input: [suggestionPrompt]
        });
        let suggestions = [];
        if (response.output_text) {
            suggestions = response.output_text.split(',').map(s => s.trim()).filter(Boolean);
        }
        res.status(200).json({ suggestions });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

// Main chat endpoint - allow anonymous users
router.post('/', async (req, res) => {
    const userMessage = req.body.message;
    let chatId = req.body.chatId;
    let userId = req.body.userId;
    if (!isNonEmptyString(userMessage, 2000)) return res.status(400).json({ error: '' });
    try {
        const safeMessage = userMessage.trim();
        if (!chatId) {
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
            const chatDoc = await Chat.create({ userId: userId || null, title: titleResponse.output_text });
            chatId = chatDoc._id;
        }

        const query = userId
            ? { chatId: { $eq: chatId }, userId: { $eq: userId } }
            : { chatId: { $eq: chatId } };
        const allMessages = await ChatMessage.find(query).sort({ timestamp: 1 }).lean();

        await ChatMessage.create({ chatId, userId: userId || null, role: 'user', content: safeMessage });

        const cleanedHistory = allMessages.map(msg => ({ role: msg.role, content: msg.content }));
        const inputHistory = [systemPrompt, ...cleanedHistory.slice(-19), { role: 'user', content: safeMessage }];

        const response = await openai.responses.create({
            model: 'gpt-5-chat-latest',
            input: inputHistory
        });

        await ChatMessage.create({ chatId, userId: userId || null, role: 'assistant', content: response.output_text });

        res.status(200).json({ reply: response.output_text, chatId });
    } catch (err) {
        res.status(500).json({ error: '' });
    }
});

module.exports = router;
