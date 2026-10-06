import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import type { Tender, Requirement, UploadedFile, Match } from '../types';

function drawFooter(page: PDFPage, font: PDFFont, tenderId: string, pageNum: number, totalPages: number) {
  const { width } = page.getSize();
  const text = `${tenderId} | Page ${pageNum} of ${totalPages}`;
  const fontSize = 9;
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  page.drawText(text, {
    x: (width - textWidth) / 2,
    y: 18,
    size: fontSize,
    font,
    color: rgb(0.55, 0.55, 0.55),
  });
}

function buildCoverPageContent(
  tender: Tender,
  includedDocs: Array<{ order: number; title: string }>,
  createdDate: string
): string[] {
  const lines: string[] = [];
  lines.push('TENDER DOCUMENT PACKAGE');
  lines.push('');
  lines.push(`Tender ID: ${tender.tender_id}`);
  lines.push(`Title: ${tender.title}`);
  lines.push(`Procuring Entity: ${tender.procuring_entity}`);
  lines.push(`Bidder: ${tender.bidder}`);
  lines.push(`Submission Deadline: ${tender.submission_deadline}`);
  lines.push(`Package Created: ${createdDate}`);
  lines.push('');
  lines.push('Included Documents:');
  for (const doc of includedDocs) {
    lines.push(`  ${String(doc.order).padStart(2, '0')}. ${doc.title}`);
  }
  return lines;
}

function buildIndexPageContent(
  includedDocs: Array<{ order: number; title: string; startPage: number; pageCount: number }>
): string[] {
  const lines: string[] = [];
  lines.push('DOCUMENT INDEX');
  lines.push('');
  lines.push('No.   Document                                          Start Page');
  lines.push('----  ------------------------------------------------  ----------');
  for (const doc of includedDocs) {
    const num = String(doc.order).padStart(2, '0');
    const title = doc.title.substring(0, 48).padEnd(48, ' ');
    const pg = String(doc.startPage).padStart(6, ' ');
    lines.push(`${num}    ${title}  ${pg}`);
  }
  return lines;
}

export async function buildPackage(
  tender: Tender,
  requirements: Requirement[],
  matches: Match[],
  files: UploadedFile[],
  onError: (msg: string) => void
): Promise<Uint8Array | null> {
  try {
    const outputPdf = await PDFDocument.create();
    const font = await outputPdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await outputPdf.embedFont(StandardFonts.HelveticaBold);

    // Determine sorted requirements that have matches
    const sortedReqs = [...requirements].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    const matchedReqs = sortedReqs.filter((req) =>
      matches.some((m) => m.requirementId === req.id)
    );

    const includedDocs = matchedReqs.map((req) => ({
      order: req.order,
      title: req.title_en,
      id: req.id,
    }));

    const createdDate = new Date().toISOString().split('T')[0];

    // === PHASE 1: Build pages ===

    // Cover page
    const coverPage = outputPdf.addPage([595.28, 841.89]); // A4
    const coverLines = buildCoverPageContent(tender, includedDocs, createdDate);
    let yPos = 780;
    for (const line of coverLines) {
      if (line === 'TENDER DOCUMENT PACKAGE') {
        coverPage.drawText(line, {
          x: 50,
          y: yPos,
          size: 20,
          font: fontBold,
          color: rgb(0.08, 0.08, 0.08),
        });
        yPos -= 36;
      } else if (line === 'Included Documents:') {
        coverPage.drawText(line, {
          x: 50,
          y: yPos,
          size: 13,
          font: fontBold,
          color: rgb(0.08, 0.08, 0.08),
        });
        yPos -= 22;
      } else if (line === '') {
        yPos -= 16;
      } else {
        coverPage.drawText(line, {
          x: 50,
          y: yPos,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        yPos -= 20;
      }
    }

    // Track page counts for index
    const docPageInfo: Array<{ order: number; title: string; startPage: number; pageCount: number }> = [];
    let currentPageNum = 2; // Cover is page 1, index is page 2

    // First pass: gather page info for the index page
    for (const req of matchedReqs) {
      const match = matches.find((m) => m.requirementId === req.id);
      if (!match) continue;
      const uploadedFile = files.find((f) => f.id === match.fileId);
      if (!uploadedFile) continue;

      docPageInfo.push({
        order: req.order,
        title: req.title_en,
        startPage: currentPageNum + 1, // +1 because index page will be inserted
        pageCount: uploadedFile.pageCount,
      });
      currentPageNum += uploadedFile.pageCount;
    }

    // Index page
    const indexPage = outputPdf.addPage([595.28, 841.89]);
    const indexLines = buildIndexPageContent(docPageInfo);
    let iyPos = 780;
    for (const line of indexLines) {
      if (line === 'DOCUMENT INDEX') {
        indexPage.drawText(line, {
          x: 50,
          y: iyPos,
          size: 18,
          font: fontBold,
          color: rgb(0.08, 0.08, 0.08),
        });
        iyPos -= 32;
      } else if (line.startsWith('No.') || line.startsWith('----')) {
        indexPage.drawText(line, {
          x: 50,
          y: iyPos,
          size: 9,
          font: fontBold,
          color: rgb(0.35, 0.35, 0.35),
        });
        iyPos -= 16;
      } else if (line === '') {
        iyPos -= 12;
      } else {
        indexPage.drawText(line, {
          x: 50,
          y: iyPos,
          size: 9,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        iyPos -= 16;
      }
    }

    // Copy document pages in order
    for (const req of matchedReqs) {
      const match = matches.find((m) => m.requirementId === req.id);
      if (!match) continue;
      const uploadedFile = files.find((f) => f.id === match.fileId);
      if (!uploadedFile) continue;

      try {
        const fileBytes = await uploadedFile.file.arrayBuffer();
        const srcDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
        const pageIndices = srcDoc.getPageIndices();
        const copiedPages = await outputPdf.copyPages(srcDoc, pageIndices);
        for (const page of copiedPages) {
          outputPdf.addPage(page);
        }
      } catch (err) {
        onError(`Failed to process: ${uploadedFile.name}. ${err instanceof Error ? err.message : 'Unknown error'}`);
        return null;
      }
    }

    // === PHASE 2: Stamp footers ===
    const allPages = outputPdf.getPages();
    const totalPages = allPages.length;
    for (let i = 0; i < totalPages; i++) {
      drawFooter(allPages[i], font, tender.tender_id, i + 1, totalPages);
    }

    const pdfBytes = await outputPdf.save();
    return pdfBytes;
  } catch (err) {
    onError(`Package generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return null;
  }
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(bytes) as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
