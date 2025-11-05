const mongoose = require('mongoose');
const chatMessageSchema = new mongoose.Schema({
    chatId: String,
    userId: String, // Supabase user.id
    role: String,
    content: String,
    timestamp: { type: Date, default: Date.now },
    title: String // Optional: only set for the first assistant message in a chat
});
module.exports = mongoose.model('ChatMessage', chatMessageSchema);
