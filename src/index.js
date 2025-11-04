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
        'You are an AI English conversation tutor.',
        'Always format responses using markdown for readability.',
        'In every response, mix English and Japanese sentences so the user can learn English.',
        "First, suggest a more beautiful version of the user's English, then continue the conversation."
    ].join('\n')
};

// Temporary route to serve login.html for testing
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Endpoint to get all messages for a chatId
app.get('/chat-history', async (req, res) => {
    const chatId = req.query.chatId;
    if (!chatId) return res.status(400).json({ error: 'Missing chatId' });
    try {
        const messages = await ChatMessage.find({ chatId }).sort({ timestamp: 1 }).lean();
        res.json({ messages });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to get all chat IDs with their last message date, sorted by date descending
app.get('/chats-with-last-date-and-title', async (req, res) => {
    try {
        // Get all unique chatIds
        const chatIds = await ChatMessage.distinct('chatId');
        // For each chatId, get its last message timestamp and title (from first assistant message)
        const chatInfos = await Promise.all(chatIds.map(async chatId => {
            const lastMsg = await ChatMessage.findOne({ chatId }).sort({ timestamp: -1 }).lean();
            // Find the first assistant message with a title for this chat
            const titleMsg = await ChatMessage.findOne({ chatId, role: 'assistant', title: { $exists: true, $ne: null } }).sort({ timestamp: 1 }).lean();
            return {
                chatId,
                lastDate: lastMsg && lastMsg.timestamp ? lastMsg.timestamp : null,
                title: titleMsg && titleMsg.title ? titleMsg.title : null
            };
        }));
        // Sort by lastDate descending (newest first)
        chatInfos.sort((a, b) => {
            if (!a.lastDate) return 1;
            if (!b.lastDate) return -1;
            return new Date(b.lastDate) - new Date(a.lastDate);
        });
        res.json({ chats: chatInfos });
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

        // Get all messages for this chatId
        const allMessages = await ChatMessage.find({ chatId }).sort({ timestamp: 1 }).lean();

        // Prepare context for LLM
        const cleanedHistory = allMessages.map(msg => ({ role: msg.role, content: msg.content }));
        const inputHistory = [systemPrompt, ...cleanedHistory.slice(-20)];

        // Debug: log history and inputHistory
        console.log('Input history for LLM:', inputHistory);

        // Get assistant response
        const response = await openai.responses.create({
            model: 'gpt-5-chat-latest',
            input: inputHistory
        });

        // Save assistant response to DB
        const assistantMsg = await ChatMessage.create({ chatId, role: 'assistant', content: response.output_text });

        // If this is the first exchange (user + assistant), generate a chat title
        if (allMessages.length === 1) {
            // Use both user and assistant first message for title
            const titlePrompt = [
                {
                    role: 'developer',
                    content: 'Generate a short, descriptive chat title (max 8 words) based on the following user and assistant messages. Respond ONLY with the title.'
                },
                { role: 'user', content: userMessage },
                { role: 'assistant', content: response.output_text }
            ];
            const titleResponse = await openai.responses.create({
                model: 'gpt-5-chat-latest',
                input: titlePrompt
            });
            // Save title to the first assistant message for this chat
            await ChatMessage.updateOne(
                { _id: assistantMsg._id },
                { $set: { title: titleResponse.output_text } }
            );
        }

        res.json({ reply: response.output_text });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
