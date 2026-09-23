const mongoose = require('mongoose');

// A physical building on campus, e.g. "Block A", "Block B"
const buildingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Building name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Building code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    }, // e.g. "A", "B"
    description: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Building', buildingSchema);