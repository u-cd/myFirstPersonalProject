const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    // chatId removed; use _id as the identifier
    userId: { type: String, required: false }, // Supabase user.id, shared with ChatMessage
    title: { type: String, required: false },
    timestamp: { type: Date, default: Date.now },
    // You can add more fields here later, e.g. createdAt, etc.
});

module.exports = mongoose.model('Chat', chatSchema);
