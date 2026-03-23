/**
 * Simple browser-based device fingerprint.
 * Combines screen, navigator, and timezone info into a hash.
 * Not bulletproof, but catches the obvious case of one phone marking for two students.
 */
export async function getDeviceFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.maxTouchPoints || 0,
  ];

  const raw = components.join('|');
  // Use SubtleCrypto for hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
