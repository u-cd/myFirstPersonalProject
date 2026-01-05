const mongoose = require('mongoose');
const chatMessageSchema = new mongoose.Schema({
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: false, index: true }, // legacy/private
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: false, index: true }, // new group chat
    userId: { type: String, required: false, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 2000 },
    timestamp: { type: Date, default: Date.now, index: true }
});

// Compound indexes for both chatId and roomId queries
chatMessageSchema.index({ chatId: 1, userId: 1, timestamp: 1 });
chatMessageSchema.index({ roomId: 1, userId: 1, timestamp: 1 });
module.exports = mongoose.model('ChatMessage', chatMessageSchema);
