/**
 * Authentication Middleware
 * Validates presence of Authorization Bearer header.
 */

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  next();
}

module.exports = { requireAuth };
