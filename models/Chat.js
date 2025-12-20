const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    userId: { type: String, required: false, index: true }, // Supabase user.id, shared with ChatMessage
    title: { type: String, required: false, maxlength: 100 },
    timestamp: { type: Date, default: Date.now, index: true },
    // You can add more fields here later, e.g. createdAt, etc.
});

// Sort-by latest for a user's chats
chatSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Chat', chatSchema);
