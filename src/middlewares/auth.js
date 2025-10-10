const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const motoOnly = (req, res, next) => {
  if (req.user.role !== 'moto') {
    return res.status(403).json({ error: 'Moto access required' });
  }
  next();
};

const localOnly = (req, res, next) => {
  if (req.user.role !== 'local') {
    return res.status(403).json({ error: 'Local access required' });
  }
  next();
};

const hasPermission = (permission) => {
  return (req, res, next) => {
    if (req.user.role === 'admin' || req.user.delegated_permissions?.includes(permission)) {
      next();
    } else {
      res.status(403).json({ error: 'Permission denied' });
    }
  };
};

module.exports = { 
  auth, 
  adminOnly, 
  motoOnly, 
  localOnly,
  hasPermission 
};