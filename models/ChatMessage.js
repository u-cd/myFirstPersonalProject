const mongoose = require('mongoose');
const chatMessageSchema = new mongoose.Schema({
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    userId: String, // Supabase user.id
    role: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('ChatMessage', chatMessageSchema);
