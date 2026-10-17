# Publish LeakLens using the GitHub website

No VS Code, Git installation, terminal commit commands or repository cloning is needed to upload these files. GitHub still creates a commit when you save an upload; use the website button.

## 1. Create a repository

1. Sign in at https://github.com.
2. Select the + menu near the upper right, then New repository.
3. Repository name: `leaklens`.
4. Suggested description: `Evidence-led cost review by LeakLogic: CSV analysis, human review and TinyFish public vendor research.`
5. Choose Public only if you want this fictional demo and source code public. Public is convenient for GitHub Pages on a free account.
6. Turn Add README on. Leave .gitignore/license templates unselected because the project includes its own ignore file and you should choose a license deliberately.
7. Select Create repository.

## 2. Extract and upload the project

1. Extract the project ZIP on your computer.
2. Open the extracted `leaklens` folder. You should see index.html, README.md, package.json and the CSS/JavaScript/HTML folders.
3. In your repository, select Add file → Upload files.
4. Drag the CONTENTS of the extracted project folder into the upload area. Drag folders too so their structure stays intact. Do not drag an extra outer folder that puts everything under `leaklens/` in the repository.
5. Wait for uploads to finish. Check the listed paths include `CSS/style.css`, `JavaScript/app.js`, `HTML/guide.html` and root `index.html`.
6. Upload the included README.md; it replaces the empty README created earlier.
7. Review the upload list. NEVER include a real `.env`, keys, tokens or financial records. `.env.example` with placeholders is safe.
8. Enter a message such as `Add LeakLens prototype and documentation`.
9. Select Commit changes. This is a browser save; you are not running Git in VS Code.

GitHub browser uploads allow up to 100 files at once and 25 MiB per file; this starter is well below those limits. Upload the extracted files, not only the ZIP: a ZIP alone will not display the README as your project or make the website runnable.

If a dotfile is hidden by your file manager, upload it separately or use Add file → Create new file and name it `.gitignore`, `.env.example` or `.nojekyll`, then paste its supplied content. The empty .nojekyll file is optional for this plain static layout. Use the upload-list paths to verify folder structure.

## 3. Publish the static demo with GitHub Pages

1. Open repository Settings → Pages.
2. Under Build and deployment, choose Deploy from a branch.
3. Choose your default branch (usually main).
4. Choose /(root) as the folder.
5. Select Save and allow the publishing workflow to finish.
6. Return to Settings → Pages for the actual published site link. Use that link; do not assume the site is ready immediately.

GitHub Pages hosts HTML, CSS and browser JavaScript. It does not run the Node backend. CSV import, rules, review and export work on the static demo; live TinyFish calls do not. For a live TinyFish demo, run the included local Node server as described in README.md. Do not solve this by putting an API key into JavaScript.

## 4. Edit later from your browser

Open a file in the repository → click the pencil/Edit button → change its contents → Commit changes. For larger updates, use Add file → Upload files again and upload matching paths. Keep folder names and capitalization unchanged.

## 5. Before sharing

- Confirm README.md and index.html are at the repository root.
- Confirm the demo loads and shows 20 valid rows, 2 rejected rows and 2 findings.
- Label any simulated financial outcomes clearly.
- Add real team names/contact details to README.md if desired.
- Never publish the real .env; browser uploads bypass any protection you expect from .gitignore.
- If a credential was exposed, rotate/revoke it immediately, then address repository history.

Official references:
- https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository
- https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
