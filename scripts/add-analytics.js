// Inserts Vercel Web Analytics into index.html. Run after each sync from the artifact.
const fs = require('fs');
const file = require('path').join(__dirname, '..', 'index.html');
const tag = '<script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>\n<script defer src="/_vercel/insights/script.js"></script>\n';
let html = fs.readFileSync(file, 'utf8');
if (html.includes('/_vercel/insights/script.js')) process.exit(0);
const i = html.lastIndexOf('</body>');
if (i < 0) throw new Error('no </body> in index.html');
fs.writeFileSync(file, html.slice(0, i) + tag + html.slice(i));
