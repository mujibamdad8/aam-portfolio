// Usage: node build.js  ->  writes the finished site to dist/
// Each src/pages/*.html = front matter (title, description, scripts) + content,
// wrapped by src/layout.html with src/partials/header.html and footer.html.
const fs = require("fs"), path = require("path");
const rd = f => fs.readFileSync(path.join("src", f), "utf8");
const layout = rd("layout.html"), header = rd("partials/header.html"), footer = rd("partials/footer.html");

fs.rmSync("dist", { recursive: true, force: true });
fs.cpSync("src/assets", "dist/assets", { recursive: true });
fs.cpSync("src/static", "dist", { recursive: true });

for (const f of fs.readdirSync("src/pages")) {
  const [, meta, content] = rd("pages/" + f).match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const m = Object.fromEntries(meta.split("\n").map(l => l.split(/:\s*(.*)/).slice(0, 2)));
  const scripts = (m.scripts || "").split(/\s+/).filter(Boolean).map(s => `<script src="/assets/js/${s}"></script>`).join("\n");
  fs.writeFileSync(path.join("dist", f), layout
    .replace("{{header}}", () => header).replace("{{footer}}", () => footer)
    .replace("{{content}}", () => content).replace("{{scripts}}", () => scripts)
    .replace(/{{title}}/g, () => m.title).replace(/{{description}}/g, () => m.description));
}
console.log("built:", fs.readdirSync("dist").join(", "));
