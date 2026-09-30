# Decodable, Not Transferable: Latent Actions Across Worlds

Project page for the NeurIPS 2026 Workshop paper (PTA: From Pretrained Representations to Acting Agents).

A plain static site with no build step or dependencies: `index.html`, `static/css/style.css`, `static/js/main.js` and images in `static/images/`.

## Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a new GitHub repository, e.g. `decodable-not-transferable`, and push the contents of this folder to `main`.
2. In the repo, go to **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, then `main` / `(root)`.
3. The site is served at `https://<user-or-org>.github.io/<repo>/`. To get the nicer `https://<name>.github.io` URL, create an organization or user repository named `<name>.github.io` instead.

The `.nojekyll` file makes GitHub serve the files as they are.

## Before going public: TODO

Search `index.html` for `TODO`:

- [x] **Authors and affiliations** (hero) and the **BibTeX** author list.
- [ ] **arXiv** and **Code** buttons: set the `href` and remove the `is-soon` class and the `<span class="soon">` badge.
- [ ] **Paper PDF**: `static/paper.pdf` is currently the anonymized submission, which still has line numbers and "Do not distribute". Replace it with the camera-ready version.
- [ ] **Social preview**: after deploying, change `og:image` to an absolute URL (e.g. `https://…/static/images/social.png`) and add `og:url`.

## Where things live

| What | Where |
|---|---|
| Teaser Q1/Q2/Q3 chart data | `LADDER` in `static/js/main.js` |
| Seen → unseen slope chart data | `SLOPES` in `static/js/main.js` |
| UMAP explorer images and notes | `static/images/umap/*.webp`, `NOTES` / `GAMES` in `main.js` |
| Per-game UMAP points | `PERGAME` in `main.js` (traced from the paper's Figure 9) |
| Colours | CSS variables at the top of `style.css` (`--ada`, `--olaf`, `--vft`, `--accent`) |

The encoder colours (blue, orange, aqua) were checked for colour-blind separation. The paper's own figures use a blue/orange/green set that fails that check.
