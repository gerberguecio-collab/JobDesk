// Inserts the Vercel-only extras into index.html: Web Analytics.
// Run after each sync from the artifact.
const fs = require('fs');
const file = require('path').join(__dirname, '..', 'index.html');
const tags = [
  ['/_vercel/insights/script.js', '<script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>\n<script defer src="/_vercel/insights/script.js"></script>\n'],
];
let html = fs.readFileSync(file, 'utf8');
for (const [marker, tag] of tags) {
  if (html.includes(marker)) continue;
  const i = html.lastIndexOf('</body>');
  if (i < 0) throw new Error('no </body> in index.html');
  html = html.slice(0, i) + tag + html.slice(i);
}
fs.writeFileSync(file, html);
