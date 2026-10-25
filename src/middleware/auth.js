import { ApiError } from '../errors.js';
import { verifyAccessToken } from '../auth/jwt.js';
import { pool } from '../db/pool.js';

export async function requireAuth(req, _res, next) {
  const authorization = req.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    next(new ApiError(401, 'A Bearer access token is required.', 'UNAUTHENTICATED'));
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    next(new ApiError(401, 'A Bearer access token is required.', 'UNAUTHENTICATED'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    if (typeof payload.sub !== 'string') {
      throw new Error('Missing subject');
    }

    const result = await pool.query(
      `SELECT id, email, full_name, role, is_active, created_at
       FROM users WHERE id = $1`,
      [payload.sub]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) {
      next(new ApiError(401, 'The account is unavailable.', 'UNAUTHENTICATED'));
      return;
    }

    req.auth = {
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      createdAt: user.created_at
    };
    next();
  } catch (error) {
    if (error instanceof ApiError || error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
      next(new ApiError(401, 'The access token is invalid or expired.', 'UNAUTHENTICATED'));
      return;
    }
    next(error);
  }
}

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.auth || !allowedRoles.includes(req.auth.role)) {
      next(new ApiError(403, 'You do not have permission to perform this action.', 'FORBIDDEN'));
      return;
    }
    next();
  };
}


export async function optionalAuth(req, _res, next) {
  const authorization = req.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return next();
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    if (typeof payload.sub === 'string') {
      const result = await pool.query(
        `SELECT id, email, full_name, role, is_active, created_at
         FROM users WHERE id = $1`,
        [payload.sub]
      );
      const user = result.rows[0];
      if (user && user.is_active) {
        req.auth = {
          userId: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          createdAt: user.created_at
        };
      }
    }
  } catch (_) {}
  next();
}
