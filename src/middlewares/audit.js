const AuditLog = require('../models/AuditLog');

const auditLog = (action) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Guardar log después de la respuesta exitosa
      if (res.statusCode < 400) {
        AuditLog.create({
          user_id: req.userId,
          action,
          entity_type: req.body?.entity_type,
          entity_id: req.body?.entity_id || req.params?.id,
          old_values: req.body?.old_values,
          new_values: req.body?.new_values,
          ip_address: req.ip,
          user_agent: req.get('user-agent')
        }).catch(err => console.error('Audit log error:', err));
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = auditLog;