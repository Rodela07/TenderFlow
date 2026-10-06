import type { Requirement, Match, ExpiryDate, Status, StatusType } from '../types';

/**
 * Evaluate status for a single requirement.
 * Rules in evaluation order (first hit wins):
 * 1. No file matched AND mandatory -> "Missing" (BLOCKS)
 * 2. No file matched AND optional  -> "Not provided" (no block)
 * 3. File matched AND has_expiry AND no expiry entered -> "Expiry date needed" (BLOCKS)
 * 4. File matched AND has_expiry AND expiry < submission_deadline -> "Expired" (BLOCKS)
 * 5. Otherwise -> "OK" (no block)
 *
 * DATE RULE: expiry ON the same day as submission_deadline is OK.
 * Only strictly BEFORE the deadline is Expired. Compare date-only (YYYY-MM-DD).
 */
export function computeStatus(
  requirement: Requirement,
  matches: Match[],
  expiryDates: ExpiryDate[],
  submissionDeadline: string
): Status {
  const match = matches.find((m) => m.requirementId === requirement.id);
  const hasFile = !!match;

  if (!hasFile && requirement.mandatory) {
    return { type: 'missing', blocks: true };
  }
  if (!hasFile && !requirement.mandatory) {
    return { type: 'not_provided', blocks: false };
  }
  if (hasFile && requirement.has_expiry) {
    const expiryEntry = expiryDates.find((e) => e.requirementId === requirement.id);
    if (!expiryEntry || !expiryEntry.date || !expiryEntry.date.trim()) {
      return { type: 'expiry_needed', blocks: true };
    }
    
    // Normalize dates to YYYY-MM-DD for comparison
    const cleanDeadline = submissionDeadline.trim().slice(0, 10);
    const cleanExpiry = expiryEntry.date.trim().slice(0, 10);
    
    if (cleanExpiry < cleanDeadline) {
      return { type: 'expired', blocks: true };
    }
  }
  return { type: 'ok', blocks: false };
}

export function getStatusLabel(type: StatusType, lang: 'en' | 'bn'): string {
  const labels: Record<StatusType, { en: string; bn: string }> = {
    ok: { en: 'OK', bn: 'ঠিক আছে' },
    missing: { en: 'Missing', bn: 'অনুপস্থিত' },
    not_provided: { en: 'Not provided', bn: 'প্রদান করা হয়নি' },
    expiry_needed: { en: 'Expiry date needed', bn: 'মেয়াদ তারিখ প্রয়োজন' },
    expired: { en: 'Expired', bn: 'মেয়াদ শেষ' },
  };
  return labels[type][lang];
}

export function computeAllStatuses(
  requirements: Requirement[],
  matches: Match[],
  expiryDates: ExpiryDate[],
  submissionDeadline: string
): Map<string, Status> {
  const map = new Map<string, Status>();
  for (const req of requirements) {
    map.set(req.id, computeStatus(req, matches, expiryDates, submissionDeadline));
  }
  return map;
}
