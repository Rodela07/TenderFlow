import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { TenderConfig, UploadedFile, DocumentMatch } from '../types';

export const SAMPLE_REQUIREMENTS_JSON: TenderConfig = {
  tender: {
    tender_id: 'T-2026-0417',
    title: 'Supply of IT Equipment & High Performance Workstations',
    procuring_entity: 'Directorate of Information & Communication Technology',
    bidder: 'Smart Solutions BD Limited',
    submission_deadline: '2026-10-20',
  },
  requirements: [
    {
      id: 'R01',
      order: 1,
      title_en: 'Valid Trade License',
      title_bn: 'হালনাগাদ ট্রেড লাইসেন্স',
      mandatory: true,
      has_expiry: true,
    },
    {
      id: 'R02',
      order: 2,
      title_en: 'e-TIN & Tax Return Submission Proof',
      title_bn: 'ই-টিআইএন ও আয়কর রিটার্ন দাখিলের প্রমাণ',
      mandatory: true,
      has_expiry: false,
    },
    {
      id: 'R03',
      order: 3,
      title_en: 'BIN / 13-digit VAT Registration Certificate',
      title_bn: '১৩ ডিজিটের ভ্যাট নিবন্ধন সনদ',
      mandatory: true,
      has_expiry: false,
    },
    {
      id: 'R04',
      order: 4,
      title_en: 'Bank Solvency & Credit Line Certificate',
      title_bn: 'ব্যাংক সলভেন্সি এবং ক্রেডিট লাইন সনদ',
      mandatory: true,
      has_expiry: true,
    },
    {
      id: 'R05',
      order: 5,
      title_en: 'Manufacturer Authorization Form (MAF)',
      title_bn: 'উৎপাদকের অনুমোদন পত্র (MAF)',
      mandatory: true,
      has_expiry: true,
    },
    {
      id: 'R06',
      order: 6,
      title_en: 'Technical Compliance Sheet & Datasheets',
      title_bn: 'টেকনিক্যাল কমপ্লায়েন্স শিট ও ডাটাশিট',
      mandatory: true,
      has_expiry: false,
    },
    {
      id: 'R07',
      order: 7,
      title_en: 'Similar Past Experience & Completion Certificates',
      title_bn: 'সমরূপ কাজের অভিজ্ঞতা ও কার্যসম্পাদন সনদ',
      mandatory: false,
      has_expiry: false,
    },
    {
      id: 'R08',
      order: 8,
      title_en: 'ISO 9001 / ISO 27001 Quality Certification',
      title_bn: 'আইএসও ৯০০১ / আইএসও ২৭০০১ সনদপত্র',
      mandatory: false,
      has_expiry: true,
    },
  ],
};

/**
 * Creates a synthetic valid test PDF in browser memory for automated demo/testing.
 */
export async function createTestPdfFile(
  title: string,
  pageCount: number = 1,
  filename: string = 'document.pdf',
  badgeText: string = 'OFFICIAL BID ATTACHMENT'
): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 1; i <= pageCount; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    // Subtle page border
    page.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: height - 60,
      borderColor: rgb(0.2, 0.3, 0.45),
      borderWidth: 1,
      color: rgb(0.99, 0.99, 1.0),
    });

    // Header banner
    page.drawRectangle({
      x: 30,
      y: height - 90,
      width: width - 60,
      height: 60,
      color: rgb(0.12, 0.28, 0.52),
    });

    page.drawText(title, {
      x: 50,
      y: height - 58,
      size: 16,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(`${badgeText} • Internal Page ${i} of ${pageCount}`, {
      x: 50,
      y: height - 76,
      size: 9,
      font,
      color: rgb(0.85, 0.92, 1.0),
    });

    // Body content simulation
    page.drawText(`This is an authentic verified test document: ${filename}`, {
      x: 50,
      y: height - 130,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.3),
    });

    page.drawText(
      `Document Reference: REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      {
        x: 50,
        y: height - 150,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      }
    );

    // Decorative simulated document lines
    for (let line = 0; line < 18; line++) {
      const lineY = height - 180 - line * 22;
      page.drawRectangle({
        x: 50,
        y: lineY,
        width: line % 3 === 0 ? width - 180 : width - 100,
        height: 6,
        color: rgb(0.9, 0.92, 0.95),
      });
    }

    // Authenticity Stamp simulation
    page.drawRectangle({
      x: width - 180,
      y: 60,
      width: 130,
      height: 45,
      borderColor: rgb(0.08, 0.5, 0.25),
      borderWidth: 1.5,
      color: rgb(0.95, 0.99, 0.96),
    });
    page.drawText('VERIFIED TENDER ATTACHMENT', {
      x: width - 172,
      y: 86,
      size: 7,
      font: fontBold,
      color: rgb(0.08, 0.5, 0.25),
    });
    page.drawText('AUTHENTIC DIGITAL COPY', {
      x: width - 165,
      y: 72,
      size: 6.5,
      font,
      color: rgb(0.1, 0.4, 0.2),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new File([pdfBytes as unknown as BlobPart], filename, { type: 'application/pdf' });
}

/**
 * Exports project checklist as CSV (Bonus #3 / Section 29).
 */
export function exportChecklistCsv(
  config: TenderConfig,
  matches: Record<string, DocumentMatch>,
  files: Record<string, UploadedFile>,
  statuses: Record<string, string>
): void {
  const headers = [
    'Order',
    'Requirement ID',
    'Document (English)',
    'Document (Bangla)',
    'Mandatory',
    'Matched File Name',
    'File Size',
    'Pages',
    'Expiry Required',
    'Expiry Date',
    'Status',
  ];

  const rows = config.requirements.map((req) => {
    const match = matches[req.id];
    const file = match?.fileId ? files[match.fileId] : undefined;
    const status = statuses[req.id] || 'Missing';

    return [
      req.order,
      `"${req.id}"`,
      `"${req.title_en.replace(/"/g, '""')}"`,
      `"${req.title_bn.replace(/"/g, '""')}"`,
      req.mandatory ? 'Yes' : 'No',
      file ? `"${file.name.replace(/"/g, '""')}"` : 'None',
      file ? `${(file.size / 1024).toFixed(1)} KB` : 'N/A',
      file?.pageCount ?? 0,
      req.has_expiry ? 'Yes' : 'No',
      match?.expiryDate || 'N/A',
      `"${status}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${config.tender.tender_id}_Checklist.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Saves and exports the current workspace project state to JSON file (Bonus #4 / Section 30).
 */
export function exportProjectState(
  config: TenderConfig,
  matches: Record<string, DocumentMatch>
): void {
  const payload = {
    app: 'TenderDocumentPackageBuilder',
    version: '1.0.0',
    savedAt: new Date().toISOString(),
    config,
    matches,
  };
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${config.tender.tender_id}_ProjectState.tendercase`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
