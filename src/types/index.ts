export interface TenderMetadata {
  tender_id: string;
  title: string;
  procuring_entity: string;
  bidder: string;
  submission_deadline: string; // ISO date string e.g. "2026-10-20"
}

export interface TenderRequirement {
  id: string;
  order: number;
  title_en: string;
  title_bn: string;
  mandatory: boolean;
  has_expiry: boolean;
}

export interface TenderConfig {
  tender: TenderMetadata;
  requirements: TenderRequirement[];
}

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number | null;
  sha256: string | null;
  error?: string;
  isDamagedOrEncrypted?: boolean;
  isDuplicate?: boolean;
  duplicateOfId?: string;
  duplicateNames?: string[];
  matchedRequirementId?: string | null;
}

export interface DocumentMatch {
  requirementId: string;
  fileId: string | null;
  expiryDate: string | null; // "YYYY-MM-DD"
}

export type DocumentStatus =
  | 'Missing'
  | 'Expiry date needed'
  | 'Expired'
  | 'Not provided'
  | 'OK';

export interface StatusSummary {
  totalRequirements: number;
  totalRequired: number;
  ready: number;
  missing: number;
  expired: number;
  expiryNeeded: number;
  optionalNotProvided: number;
  blockingCount: number;
  isPackageReady: boolean;
}

export type Language = 'en' | 'bn';

export interface GenerationOptions {
  includeIndexPage: boolean;
  stampSignature?: {
    imageBytes: Uint8Array;
    imageType: 'png' | 'jpg';
    targetPages: 'all' | 'first' | 'last' | 'cover';
  };
}
