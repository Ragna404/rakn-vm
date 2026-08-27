const { requireAuth } = require('./authMiddleware');
const { requireVmParams, validateSerialPort, SAFE_PARAM } = require('./validateMiddleware');
const { handleError } = require('./errorMiddleware');

module.exports = {
  requireAuth,
  requireVmParams,
  validateSerialPort,
  SAFE_PARAM,
  handleError,
};
