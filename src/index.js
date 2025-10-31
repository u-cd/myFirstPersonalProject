const express = require('express');
const { OpenAI } = require('openai');
const path = require('path');
const mongoose = require('mongoose');
const ChatMessage = require('../models/ChatMessage');
const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const { v4: uuidv4 } = require('uuid');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
app.use(express.json());
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

// Endpoint to start a new chat and generate a chatId
app.post('/newchat', (req, res) => {
    const chatId = uuidv4();
    res.json({ chatId });
});

// Endpoint to get all chat IDs
app.get('/chats', async (req, res) => {
    try {
        const chatIds = await ChatMessage.distinct('chatId');
        res.json({ chatIds });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST / for chatbot
app.post('/', async (req, res) => {
    const userMessage = req.body.message;
    const chatId = req.body.chatId;
    if (!userMessage || !chatId) return res.status(400).json({ error: 'Missing message or chatId' });
    try {
        // Save user message to DB
        await ChatMessage.create({ chatId, role: 'user', content: userMessage });

        // Get last 20 messages for this chatId from DB (for context)
        const history = await ChatMessage.find({ chatId }).sort({ timestamp: -1 }).limit(20).lean();
        const cleanedHistory = history.map(msg => ({ role: msg.role, content: msg.content }));
        const inputHistory = [systemPrompt, ...cleanedHistory.reverse()];

        // Debug: log history and inputHistory
        console.log('Input history for LLM:', inputHistory);

        const response = await openai.responses.create({
            model: 'gpt-5-chat-latest',
            input: inputHistory
        });

        // Save assistant response to DB
        await ChatMessage.create({ chatId, role: 'assistant', content: response.output_text });
        res.json({ reply: response.output_text });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
