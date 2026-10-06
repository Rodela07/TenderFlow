import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import type { TenderConfig, UploadedFile, DocumentMatch, GenerationOptions } from '../types';

export interface GeneratedPackageResult {
  blob: Blob;
  filename: string;
  totalPages: number;
  includedDocumentsCount: number;
}

/**
 * Builds the final official tender package PDF strictly adhering to requirements:
 * 1. Page 1: Official English Cover Page with metadata & document summary.
 * 2. (Optional) Page 2: Index / Table of Contents with dynamic starting page numbers.
 * 3. Matched PDFs included in strictly ascending `requirement.order`.
 * 4. Preserves source page dimensions and orientations.
 * 5. Dynamic footer "<tender_id> | Page X of Y" on EVERY page (1 to Total Pages).
 * 6. Downloads strictly as `<tender_id>_Package.pdf`.
 */
export async function generateTenderPackage(
  config: TenderConfig,
  matches: Record<string, DocumentMatch>,
  files: Record<string, UploadedFile>,
  options: GenerationOptions = { includeIndexPage: true }
): Promise<GeneratedPackageResult> {
  const mergedPdf = await PDFDocument.create();
  const fontRegular = await mergedPdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);

  // 1. Determine included requirements sorted by numeric order
  const sortedReqs = [...config.requirements].sort((a, b) => a.order - b.order);
  const includedItems: {
    req: (typeof sortedReqs)[0];
    file: UploadedFile;
    match: DocumentMatch;
    srcDoc: PDFDocument;
    pageCount: number;
    startPage: number;
  }[] = [];

  for (const req of sortedReqs) {
    const match = matches[req.id];
    if (match && match.fileId && files[match.fileId]) {
      const uploadedFile = files[match.fileId];
      if (!uploadedFile.error) {
        try {
          const fileBytes = await uploadedFile.file.arrayBuffer();
          const srcDoc = await PDFDocument.load(fileBytes);
          const pageCount = srcDoc.getPageCount();
          includedItems.push({
            req,
            file: uploadedFile,
            match,
            srcDoc,
            pageCount,
            startPage: 0, // Will be calculated after cover & index pages
          });
        } catch {
          console.error(`Failed to load PDF for ${req.title_en}`);
        }
      }
    }
  }

  // 2. Calculate Page Layout & Start Pages
  const coverPageCount = 1;
  const indexPageCount = options.includeIndexPage ? 1 : 0;
  let currentPageIndex = coverPageCount + indexPageCount + 1; // 1-indexed

  for (const item of includedItems) {
    item.startPage = currentPageIndex;
    currentPageIndex += item.pageCount;
  }

  const finalTotalPages = currentPageIndex - 1;

  // 3. Render Page 1: Official English Cover Page (A4: 595.28 x 841.89 pt)
  const coverPage = mergedPdf.addPage([595.28, 841.89]);
  const { width: cW, height: cH } = coverPage.getSize();

  // Background decoration & subtle border
  coverPage.drawRectangle({
    x: 20,
    y: 20,
    width: cW - 40,
    height: cH - 40,
    borderColor: rgb(0.12, 0.23, 0.38),
    borderWidth: 1.5,
    color: rgb(0.98, 0.99, 1.0),
  });

  // Top Header Banner
  coverPage.drawRectangle({
    x: 20,
    y: cH - 95,
    width: cW - 40,
    height: 75,
    color: rgb(0.08, 0.22, 0.45),
  });

  coverPage.drawText('TENDER DOCUMENT PACKAGE', {
    x: 40,
    y: cH - 52,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  coverPage.drawText('OFFICIAL BID SUBMISSION DOSSIER', {
    x: 40,
    y: cH - 74,
    size: 9,
    font: fontRegular,
    color: rgb(0.78, 0.88, 0.98),
  });

  // Metadata Card
  const metaYStart = cH - 125;
  coverPage.drawRectangle({
    x: 40,
    y: metaYStart - 130,
    width: cW - 80,
    height: 130,
    color: rgb(0.94, 0.96, 0.98),
    borderColor: rgb(0.8, 0.85, 0.9),
    borderWidth: 1,
  });

  const metadataFields = [
    { label: 'Tender ID:', value: config.tender.tender_id },
    { label: 'Tender Title:', value: config.tender.title },
    { label: 'Procuring Entity:', value: config.tender.procuring_entity },
    { label: 'Bidder Name:', value: config.tender.bidder },
    { label: 'Submission Deadline:', value: config.tender.submission_deadline },
    {
      label: 'Generated On:',
      value: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
    },
  ];

  let currentMetaY = metaYStart - 20;
  for (const field of metadataFields) {
    coverPage.drawText(field.label, {
      x: 55,
      y: currentMetaY,
      size: 9.5,
      font: fontBold,
      color: rgb(0.15, 0.25, 0.35),
    });

    // Truncate long value if necessary
    const displayVal =
      field.value.length > 58 ? field.value.substring(0, 55) + '...' : field.value;
    coverPage.drawText(displayVal, {
      x: 180,
      y: currentMetaY,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentMetaY -= 19;
  }

  // Included Documents Header
  const tableTopY = currentMetaY - 15;
  coverPage.drawText('LIST OF INCLUDED DOCUMENTS (IN BINDING ORDER)', {
    x: 40,
    y: tableTopY,
    size: 11,
    font: fontBold,
    color: rgb(0.08, 0.22, 0.45),
  });

  // Table header bar
  coverPage.drawRectangle({
    x: 40,
    y: tableTopY - 22,
    width: cW - 80,
    height: 18,
    color: rgb(0.15, 0.28, 0.45),
  });

  coverPage.drawText('No.', {
    x: 48,
    y: tableTopY - 17,
    size: 8.5,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  coverPage.drawText('Document Requirement', {
    x: 75,
    y: tableTopY - 17,
    size: 8.5,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  coverPage.drawText('Matched File', {
    x: 270,
    y: tableTopY - 17,
    size: 8.5,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  coverPage.drawText('Pages', {
    x: 440,
    y: tableTopY - 17,
    size: 8.5,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  coverPage.drawText('Expiry Status', {
    x: 490,
    y: tableTopY - 17,
    size: 8.5,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // Render Table Rows (up to available cover height)
  let rowY = tableTopY - 40;
  let docIndex = 1;

  for (const item of includedItems) {
    if (rowY < 90) break; // Avoid overflowing footer zone

    // Alternating zebra row
    if (docIndex % 2 === 0) {
      coverPage.drawRectangle({
        x: 40,
        y: rowY - 4,
        width: cW - 80,
        height: 17,
        color: rgb(0.96, 0.97, 0.99),
      });
    }

    coverPage.drawText(String(docIndex), {
      x: 48,
      y: rowY,
      size: 8.5,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    const reqTitle =
      item.req.title_en.length > 35
        ? item.req.title_en.substring(0, 32) + '...'
        : item.req.title_en;
    coverPage.drawText(reqTitle, {
      x: 75,
      y: rowY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    const fileName =
      item.file.name.length > 30
        ? item.file.name.substring(0, 27) + '...'
        : item.file.name;
    coverPage.drawText(fileName, {
      x: 270,
      y: rowY,
      size: 8,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    coverPage.drawText(String(item.pageCount), {
      x: 450,
      y: rowY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    const expiryInfo = item.req.has_expiry
      ? item.match.expiryDate || 'Valid'
      : 'N/A';
    coverPage.drawText(expiryInfo, {
      x: 490,
      y: rowY,
      size: 8,
      font: fontRegular,
      color: rgb(0.1, 0.45, 0.2),
    });

    rowY -= 18;
    docIndex++;
  }

  // 4. Render (Optional) Page 2: Table of Contents / Dynamic Index
  if (options.includeIndexPage) {
    const indexPage = mergedPdf.addPage([595.28, 841.89]);
    const { width: iW, height: iH } = indexPage.getSize();

    indexPage.drawRectangle({
      x: 20,
      y: 20,
      width: iW - 40,
      height: iH - 40,
      borderColor: rgb(0.12, 0.23, 0.38),
      borderWidth: 1.5,
      color: rgb(0.99, 1.0, 1.0),
    });

    indexPage.drawRectangle({
      x: 20,
      y: iH - 85,
      width: iW - 40,
      height: 65,
      color: rgb(0.08, 0.22, 0.45),
    });

    indexPage.drawText('DOCUMENT INDEX & PAGINATION', {
      x: 40,
      y: iH - 48,
      size: 18,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    indexPage.drawText('TENDER DOSSIER TABLE OF CONTENTS', {
      x: 40,
      y: iH - 68,
      size: 9,
      font: fontRegular,
      color: rgb(0.78, 0.88, 0.98),
    });

    let indexRowY = iH - 120;
    for (let i = 0; i < includedItems.length; i++) {
      const item = includedItems[i];
      if (indexRowY < 80) break;

      indexPage.drawRectangle({
        x: 40,
        y: indexRowY - 6,
        width: iW - 80,
        height: 28,
        color: i % 2 === 0 ? rgb(0.96, 0.98, 1.0) : rgb(1, 1, 1),
        borderColor: rgb(0.85, 0.9, 0.95),
        borderWidth: 0.5,
      });

      indexPage.drawText(`Item ${i + 1}: ${item.req.title_en}`, {
        x: 52,
        y: indexRowY + 7,
        size: 9.5,
        font: fontBold,
        color: rgb(0.1, 0.2, 0.35),
      });

      indexPage.drawText(
        `File: ${item.file.name} | Total Pages: ${item.pageCount}`,
        {
          x: 52,
          y: indexRowY - 3,
          size: 8,
          font: fontRegular,
          color: rgb(0.4, 0.45, 0.5),
        }
      );

      const pageRange =
        item.pageCount === 1
          ? `Page ${item.startPage}`
          : `Pages ${item.startPage} - ${item.startPage + item.pageCount - 1}`;

      indexPage.drawText(pageRange, {
        x: iW - 165,
        y: indexRowY + 2,
        size: 9.5,
        font: fontBold,
        color: rgb(0.08, 0.45, 0.75),
      });

      indexRowY -= 34;
    }
  }

  // 5. Append Source PDF pages in strictly ascending requirement.order
  for (const item of includedItems) {
    const pageIndices = item.srcDoc.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(item.srcDoc, pageIndices);

    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  // 6. Embed Optional Signature/Seal Stamp if provided
  let stampImage: any = null;
  if (options.stampSignature) {
    try {
      if (options.stampSignature.imageType === 'png') {
        stampImage = await mergedPdf.embedPng(options.stampSignature.imageBytes);
      } else {
        stampImage = await mergedPdf.embedJpg(options.stampSignature.imageBytes);
      }
    } catch (e) {
      console.warn('Could not embed signature stamp:', e);
    }
  }

  // 7. Apply Accurate Footer to EVERY Page (Cover, Index, and all source pages)
  // Format: "<tender_id> | Page X of Y" (e.g. "T-2026-0417 | Page 3 of 14")
  const allPages = mergedPdf.getPages();
  const tenderId = config.tender.tender_id.trim();

  for (let idx = 0; idx < allPages.length; idx++) {
    const page = allPages[idx];
    const pageNum = idx + 1;
    const { width: pW } = page.getSize();
    const rotation = page.getRotation().angle;

    const footerText = `${tenderId} | Page ${pageNum} of ${finalTotalPages}`;
    const textSize = 9;
    const textWidth = fontBold.widthOfTextAtSize(footerText, textSize);

    // Render footer with a subtle background badge to ensure readability on any background
    const footerY = 14;
    const badgeW = textWidth + 18;
    const badgeH = 16;
    const badgeX = (pW - badgeW) / 2;

    // Draw clean footer bar background
    page.drawRectangle({
      x: badgeX,
      y: footerY - 3,
      width: badgeW,
      height: badgeH,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(0.8, 0.85, 0.9),
      borderWidth: 0.75,
      opacity: 0.92,
      rotate: degrees(rotation ? -rotation : 0),
    });

    page.drawText(footerText, {
      x: (pW - textWidth) / 2,
      y: footerY,
      size: textSize,
      font: fontBold,
      color: rgb(0.12, 0.22, 0.35),
      rotate: degrees(rotation ? -rotation : 0),
    });

    // Stamp seal if requested
    if (stampImage && (options.stampSignature?.targetPages === 'all' || (options.stampSignature?.targetPages === 'cover' && idx === 0) || (options.stampSignature?.targetPages === 'last' && idx === allPages.length - 1))) {
      const stampDim = stampImage.scale(0.35);
      page.drawImage(stampImage, {
        x: pW - stampDim.width - 40,
        y: 40,
        width: stampDim.width,
        height: stampDim.height,
        opacity: 0.85,
      });
    }
  }

  // 8. Save PDF Uint8Array and construct download Blob
  const pdfBytes = await mergedPdf.save();
  const filename = `${config.tender.tender_id}_Package.pdf`;
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });

  return {
    blob,
    filename,
    totalPages: finalTotalPages,
    includedDocumentsCount: includedItems.length,
  };
}

/**
 * Triggers native browser download for generated Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
