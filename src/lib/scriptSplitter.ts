/**
 * Split a script string into 6-10 short scene captions,
 * each suitable for display on a single Shorts frame.
 */
export function splitScript(fullScript: string): string[] {
  // 1. Split on sentence-ending punctuation (.!?)
  const rawSentences = fullScript
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // 2. If already in the 6-10 range, return as-is
  if (rawSentences.length >= 6 && rawSentences.length <= 10) {
    return rawSentences;
  }

  // 3. If too few, break longer sentences on commas / dashes
  if (rawSentences.length < 6) {
    const expanded: string[] = [];
    for (const sentence of rawSentences) {
      const parts = sentence
        .split(/(?:,\s+|—\s*|\s+-\s+)/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      expanded.push(...parts);
    }
    // Guarantee at least 6 — pad by splitting longest entries in half
    while (expanded.length < 6) {
      const longest = expanded.reduce(
        (max, s, i) => (s.length > expanded[max].length ? i : max),
        0
      );
      const mid = Math.ceil(expanded[longest].length / 2);
      const spaceIdx = expanded[longest].indexOf(" ", mid);
      if (spaceIdx !== -1) {
        const left = expanded[longest].slice(0, spaceIdx).trim();
        const right = expanded[longest].slice(spaceIdx).trim();
        expanded.splice(longest, 1, left, right);
      } else {
        break; // can't split further
      }
    }
    return expanded.slice(0, 10);
  }

  // 4. If too many, merge adjacent short sentences
  const merged: string[] = [];
  let buffer = "";
  for (const s of rawSentences) {
    if (buffer.length === 0) {
      buffer = s;
    } else if (buffer.length + s.length < 90) {
      buffer += " " + s;
    } else {
      merged.push(buffer);
      buffer = s;
    }
  }
  if (buffer) merged.push(buffer);

  return merged.slice(0, 10);
}
