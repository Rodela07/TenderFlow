export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function findDuplicateGroups(
  files: Array<{ id: string; hash: string }>
): Map<string, string[]> {
  const hashMap = new Map<string, string[]>();
  for (const f of files) {
    const group = hashMap.get(f.hash);
    if (group) {
      group.push(f.id);
    } else {
      hashMap.set(f.hash, [f.id]);
    }
  }
  // Only keep groups with 2+ files
  const result = new Map<string, string[]>();
  for (const [hash, ids] of hashMap) {
    if (ids.length > 1) {
      result.set(hash, ids);
    }
  }
  return result;
}

export function isDuplicateLocked(
  fileId: string,
  duplicateGroups: Map<string, string[]>,
  matches: Array<{ fileId: string }>
): { locked: boolean; matchedSiblingName?: string } {
  for (const [, ids] of duplicateGroups) {
    if (!ids.includes(fileId)) continue;
    // Check if any OTHER file in this group is matched
    const matchedSibling = ids.find(
      (id) => id !== fileId && matches.some((m) => m.fileId === id)
    );
    if (matchedSibling) {
      return { locked: true, matchedSiblingName: matchedSibling };
    }
  }
  return { locked: false };
}

export function isInDuplicateGroup(
  fileId: string,
  duplicateGroups: Map<string, string[]>
): boolean {
  for (const [, ids] of duplicateGroups) {
    if (ids.includes(fileId)) return true;
  }
  return false;
}
