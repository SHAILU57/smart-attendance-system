const mongoose = require('mongoose');

/**
 * FaceTemplate - stores ONLY the numeric face embedding (128-dim descriptor)
 * produced by the browser face-recognition model.
 *
 * Privacy design:
 *  - No raw photos are stored (the requirement says avoid unnecessary storing).
 *  - Only the mathematical template needed to compare faces is kept.
 *  - Access control: a student can view/update only their own template.
 */
const faceTemplateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      unique: true,
    },
    descriptor: {
      type: [Number],
      required: [true, 'Face descriptor is required'],
    },
    model: {
      type: String,
      default: 'face-api.js tiny_face_detector + face_recognition_net',
    },
    descriptorLength: { type: Number, default: 128 },
    // detection confidence of the captured sample (informational only)
    detectionScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FaceTemplate', faceTemplateSchema);