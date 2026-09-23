const mongoose = require('mongoose');

// SystemLog - an audit trail of important actions.
// Used by the admin on the Logs view. Not for continuous tracking.
const systemLogSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ['info', 'warn', 'error'],
      default: 'info',
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
    }, // e.g. "STUDENT_REGISTERED", "FACE_REGISTERED"
    message: { type: String, trim: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    targetType: { type: String, trim: true, default: null }, // e.g. "User", "Timetable"
    targetId: { type: String, trim: true, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

systemLogSchema.index({ createdAt: -1 });
systemLogSchema.index({ action: 1 });

module.exports = mongoose.model('SystemLog', systemLogSchema);