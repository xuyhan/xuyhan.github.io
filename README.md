# xuyhan.github.io

My personal website — live at **[han.wales](https://han.wales)** (also served at
`xuyhan.github.io`). Plain HTML/CSS/JS: no build step, no dependencies, no framework.

Quiet, minimalist styling: one self-hosted typeface (EB Garamond), a near-monochrome
palette, and restrained links. The colour theme follows the visitor's OS by default,
with a small top-right toggle to override it (choice persisted in localStorage).
Responsive flexbox layout that reflows on mobile.

## Layout

```
index.html        the whole page — header/bio, news, selected papers
cv.html           web CV (linked from the header; no PDF is published)
stylesheet.css    all styling — :root variables at the top; flip --font to change typeface
script.js         hover-to-animate thumbnails (data-hover) + footer year + theme toggle
fonts/            EB Garamond woff2 — self-hosted variable font, latin subset
images/           portrait, paper thumbnails, favicon
files/            ba-thesis.pdf, meng-thesis.pdf (linked from the CV)
CNAME             custom domain (han.wales)
.nojekyll         serve files as-is — no Jekyll build
```

## Edit

Everything is in `index.html`:

- **News** — one `.item` div per entry, newest first.
- **Papers** — one `.pub` div per paper (newest first). Thumbnails go in `images/`;
  add `data-hover="images/foo.gif"` to an `<img>` to animate on hover.
- **Colours / content width** — CSS variables at the top of `stylesheet.css`.

## Preview locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy

GitHub Pages serves the **`main`** branch (root). Push and the live site updates within a minute:

```bash
git add -A && git commit -m "…" && git push
```

Pages config: **Settings → Pages → Deploy from a branch → `main` / `(root)`.**
