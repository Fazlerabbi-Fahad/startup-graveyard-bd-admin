// Local (browser-only) backups of unsaved editor changes. Not a substitute for saving.
const key = (id) => `bdgy-admin:draft:${id}`;

export function readLocalDraft(id) {
  try {
    const raw = localStorage.getItem(key(id));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.values ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLocalDraft(id, values, baseUpdatedAt) {
  try {
    localStorage.setItem(key(id), JSON.stringify({ values, savedAt: new Date().toISOString(), baseUpdatedAt: baseUpdatedAt ?? null }));
    return true;
  } catch {
    return false; // storage full or blocked
  }
}

export function clearLocalDraft(id) {
  try {
    localStorage.removeItem(key(id));
  } catch {
    /* ignore */
  }
}
