export interface Tender {
  tender_id: string;
  title: string;
  procuring_entity: string;
  bidder: string;
  submission_deadline: string;
}

export interface Requirement {
  id: string;
  order: number;
  title_en: string;
  title_bn: string;
  mandatory: boolean;
  has_expiry: boolean;
}

export interface TenderData {
  tender: Tender;
  requirements: Requirement[];
}

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  pageCount: number;
  hash: string;
  size: number;
}

export interface Match {
  requirementId: string;
  fileId: string;
}

export interface ExpiryDate {
  requirementId: string;
  date: string;
}

export type StatusType =
  | 'missing'
  | 'not_provided'
  | 'expiry_needed'
  | 'expired'
  | 'ok';

export interface Status {
  type: StatusType;
  blocks: boolean;
}

export type Lang = 'en' | 'bn';
