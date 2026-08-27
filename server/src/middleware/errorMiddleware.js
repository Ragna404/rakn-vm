/**
 * Error Handling Middleware
 * Centralizes error responses and masks internal details in production.
 */

function handleError(res, err) {
  const status = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const message = (isProduction && status === 500)
    ? 'Internal server error'
    : (err.message || 'An unexpected error occurred');
  res.status(status).json({ error: message });
}

module.exports = { handleError };
