const mongoose = require('mongoose');

// A floor inside a building, e.g. Block A - Floor 2
const floorSchema = new mongoose.Schema(
  {
    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Building',
      required: [true, 'Building reference is required'],
    },
    floorNumber: {
      type: String,
      required: [true, 'Floor number is required'],
      trim: true,
    }, // "1", "2", "3"
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// A building can only have one floor with the same number
floorSchema.index({ building: 1, floorNumber: 1 }, { unique: true });

module.exports = mongoose.model('Floor', floorSchema);