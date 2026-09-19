import fs from "node:fs";

const input = fs.readFileSync("work/pdf-source/analise-do-comportamento.txt", "utf8");
const pages = input.split(/\n\n=== PÁGINA PDF (\d+) ===\n/).slice(1);
const chunks = [];
for (let i = 0; i < pages.length; i += 2) {
  const page = Number(pages[i]);
  const text = pages[i + 1].replace(/\s+/g, " ").trim();
  if (text.length < 80) continue;
  const words = text.split(" ");
  for (let start = 0; start < words.length; start += 150) {
    const content = words.slice(start, start + 190).join(" ");
    if (content.length > 120) chunks.push({ id: `pac-${page}-${start}`, page, content });
  }
}
fs.mkdirSync("app/data", { recursive: true });
fs.writeFileSync("app/data/behavior-analysis-knowledge.json", JSON.stringify({
  source: "Psicologia e Análise do Comportamento: Conceituações e Aplicações à Educação, Organizações, Saúde e Clínica",
  authors: "Verônica Bender Haydu; Silvia Aparecida Fornazari; Célio Roberto Estanislau (orgs.)",
  publisher: "UEL, 2014", isbn: "978-85-7846-267-3", pages: 560, chunks,
}));
console.log(`Indexed ${chunks.length} chunks from 560 pages.`);
