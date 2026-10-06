import type { Requirement, UploadedFile } from '../types';

const COMMON_TOKENS: Record<string, string[]> = {
  trade_license: ['trade', 'license', 'licence', 'ট্রেড', 'লাইসেন্স'],
  tin: ['tin', 'certificate', 'tax', 'identification', 'টিন'],
  vat: ['vat', 'value', 'added', 'ভ্যাট'],
  bank_solvency: ['bank', 'solvency', 'ব্যাংক', 'সচ্ছলতা'],
  experience: ['experience', 'cert', 'certificate', 'অভিজ্ঞতা'],
  technical: ['technical', 'proposal', 'কারিগরি', 'প্রযুক্তিগত'],
  financial: ['financial', 'proposal', 'আর্থিক'],
  company: ['company', 'profile', 'incorporation', 'কোম্পানি'],
  registration: ['registration', 'নিবন্ধন'],
  nid: ['nid', 'national', 'id', 'জাতীয়', 'পরিচয়'],
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[_\-.()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreMatch(fileName: string, requirement: Requirement): number {
  const normalizedFile = normalizeText(fileName.replace(/\.pdf$/i, ''));
  const normalizedReq = normalizeText(requirement.title_en);

  const fileWords = normalizedFile.split(' ').filter(Boolean);
  const reqWords = normalizedReq.split(' ').filter(Boolean);

  let score = 0;

  // Direct word overlap
  for (const fw of fileWords) {
    for (const rw of reqWords) {
      if (fw === rw) score += 10;
      else if (fw.includes(rw) || rw.includes(fw)) score += 5;
    }
  }

  // Token-based matching
  for (const [, tokens] of Object.entries(COMMON_TOKENS)) {
    const fileHasToken = fileWords.some((w) => tokens.includes(w));
    const reqHasToken = reqWords.some((w) => tokens.includes(w));
    if (fileHasToken && reqHasToken) score += 8;
  }

  return score;
}

export function autoMatch(
  files: UploadedFile[],
  requirements: Requirement[],
  existingMatches: Array<{ requirementId: string; fileId: string }>,
  lockedFileIds: Set<string>
): Map<string, string> {
  const suggestions = new Map<string, string>();
  const usedFileIds = new Set<string>();
  const matchedReqIds = new Set(existingMatches.map((m) => m.requirementId));

  // Already matched files
  for (const m of existingMatches) {
    usedFileIds.add(m.fileId);
  }

  // Score all unmatched requirement-file pairs
  const candidates: Array<{ reqId: string; fileId: string; score: number }> = [];

  for (const req of requirements) {
    if (matchedReqIds.has(req.id)) continue;
    for (const file of files) {
      if (usedFileIds.has(file.id)) continue;
      if (lockedFileIds.has(file.id)) continue;
      const score = scoreMatch(file.name, req);
      if (score > 0) {
        candidates.push({ reqId: req.id, fileId: file.id, score });
      }
    }
  }

  // Sort by score descending, greedily assign
  candidates.sort((a, b) => b.score - a.score);

  for (const c of candidates) {
    if (suggestions.has(c.reqId)) continue;
    if (usedFileIds.has(c.fileId)) continue;
    suggestions.set(c.reqId, c.fileId);
    usedFileIds.add(c.fileId);
  }

  return suggestions;
}
