import fs from 'fs';
import path from 'path';
import { generateTenderPackage } from '../src/utils/pdfGenerator';
import { SAMPLE_REQUIREMENTS_JSON, createTestPdfFile } from '../src/utils/sampleData';
import type { UploadedFile, DocumentMatch } from '../src/types';

async function run() {
  const outputDir = path.resolve(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const matches: Record<string, DocumentMatch> = {};
  const files: Record<string, UploadedFile> = {};

  const reqs = SAMPLE_REQUIREMENTS_JSON.requirements;

  for (let i = 0; i < reqs.length; i++) {
    const req = reqs[i];
    // Include all mandatory and 1 optional
    if (req.mandatory || i === 6) {
      const fileId = `file_${i + 1}`;
      const pages = i === 0 ? 2 : i === 1 ? 1 : i === 3 ? 3 : 2;
      const fname = `${req.title_en.toLowerCase().replace(/[^a-z0-9]/g, '_')}_signed.pdf`;
      const testFile = await createTestPdfFile(req.title_en, pages, fname);

      files[fileId] = {
        id: fileId,
        file: testFile,
        name: fname,
        size: testFile.size,
        pageCount: pages,
        sha256: `mock_hash_${i}`,
      };

      matches[req.id] = {
        requirementId: req.id,
        fileId: fileId,
        expiryDate: req.has_expiry ? '2026-11-30' : null,
      };
    }
  }

  console.log('Generating official contest package...');
  const result = await generateTenderPackage(SAMPLE_REQUIREMENTS_JSON, matches, files, {
    includeIndexPage: true,
  });

  const arrayBuffer = await result.blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const outPath = path.join(outputDir, result.filename);
  fs.writeFileSync(outPath, buffer);

  console.log(`Successfully generated ${outPath} (${result.totalPages} pages, ${buffer.length} bytes)`);
}

run().catch(console.error);
