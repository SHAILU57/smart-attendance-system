const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes: requires a valid "Bearer <token>" header.
 * Attaches the full user document to req.user.
 */
const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please log in first.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Account no longer exists. Please log in again.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Contact the admin.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.',
    });
  }
};

/**
 * Authorize roles: pass the allowed roles.
 * Usage: authorize('teacher', 'admin')
 */
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission (${req.user?.role}) to access this resource. Allowed roles: ${roles.join(', ')}`,
      });
    }
    next();
  };

module.exports = { protect, authorize };