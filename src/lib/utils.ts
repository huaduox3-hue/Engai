import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculates remaining trial days in a robust way
 * Support Firestore Timestamp, JS Date, string, or object with seconds
 */
export function calculateTrialDays(expiresAttr: any): number {
  if (!expiresAttr) return 0;
  
  let expiresMillis = 0;
  if (typeof expiresAttr.toMillis === 'function') {
    expiresMillis = expiresAttr.toMillis();
  } else if (expiresAttr instanceof Date) {
    expiresMillis = expiresAttr.getTime();
  } else if (typeof expiresAttr === 'string' || typeof expiresAttr === 'number') {
    const d = new Date(expiresAttr);
    expiresMillis = isNaN(d.getTime()) ? 0 : d.getTime();
  } else if (expiresAttr.seconds) {
    expiresMillis = expiresAttr.seconds * 1000;
  } else if (expiresAttr.toDate && typeof expiresAttr.toDate === 'function') {
    expiresMillis = expiresAttr.toDate().getTime();
  }
  
  if (!expiresMillis) return 0;
  const now = Date.now();
  const diff = expiresMillis - now;
  
  // Return the number of full/partial days remaining
  // Math.ceil ensures that if there's even 1 second left, it shows "1 day"
  // If user started a 7 day trial 1 minute ago, diff is ~6.99 days, ceil is 7.
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
