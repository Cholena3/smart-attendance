import crypto from 'crypto';

const ROTATION_INTERVAL = 30; // seconds

/**
 * Generate a time-based token for a session.
 * Changes every ROTATION_INTERVAL seconds.
 * Uses HMAC-SHA256 with session code as key and time slot as data.
 */
export function generateRotatingToken(sessionCode, secret) {
  const timeSlot = Math.floor(Date.now() / (ROTATION_INTERVAL * 1000));
  const hmac = crypto.createHmac('sha256', secret + sessionCode);
  hmac.update(String(timeSlot));
  return hmac.digest('hex').slice(0, 8).toUpperCase();
}

/**
 * Validate a token — check current slot and previous slot (grace period)
 */
export function validateRotatingToken(token, sessionCode, secret) {
  const now = Math.floor(Date.now() / (ROTATION_INTERVAL * 1000));
  for (let offset = 0; offset <= 1; offset++) {
    const timeSlot = now - offset;
    const hmac = crypto.createHmac('sha256', secret + sessionCode);
    hmac.update(String(timeSlot));
    const expected = hmac.digest('hex').slice(0, 8).toUpperCase();
    if (token.toUpperCase() === expected) return true;
  }
  return false;
}

export { ROTATION_INTERVAL };
