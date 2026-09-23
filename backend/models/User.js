const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Single User model for the three roles: student, teacher, admin.
 * A person belongs to ONE role. Passwords are always hashed with bcrypt.
 */
const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      required: [true, 'Role is required'],
      index: true,
    },

    // --- STUDENT ONLY fields ---
    studentId: {
      type: String,
      unique: true, // creates a unique index automatically
      sparse: true, // allows empty/null for non-students
      trim: true,
      uppercase: true,
    },
    department: { type: String, trim: true }, // e.g. CSE
    year: { type: String, trim: true },       // e.g. 3rd Year
    section: { type: String, trim: true },    // e.g. A

    // --- TEACHER ONLY field ---
    teacherId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    // --- COMMON fields ---
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    phone: { type: String, trim: true },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never return password by default
    },

    isActive: { type: Boolean, default: true },

    // Private QR token - a random safe identifier used ONLY for identity.
    // It is sendable to the QR code. NOT a password, no personal data.
    qrToken: { type: String, unique: true, sparse: true },

    faceRegistered: { type: Boolean, default: false },

    settings: {
      collegeLat: { type: Number, default: 0 },
      collegeLng: { type: Number, default: 0 },
      geofenceRadius: { type: Number, default: 100 },
    },
  },
  { timestamps: true }
);

// Hash password before saving (only when password changed)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare a plain password against the stored hash
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Sign a JWT for this user
userSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '7d' }
  );
};

// Public-safe representation (no password, no extra sensitive data)
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);