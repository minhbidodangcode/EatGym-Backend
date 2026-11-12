import dotenv from 'dotenv';

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required. Copy .env.example to .env and configure it.`);
  }
  return value;
}

function positivePort(value) {
  const port = Number.parseInt(value ?? '3000', 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return port;
}

const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long.');
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: positivePort(process.env.PORT),
  databaseUrl: required('DATABASE_URL'),
  databaseSsl: process.env.DATABASE_SSL === 'true',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '90d',
  jwtIssuer: process.env.JWT_ISSUER ?? 'eatgym-api',
  jwtAudience: process.env.JWT_AUDIENCE ?? 'eatgym-mobile'
});
