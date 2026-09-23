const mongoose = require('mongoose');

// A specific classroom/room, e.g. A204 (Block A, Floor 2)
const classroomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: [true, 'Room code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    }, // e.g. "A204"
    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Building',
      required: [true, 'Building reference is required'],
    },
    floor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Floor',
      required: [true, 'Floor reference is required'],
    },
    name: { type: String, trim: true }, // optional friendly name e.g. "Computer Lab"
    capacity: { type: Number, min: 1, default: 60 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Classroom', classroomSchema);