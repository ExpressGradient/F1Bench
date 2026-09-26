// Preserve original prose while exposing the author's section structure.
export function noteSections(text = "") {
  const sections = [];
  let current = { title: "Overview", body: "", level: 0 };
  let fence = null;
  for (const line of text.split("\n")) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (fence === marker[1][0]) fence = null;
    }
    const heading = !fence && line.match(/^(#{1,3})\s+(.+?)\s*#*$/);
    if (heading) {
      if (current.body.trim())
        sections.push({ ...current, body: current.body.trim() });
      current = { title: heading[2], body: "", level: heading[1].length };
    } else current.body += `${line}\n`;
  }
  if (current.body.trim())
    sections.push({ ...current, body: current.body.trim() });
  return sections;
}

// Bring an explicitly titled review forward; do not rewrite or classify its prose.
export function reviewSections(text, race) {
  const sections = noteSections(text);
  if (!race) return { current: [], archive: sections };
  const names = `${race.id} ${race.name}`
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(
      (word) =>
        word.length >= 4 && !["grand", "prix", "formula"].includes(word),
    );
  const start = sections.findIndex((section) => {
    const title = section.title.toLowerCase();
    return (
      names.some((name) => title.includes(name)) &&
      /post|result.*forecast|vs\.? forecast/.test(title) &&
      !/pre-race/.test(title)
    );
  });
  if (start < 0) return { current: [], archive: sections };
  let end = start + 1;
  while (end < sections.length && sections[end].level > sections[start].level)
    end++;
  return {
    current: sections.slice(start, end),
    archive: [...sections.slice(0, start), ...sections.slice(end)],
  };
}
