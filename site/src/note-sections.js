// Preserve original prose while exposing the author's section structure.
export function noteSections(text = "") {
  const sections = [];
  let current = { title: "Overview", body: "" };
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
      current = { title: heading[2], body: "" };
    } else current.body += `${line}\n`;
  }
  if (current.body.trim())
    sections.push({ ...current, body: current.body.trim() });
  return sections;
}
