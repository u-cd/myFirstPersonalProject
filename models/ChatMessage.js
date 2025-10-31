const mongoose = require('mongoose');
const chatMessageSchema = new mongoose.Schema({
    chatId: String,
    role: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('ChatMessage', chatMessageSchema);
