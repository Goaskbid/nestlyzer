# Nestlyzer.com - GitHub deployment package

Version: v67-stable-deploy-repair  
Date: 2026-05-15  

## Critical check before upload

`index.html` in this package is the real website. It is about 17 MB.

`CNAME` is a separate tiny file. It contains only:

```text
nestlyzer.com
```

If your live site shows only `nestlyzer.com`, your `index.html` was overwritten with the CNAME text. Re-upload the full `index.html` from this ZIP.

Expected index SHA256:

```text
0e3def663fc41185a7d77625fab9d02359da39a143b102202415c6809eef8f9c
```

## Upload to GitHub

1. Extract this ZIP.
2. Open the extracted folder.
3. Upload the files inside it to the root of the GitHub repository.
4. Confirm the repository root contains `index.html`, `CNAME`, `.nojekyll`, `assets`, `docs`, `project.json`.
5. In GitHub Pages settings, deploy from branch `main`, folder `/root`.
6. Custom domain: `nestlyzer.com`.
7. Enforce HTTPS once available.
