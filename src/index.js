const express = require('express');
const { OpenAI } = require('openai');
const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());


app.route('/')
    .get((req, res) => res.json({ message: 'Its ok.' }))
    .post(async (req, res) => {
        const userMessage = req.body.message;
        if (!userMessage) return res.status(400).json({ error: 'Missing message' });
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-5',
                messages: [{ role: 'user', content: userMessage }]
            });
            res.json({ reply: completion.choices[0].message.content });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

app.listen(port, () => console.log(`Server listening on port ${port}`));
