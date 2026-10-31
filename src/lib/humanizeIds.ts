const UUID_RE = /\b(?:node\s+)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** Replace raw node UUIDs in user-facing AI text with the node's label; drop unknown ones. */
export function humanizeIds(text: string, labels: Map<string, string>): string {
  return text
    .replace(UUID_RE, (m) => {
      const id = m.replace(/^node\s+/i, "").toLowerCase();
      const label = labels.get(id);
      return label ? `"${label.trim().slice(0, 80)}"` : "";
    })
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}
