/**
 * Validation Middleware
 * Validates request parameters and prevents injection/traversal attacks.
 */

const SAFE_PARAM = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}$/;

function requireVmParams(req, res, next) {
  const { project, zone, instance } = req.query;
  if (!project || !zone || !instance) {
    return res.status(400).json({
      error: 'Missing required query params: project, zone, instance',
    });
  }

  if (![project, zone, instance].every((p) => SAFE_PARAM.test(p))) {
    return res.status(400).json({
      error: 'Invalid parameter format. Use alphanumeric, hyphens, underscores only (1-63 chars)',
    });
  }

  req.vmParams = { project, zone, instance };
  next();
}

function validateSerialPort(req, res, next) {
  const port = parseInt(req.query.port, 10) || 1;
  if (port < 1 || port > 4) {
    return res.status(400).json({ error: 'Port must be between 1 and 4' });
  }
  req.serialPort = port;
  next();
}

module.exports = { requireVmParams, validateSerialPort, SAFE_PARAM };
