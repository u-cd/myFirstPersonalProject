const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    name: { type: String, required: false, maxlength: 100 },
    participants: [{ type: String, required: true }], // Supabase userIds
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    ownerId: { type: String, required: true }, // Supabase userId
    settings: { type: Object, required: false }, // For future AI/room config
    public: { type: Boolean, default: false }, // Public room flag
});

// Index for fast lookup by participant
roomSchema.index({ participants: 1, createdAt: -1 });

module.exports = mongoose.model('Room', roomSchema);
