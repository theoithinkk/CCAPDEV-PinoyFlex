const LS_TAGS = "pf_tags_v1";

const DEFAULT_TAGS = [
  "Form",
  "Meal Prep",
  "Physique",
  "Beginners",
  "General",
  "Success",
];

export function getDefaultTags() {
  return [...DEFAULT_TAGS];
}

export function loadTags() {
  const raw = localStorage.getItem(LS_TAGS);
  let custom = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) custom = parsed;
    } catch {
      custom = [];
    }
  }
  // merge unique, keep defaults first
  const merged = [...DEFAULT_TAGS];
  for (const t of custom) {
    if (!merged.includes(t)) merged.push(t);
  }
  return merged;
}

export function loadCustomTagsOnly() {
  const raw = localStorage.getItem(LS_TAGS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addCustomTag(tag) {
  const cleaned = normalizeTag(tag);
  if (!cleaned) return { ok: false, reason: "empty" };
  if (DEFAULT_TAGS.includes(cleaned)) return { ok: false, reason: "exists" };

  const current = loadCustomTagsOnly();
  if (current.includes(cleaned)) return { ok: false, reason: "exists" };

  const next = [...current, cleaned];
  localStorage.setItem(LS_TAGS, JSON.stringify(next));
  return { ok: true, tag: cleaned };
}

export function normalizeTag(tag) {
  const t = (tag || "").trim();
  if (!t) return "";
  // keep it reasonable + consistent
  const capped = t.length > 24 ? t.slice(0, 24) : t;
  // Title-case-ish without being aggressive
  return capped;
}
