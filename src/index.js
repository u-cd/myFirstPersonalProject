const express = require('express');
const { OpenAI } = require('openai');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

let chatHistory = [
    {
        role: 'developer',
        content: [
            'You are ChatGPT, an AI English conversation tutor.',
            'Always format responses using markdown for readability.',
            'In every response, mix English and Japanese sentences so the user can learn English.'
        ].join('\n')
    }
];

// POST / for chatbot
app.post('/', async (req, res) => {
    const userMessage = req.body.message;
    if (!userMessage) return res.status(400).json({ error: 'Missing message' });
    chatHistory.push({ role: 'user', content: userMessage });
    try {
        const response = await openai.responses.create({
            model: 'gpt-3.5-turbo',
            input: chatHistory
        });
        chatHistory.push({ role: 'assistant', content: response.output_text });
        res.json({ reply: response.output_text });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
