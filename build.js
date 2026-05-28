const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

const ROOT = __dirname;
const RECIPES_DIR = path.join(ROOT, "recipes");
const ASSETS_DIR = path.join(ROOT, "assets");
const SITE_DIR = path.join(ROOT, "site");
const SITE_RECIPES_DIR = path.join(SITE_DIR, "recipes");

// Slugs that contain an actual recipe (ingredients + instructions you could cook from).
// Everything else in recipes/ is a blog post about food. Edit this set to retag.
const RECIPE_SLUGS = new Set([
  "3pm-special-corn-on-the-cob-w-lime-aleppo-butter",
  "chilled-black-bean-soup",
  "cider-donuts-dont-have-cider-in-them-and-i-wont-make-them-everyday",
  "cold-brew-at-clover",
  "csas-are-here",
  "got-a-lot-of-peppers-to-use-up-this-week-make-enzos-pepper-relish",
  "hot-sauce",
  "how-do-you-emulsify-fiber-in-liquid",
  "in-defense-ofrhubarb",
  "popcorn-soda",
  "smoke-sour-cream",
  "sour-cream-dijon-spread-brussels-sprouts",
  "strawberry-soda-recipe",
  "two-drinks-for-you-to-make-this-beautiful-weekend",
  "we-make-our-own-sodas",
  "winter-csa-borscht",
  "winter-csa-parsnip-pear-soup",
  "winter-csa-pickled-carrots",
  "zucchini-cookbook",
]);
const RECIPE_ICON = "🍴";

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: text };
  const meta = {};
  for (const line of match[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1).replace(/\\"/g, '"');
    }
    meta[key] = val;
  }
  return { meta, body: match[2] };
}

const STYLE = `<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
         max-width: 760px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
  a { color: #2a6e2a; }
  img { max-width: 100%; height: auto; border-radius: 4px; }
  h1 { line-height: 1.2; margin-bottom: 0.25rem; }
  .meta { color: #888; font-size: 0.9rem; }
  ul.index { list-style: none; padding: 0; }
  ul.index li { margin: 0.35rem 0; display: flex; gap: 1rem; }
  ul.index .date { color: #888; font-size: 0.85rem; width: 6rem; flex: none; font-variant-numeric: tabular-nums; }
  ul.index .icon { width: 1.5rem; flex: none; text-align: center; }
  .nav { margin-bottom: 1.5rem; }
  hr { border: none; border-top: 1px solid #ddd; margin: 2rem 0; }
</style>`;

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>${STYLE}</head><body>${body}</body></html>
`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function ensureAssetsLink() {
  const link = path.join(SITE_DIR, "assets");
  try {
    const stat = fs.lstatSync(link);
    if (stat.isSymbolicLink() || stat.isDirectory()) return;
  } catch {}
  // Relative symlink so the site/ directory stays portable.
  fs.symlinkSync(path.relative(SITE_DIR, ASSETS_DIR), link, "dir");
}

function build() {
  fs.mkdirSync(SITE_RECIPES_DIR, { recursive: true });
  ensureAssetsLink();

  const recipes = fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const text = fs.readFileSync(path.join(RECIPES_DIR, file), "utf8");
      const { meta, body } = parseFrontmatter(text);
      return { file, slug: file.replace(/\.md$/, ""), body, ...meta };
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  for (const r of recipes) {
    // Paths in markdown already use ../assets/... which is correct from site/recipes/.
    const html = marked.parse(r.body);
    const source = r.url
      ? `<p class="meta">Source: <a href="${escapeHtml(r.url)}">${escapeHtml(r.url)}</a></p>`
      : "";
    const body =
      `<p class="nav"><a href="../index.html">← all recipes</a></p>${html}<hr>${source}`;
    const out = path.join(SITE_RECIPES_DIR, `${r.slug}.html`);
    fs.writeFileSync(out, page(escapeHtml(r.title || r.slug), body));
  }

  const items = recipes
    .map((r) => {
      const icon = RECIPE_SLUGS.has(r.slug) ? RECIPE_ICON : "";
      return `<li><span class="date">${r.date || ""}</span><span class="icon">${icon}</span><a href="recipes/${encodeURIComponent(r.slug)}.html">${escapeHtml(r.title || r.slug)}</a></li>`;
    })
    .join("");
  const indexBody = `<h1>Clover Recipes</h1><p class="meta">${recipes.length} posts from cloverfoodlab.com/category/recipes-menu/</p><ul class="index">${items}</ul>`;
  fs.writeFileSync(path.join(SITE_DIR, "index.html"), page("Clover Recipes", indexBody));

  console.log(`Built ${recipes.length} recipes → ${path.relative(ROOT, SITE_DIR)}/`);
}

build();
