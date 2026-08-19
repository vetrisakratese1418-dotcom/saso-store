export class AppError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  if (err.isOperational) {
    return res.status(err.statusCode).json({ message: err.message, details: err.details });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'File is too large. Maximum size is 5 MB.' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  }
  if (err.name === 'CastError' || err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  console.error('[error]', err);
  return res.status(500).json({ message: 'Something went wrong' });
}
