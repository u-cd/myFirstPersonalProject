// on the docker, dotenv no need
// require('dotenv').config();
const express = require('express');
const { OpenAI } = require('openai');
const path = require('path');
const mongoose = require('mongoose');
const ChatMessage = require('../models/ChatMessage');
const Chat = require('../models/Chat');
const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

app.use(express.json());
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

// Endpoint to get all messages for a chatId
app.get('/chat-history', async (req, res) => {
    const chatId = req.query.chatId; // This should be the Chat _id
    const userId = req.query.userId;
    if (!chatId || !userId) return res.status(400).json({ error: 'Missing chatId or userId' });
    try {
        const messages = await ChatMessage.find({ chatId, userId }).sort({ timestamp: 1 }).lean();
        res.json({ messages });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to get all chat IDs with their last message date and title (only userId's), sorted by date descending
app.get('/chats-with-title', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    try {
        // Get all chats for this user, ordered by timestamp descending (newest first)
        const chats = await Chat.find({ userId }).sort({ timestamp: -1 }).lean();
        res.json({ chats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST / for chatbot
// AI-powered input prediction endpoint
app.post('/writing-suggestions', async (req, res) => {
    const { context, input } = req.body;
    // context: last LLM message as string (no role), input: current user input as string
    if (typeof input !== 'string' || typeof context !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid input/context' });
    }
    // Debug: log actual context and input
    console.log('--- writing-suggestions request ---');
    console.log('context:', context);
    console.log('input:', input);
    try {
        // Compose OpenAI input: system prompt, context, and input as plain strings
        const systemPrompt = {
            role: 'developer',
            content: [
                "You are an autocomplete engine for a chat app.",
                "This is the last message from the chat: \"" + context + "\".",
                "This is the user's unfinished input: \"" + input + "\".",
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
        res.json({ suggestions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/', async (req, res) => {
    const userMessage = req.body.message;
    let chatId = req.body.chatId; // This should be the Chat _id or null
    const userId = req.body.userId; // Optional - can be null for logged-out users
    if (!userMessage) return res.status(400).json({ error: 'Missing message' });
    try {
        // If chatId is null, create a new chat and use its _id
        if (!chatId) {
            // Generate chat title
            const titlePrompt = [
                {
                    role: 'developer',
                    content: 'Generate a short, descriptive chat title (max 8 words) based on the following user message. Respond ONLY with the title.'
                },
                { role: 'user', content: userMessage }
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
        await ChatMessage.create({ chatId, userId: userId || null, role: 'user', content: userMessage });

        // Prepare context for LLM
        const cleanedHistory = allMessages.map(msg => ({ role: msg.role, content: msg.content }));
        const inputHistory = [systemPrompt, ...cleanedHistory.slice(-19), { role: 'user', content: userMessage }];

        // Get assistant response
        const response = await openai.responses.create({
            model: 'gpt-5-chat-latest',
            input: inputHistory
        });

        // Save assistant response to DB
        await ChatMessage.create({ chatId, userId: userId || null, role: 'assistant', content: response.output_text });

        res.json({ reply: response.output_text, chatId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve React app for all other routes (SPA fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dist/index.html'));
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
