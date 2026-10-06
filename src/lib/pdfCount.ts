import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export async function getPdfPageCount(file: File): Promise<number> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const count = pdf.numPages;
  pdf.destroy();
  return count;
}

export async function getPdfPageCountFromBytes(bytes: ArrayBuffer): Promise<number> {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
  const count = pdf.numPages;
  pdf.destroy();
  return count;
}
