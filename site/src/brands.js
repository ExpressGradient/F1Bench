// Match the brand palette used by the saved season chart.
export function modelColor(model = "") {
  if (/openai|gpt/i.test(model)) return "#10a37f";
  if (/meta|muse/i.test(model)) return "#0668e1";
  if (/x-ai|xai|grok/i.test(model)) return "#000000";
  return "#596a7c";
}
