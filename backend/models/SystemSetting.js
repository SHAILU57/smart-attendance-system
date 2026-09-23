const mongoose = require('mongoose');

// Central configuration singleton for the whole system.
// Stored as a single document so all clients read the same values.
const systemSettingSchema = new mongoose.Schema(
  {
    // College GPS (campus area only - never used for indoor claims)
    collegeLat: { type: Number, default: 0 },
    collegeLng: { type: Number, default: 0 },
    geofenceRadius: { type: Number, default: 100 }, // meters

    // Attendance verification policy
    // rejectOutsideGeoFence: if true, student OUTSIDE the college is rejected
    rejectOutsideGeoFence: { type: Boolean, default: true },
    // rejectWrongLocation: if true, wrong building/floor/room rejects attendance
    rejectWrongLocation: { type: Boolean, default: true },

    // Demo indoor location mode flag
    demoIndoorMode: { type: Boolean, default: false },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);