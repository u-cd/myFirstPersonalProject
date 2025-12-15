const mongoose = require('mongoose');
const chatMessageSchema = new mongoose.Schema({
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    userId: { type: String, required: false, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 2000 },
    timestamp: { type: Date, default: Date.now, index: true }
});

// Compound index to optimize common queries and reduce scan cost
chatMessageSchema.index({ chatId: 1, userId: 1, timestamp: 1 });
module.exports = mongoose.model('ChatMessage', chatMessageSchema);
