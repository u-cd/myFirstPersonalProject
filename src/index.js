const express = require('express');
const { OpenAI } = require('openai');
const path = require('path');
const mongoose = require('mongoose');
const ChatMessage = require('../models/ChatMessage');
const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
        'You are ChatGPT, an AI English conversation tutor.',
        'Always format responses using markdown for readability.',
        'In every response, mix English and Japanese sentences so the user can learn English.',
        "Please translate the user's message into natural, fluent English and suggest better ways to express their ideas."
    ].join('\n')
};

// POST / for chatbot
app.post('/', async (req, res) => {
    const userMessage = req.body.message;
    if (!userMessage) return res.status(400).json({ error: 'Missing message' });
    try {
        // Save user message to DB
        await ChatMessage.create({ role: 'user', content: userMessage });

        // Get last 20 messages from DB (for context)
        const history = await ChatMessage.find().sort({ timestamp: -1 }).limit(20).lean();
        const cleanedHistory = history.map(msg => ({ role: msg.role, content: msg.content }));
        const inputHistory = [systemPrompt, ...cleanedHistory.reverse()];

        // Debug: log history and inputHistory
        console.log('Raw history from MongoDB:', history);
        console.log('Input history for LLM:', inputHistory);

        const response = await openai.responses.create({
            model: 'gpt-5-chat-latest',
            input: inputHistory
        });

        // Save assistant response to DB
        await ChatMessage.create({ role: 'assistant', content: response.output_text });
        res.json({ reply: response.output_text });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
