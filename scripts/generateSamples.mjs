// Script to generate sample PDF files for demo
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync, mkdirSync } from 'fs';

const outDir = './public/sample/documents';
mkdirSync(outDir, { recursive: true });

async function createPdf(filename, title, pages = 1) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText(title, {
      x: 50,
      y: 780,
      size: 18,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(`Page ${i + 1} of ${pages}`, {
      x: 50,
      y: 750,
      size: 12,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText('This is a sample document for demonstration purposes.', {
      x: 50,
      y: 700,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(`Document: ${filename}`, {
      x: 50,
      y: 680,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  const bytes = await doc.save();
  writeFileSync(`${outDir}/${filename}`, bytes);
  console.log(`Created: ${filename} (${pages} page(s))`);
}

async function createDuplicatePdf(filename1, filename2, title) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([595.28, 841.89]);
  page.drawText(title, {
    x: 50,
    y: 780,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText('Experience Certificate', {
    x: 50,
    y: 750,
    size: 12,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  const bytes = await doc.save();
  writeFileSync(`${outDir}/${filename1}`, bytes);
  writeFileSync(`${outDir}/${filename2}`, bytes);
  console.log(`Created duplicates: ${filename1} and ${filename2}`);
}

async function main() {
  await createPdf('financial_proposal.pdf', 'Financial Proposal', 3);
  await createPdf('technical_proposal.pdf', 'Technical Proposal', 5);
  await createPdf('tin_certificate.pdf', 'TIN Certificate', 1);
  await createPdf('vat_certificate.pdf', 'VAT Registration Certificate', 1);
  await createPdf('bank_solvency.pdf', 'Bank Solvency Certificate', 2);
  await createPdf('scan_0042.pdf', 'Scanned Document', 1);
  await createPdf('trade_license_2025.pdf', 'Trade License 2025', 1);
  await createPdf('trade_license_2026.pdf', 'Trade License 2026', 1);

  // Create duplicate experience certs (same content, different names)
  await createDuplicatePdf('experience_cert.pdf', 'experience_cert (1).pdf', 'Experience Certificate');

  // Create a PNG file (non-PDF, should be rejected)
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
    0x44, 0xAE, 0x42, 0x60, 0x82,
  ]);
  writeFileSync(`${outDir}/company_logo.png`, pngBuffer);
  console.log('Created: company_logo.png (should be rejected by upload pipeline)');
}

main().catch(console.error);
