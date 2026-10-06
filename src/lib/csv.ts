import type { Requirement, UploadedFile, Match, ExpiryDate, Status } from '../types';

export function exportChecklistCsv(
  requirements: Requirement[],
  matches: Match[],
  files: UploadedFile[],
  expiryDates: ExpiryDate[],
  statuses: Map<string, Status>,
  lang: 'en' | 'bn'
): void {
  const statusLabels: Record<string, Record<string, string>> = {
    ok: { en: 'OK', bn: 'ঠিক আছে' },
    missing: { en: 'Missing', bn: 'অনুপস্থিত' },
    not_provided: { en: 'Not provided', bn: 'প্রদান করা হয়নি' },
    expiry_needed: { en: 'Expiry date needed', bn: 'মেয়াদ তারিখ প্রয়োজন' },
    expired: { en: 'Expired', bn: 'মেয়াদ শেষ' },
  };

  const headers = lang === 'bn'
    ? ['ক্রম', 'নথি', 'ফাইল নাম', 'পৃষ্ঠা', 'মেয়াদ তারিখ', 'অবস্থা']
    : ['Order', 'Document', 'File Name', 'Pages', 'Expiry Date', 'Status'];

  const rows: string[][] = [headers];

  const sorted = [...requirements].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  for (const req of sorted) {
    const match = matches.find((m) => m.requirementId === req.id);
    const file = match ? files.find((f) => f.id === match.fileId) : undefined;
    const expiry = expiryDates.find((e) => e.requirementId === req.id);
    const status = statuses.get(req.id);

    const title = lang === 'bn' ? (req.title_bn || req.title_en) : req.title_en;
    const statusLabel = status ? (statusLabels[status.type]?.[lang] ?? status.type) : '';

    rows.push([
      String(req.order).padStart(2, '0'),
      title,
      file ? file.name : '',
      file ? String(file.pageCount) : '',
      expiry?.date ?? '',
      statusLabel,
    ]);
  }

  // CSV with UTF-8 BOM for Bangla/Excel compatibility
  const bom = '\uFEFF';
  const csv = bom + rows.map((row) =>
    row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'checklist.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
