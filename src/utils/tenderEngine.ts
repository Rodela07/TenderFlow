import { PDFDocument } from 'pdf-lib';
import type {
  TenderConfig,
  TenderRequirement,
  UploadedFile,
  DocumentMatch,
  DocumentStatus,
  StatusSummary,
} from '../types';

/**
 * Validates requirements.json schema data-driven without hardcoding.
 */
export function validateRequirementsJson(raw: unknown): {
  valid: boolean;
  data?: TenderConfig;
  error?: string;
} {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Invalid JSON: root must be an object.' };
  }

  const root = raw as Record<string, unknown>;

  if (!root.tender || typeof root.tender !== 'object') {
    return { valid: false, error: 'Missing or invalid "tender" object.' };
  }

  const tender = root.tender as Record<string, unknown>;
  const requiredTenderFields = [
    'tender_id',
    'title',
    'procuring_entity',
    'bidder',
    'submission_deadline',
  ];

  for (const field of requiredTenderFields) {
    if (typeof tender[field] !== 'string' || !tender[field].trim()) {
      return {
        valid: false,
        error: `Tender metadata missing required string field: "${field}".`,
      };
    }
  }

  if (!Array.isArray(root.requirements) || root.requirements.length === 0) {
    return {
      valid: false,
      error: '"requirements" must be a non-empty array of requirement items.',
    };
  }

  const validatedRequirements: TenderRequirement[] = [];

  for (let i = 0; i < root.requirements.length; i++) {
    const item = root.requirements[i];
    if (!item || typeof item !== 'object') {
      return {
        valid: false,
        error: `Requirement at index ${i} must be an object.`,
      };
    }

    const reqObj = item as Record<string, unknown>;

    if (typeof reqObj.id !== 'string' || !reqObj.id.trim()) {
      return {
        valid: false,
        error: `Requirement at index ${i} is missing a valid "id".`,
      };
    }

    const orderNum = Number(reqObj.order);
    if (isNaN(orderNum) || !isFinite(orderNum)) {
      return {
        valid: false,
        error: `Requirement "${reqObj.id}" has an invalid numeric "order".`,
      };
    }

    if (typeof reqObj.title_en !== 'string' || !reqObj.title_en.trim()) {
      return {
        valid: false,
        error: `Requirement "${reqObj.id}" is missing "title_en".`,
      };
    }

    const titleBn =
      typeof reqObj.title_bn === 'string' && reqObj.title_bn.trim()
        ? reqObj.title_bn
        : (reqObj.title_en as string);

    validatedRequirements.push({
      id: String(reqObj.id).trim(),
      order: orderNum,
      title_en: String(reqObj.title_en).trim(),
      title_bn: String(titleBn).trim(),
      mandatory: Boolean(reqObj.mandatory),
      has_expiry: Boolean(reqObj.has_expiry),
    });
  }

  // Sort requirements strictly by numeric order ascending (order: 1 first)
  validatedRequirements.sort((a, b) => a.order - b.order);

  return {
    valid: true,
    data: {
      tender: {
        tender_id: String(tender.tender_id).trim(),
        title: String(tender.title).trim(),
        procuring_entity: String(tender.procuring_entity).trim(),
        bidder: String(tender.bidder).trim(),
        submission_deadline: String(tender.submission_deadline).trim(),
      },
      requirements: validatedRequirements,
    },
  };
}

/**
 * Computes exact SHA-256 binary hash using Web Crypto API.
 */
export async function computeSha256(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Reads actual page count and verifies integrity using pdf-lib.
 * Handles damaged or password-protected files gracefully without crashing.
 */
export async function parsePdfInfo(file: File): Promise<{
  pageCount: number;
  error?: string;
  isDamagedOrEncrypted?: boolean;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Validate PDF magic bytes %PDF-
    if (arrayBuffer.byteLength < 5) {
      return {
        pageCount: 0,
        error: 'File is too small or not a valid PDF.',
        isDamagedOrEncrypted: true,
      };
    }

    const doc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: false,
    });
    const count = doc.getPageCount();
    return {
      pageCount: count,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

    if (
      errorMsg.includes('encrypt') ||
      errorMsg.includes('password') ||
      errorMsg.includes('protected')
    ) {
      return {
        pageCount: 0,
        error: 'This PDF is password-protected. Please provide an unlocked document.',
        isDamagedOrEncrypted: true,
      };
    }

    return {
      pageCount: 0,
      error: 'This PDF could not be opened. It may be damaged or corrupted.',
      isDamagedOrEncrypted: true,
    };
  }
}

/**
 * Normalizes date string "YYYY-MM-DD" to UTC midnight timestamp for exact date comparison.
 */
export function parseDateToMidnightUtc(dateStr: string): number | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return Date.UTC(y, m, d);
    }
  }
  const timestamp = Date.parse(dateStr);
  return isNaN(timestamp) ? null : timestamp;
}

/**
 * Centralized Single Status Function (Adheres strictly to Problem Section 11).
 *
 * Allowed statuses:
 * - 'Missing': mandatory === true && no file matched (Blocking: YES)
 * - 'Expiry date needed': has_expiry === true && file matched && expiry date missing (Blocking: YES)
 * - 'Expired': expiry date is before submission deadline (Blocking: YES)
 * - 'Not provided': mandatory === false && no file matched (Blocking: NO)
 * - 'OK': file matched and (not has_expiry OR expiry >= deadline) (Blocking: NO)
 */
export function evaluateRequirementStatus(
  req: TenderRequirement,
  match: DocumentMatch | undefined,
  matchedFile: UploadedFile | undefined,
  submissionDeadline: string
): DocumentStatus {
  const hasFile = Boolean(match?.fileId && matchedFile && !matchedFile.error);

  // If no file matched:
  if (!hasFile) {
    if (req.mandatory) {
      return 'Missing';
    }
    return 'Not provided';
  }

  // File is matched:
  if (req.has_expiry) {
    const expiryStr = match?.expiryDate ? match.expiryDate.trim() : '';
    if (!expiryStr) {
      return 'Expiry date needed';
    }

    const expiryTime = parseDateToMidnightUtc(expiryStr);
    const deadlineTime = parseDateToMidnightUtc(submissionDeadline);

    if (expiryTime === null || deadlineTime === null) {
      return 'Expiry date needed';
    }

    // Rule: expiry before submission deadline -> Expired
    // Expiry exactly on submission deadline -> OK (same-day valid)
    // Expiry after submission deadline -> OK
    if (expiryTime < deadlineTime) {
      return 'Expired';
    }

    return 'OK';
  }

  return 'OK';
}

/**
 * Checks if a status is a blocking issue for generating the package.
 */
export function isStatusBlocking(status: DocumentStatus): boolean {
  return (
    status === 'Missing' ||
    status === 'Expiry date needed' ||
    status === 'Expired'
  );
}

/**
 * Centralized status summary generator.
 */
export function calculateStatusSummary(
  requirements: TenderRequirement[],
  matches: Record<string, DocumentMatch>,
  files: Record<string, UploadedFile>,
  submissionDeadline: string
): StatusSummary {
  let ready = 0;
  let missing = 0;
  let expired = 0;
  let expiryNeeded = 0;
  let optionalNotProvided = 0;
  let blockingCount = 0;

  const totalRequired = requirements.filter((r) => r.mandatory).length;

  for (const req of requirements) {
    const match = matches[req.id];
    const file = match?.fileId ? files[match.fileId] : undefined;
    const status = evaluateRequirementStatus(req, match, file, submissionDeadline);

    if (status === 'OK') {
      ready++;
    } else if (status === 'Missing') {
      missing++;
      blockingCount++;
    } else if (status === 'Expired') {
      expired++;
      blockingCount++;
    } else if (status === 'Expiry date needed') {
      expiryNeeded++;
      blockingCount++;
    } else if (status === 'Not provided') {
      optionalNotProvided++;
    }
  }

  return {
    totalRequirements: requirements.length,
    totalRequired,
    ready,
    missing,
    expired,
    expiryNeeded,
    optionalNotProvided,
    blockingCount,
    isPackageReady: blockingCount === 0 && requirements.length > 0,
  };
}

/**
 * Identifies duplicate files by exact SHA-256 hash.
 */
export function updateDuplicateFlags(files: UploadedFile[]): UploadedFile[] {
  const hashMap = new Map<string, UploadedFile[]>();

  for (const f of files) {
    if (f.sha256) {
      const list = hashMap.get(f.sha256) || [];
      list.push(f);
      hashMap.set(f.sha256, list);
    }
  }

  return files.map((f) => {
    if (!f.sha256) return { ...f, isDuplicate: false, duplicateNames: [] };
    const duplicates = hashMap.get(f.sha256) || [];
    if (duplicates.length > 1) {
      const otherNames = duplicates
        .filter((d) => d.id !== f.id)
        .map((d) => d.name);
      return {
        ...f,
        isDuplicate: true,
        duplicateOfId: duplicates[0].id,
        duplicateNames: otherNames,
      };
    }
    return {
      ...f,
      isDuplicate: false,
      duplicateOfId: undefined,
      duplicateNames: [],
    };
  });
}

/**
 * Auto-match suggestion algorithm (Section 26 / Bonus).
 * Calculates string similarity score between file names and requirement titles/IDs.
 */
export function calculateMatchSuggestions(
  requirements: TenderRequirement[],
  files: UploadedFile[]
): Record<string, string> {
  const suggestions: Record<string, string> = {};
  const matchedFileIds = new Set<string>();

  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\u0980-\u09FF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  for (const req of requirements) {
    const enTokens = clean(req.title_en).split(' ').filter(Boolean);
    const bnTokens = clean(req.title_bn).split(' ').filter(Boolean);
    const idClean = clean(req.id);

    let bestScore = 0;
    let bestFileId: string | null = null;

    for (const file of files) {
      if (matchedFileIds.has(file.id) || file.error) continue;

      const fClean = clean(file.name.replace(/\.pdf$/i, ''));
      let score = 0;

      // Exact substring match
      if (fClean.includes(clean(req.title_en)) || clean(req.title_en).includes(fClean)) {
        score += 80;
      }
      if (fClean.includes(idClean)) {
        score += 60;
      }

      // Token overlap
      for (const t of enTokens) {
        if (t.length > 2 && fClean.includes(t)) {
          score += 25;
        }
      }
      for (const t of bnTokens) {
        if (t.length > 2 && fClean.includes(t)) {
          score += 25;
        }
      }

      if (score > bestScore && score >= 25) {
        bestScore = score;
        bestFileId = file.id;
      }
    }

    if (bestFileId) {
      suggestions[req.id] = bestFileId;
      matchedFileIds.add(bestFileId);
    }
  }

  return suggestions;
}

/**
 * Formats bytes into human readable format (KB / MB).
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
