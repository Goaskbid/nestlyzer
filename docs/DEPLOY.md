# Publishing Nestlyzer 2.4.1 with the GitHub website only

Repository: `Goaskbid/nestlyzer`, branch `main`. Domain: nestlyzer.com.

## Why the live site still showed the old version

On 11 October the new files were uploaded with **Add file → Upload files**. That upload puts every file in the top folder, so the folders were lost:

- the workflow file `site.yml` ended up beside everything else instead of in `.github/workflows/`, so GitHub never ran it;
- the old `index.html` from June stayed in the top folder, so GitHub Pages kept serving the old site.

Nothing is broken that this guide does not repair. From now on the release comes as **two zip files**. GitHub unpacks them itself, with every folder in place, and removes all the old and loose files in the same step.

You need a web browser and about 15 minutes. You do not need Terminal or GitHub Desktop.

## Files you need (from Claude's message)

| File | What it is |
|---|---|
| `nestlyzer-workflow-site.yml.txt` | The instructions GitHub follows. You paste its text once. |
| `nestlyzer-upload-2.4.1-1-of-2.zip` | Release, part 1 (about 21 MB) |
| `nestlyzer-upload-2.4.1-2-of-2.zip` | Release, part 2 (about 5 MB) |

Do **not** unzip the two zip files. GitHub unpacks them.

## Step 1: two settings (2 minutes), always first

Open https://github.com/Goaskbid/nestlyzer.

1. **Settings → Actions → General → Actions permissions.** Choose **Allow all actions and reusable workflows**, then **Save**.
2. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.
   - Below it, **Custom domain** should still say `nestlyzer.com`, with **Enforce HTTPS** ticked.
   - The old site stays online until the new one is published.

If you forget step 1.2, nothing bad happens. The workflow stops before it changes anything and says "Source must be 'GitHub Actions'". Set it, then use **Re-run all jobs** (step 4).

## Step 2: create the workflow file (3 minutes)

1. On the repository page click **Add file → Create new file**.
2. In the name box type exactly `.github/workflows/site.yml`. The slashes turn into folders as you type; that is correct.
3. Open `nestlyzer-workflow-site.yml.txt` on your Mac (double-click; it opens in TextEdit). Press **Cmd + A**, then **Cmd + C**.
4. Click into the big editor on GitHub and press **Cmd + V**.
5. Click **Commit changes…** and then **Commit changes**.

GitHub starts a first run straight away. It ends after about a minute with a note: "The repository does not hold the complete Nestlyzer sources yet". That is expected.

## Step 3: upload the two zips (2 minutes)

1. Back on the repository page: **Add file → Upload files**.
2. Drag **both** zip files into the window at the same time.
3. Click **Commit changes**.

## Step 4: watch GitHub build it (about 7 minutes)

1. Click the **Actions** tab. A run "Build and publish nestlyzer.com" is running.
2. It does the following, in this order:
   - checks that both parts are there;
   - checks that Pages is set to GitHub Actions;
   - removes all old and loose files;
   - unpacks the release;
   - saves that as one commit called "Nestlyzer 2.4.1: unpacked from the uploaded release, old files removed";
   - builds the 5,656 pages;
   - tests them;
   - publishes.
3. A green tick on both jobs (**build** and **deploy**) means it is live. Open https://nestlyzer.com/VERSION.txt: it should say `Nestlyzer 2.4.1`. Reload https://nestlyzer.com once with **Cmd + Shift + R**.

**If a run shows a red cross:**

- Nothing was published, and the live site is unchanged. Click the run, then the red step, and read the message:
  - **"Source must be 'GitHub Actions'":** do step 1.2, then click **Re-run all jobs**.
  - **"parts [1] of 2 uploaded so far":** upload the missing zip.
- For anything else, send me a screenshot of the red step.

## Later releases

- **New release:** delete nothing. Upload the new zip parts (step 3). The workflow replaces everything except the workflow file.
- **Small change:** editing one file in the browser (for example a text) also rebuilds and publishes the site.

## The yearly data refresh runs by itself

- **The monthly check:** on the 3rd of every month GitHub asks Eurostat whether a newer year of municipal population figures exists. If yes, it rebuilds, tests, saves and publishes. If no, it stops after a minute and publishes nothing.
- **Safety gates:**
  - a country is updated only if at least 85% of its places match and its total moves less than 12%;
  - a place that jumps by more than half keeps its old figures;
  - if any test fails, nothing is published.
- **One limit:** GitHub pauses monthly schedules in public repositories after 60 days without a commit. The Actions page then says "This scheduled workflow is disabled". Click **Enable workflow**, or upload anything. Every run also checks for new data.
- **To run it by hand:** **Actions → Build and publish nestlyzer.com → Run workflow**.

## Undo

- **Before a release is published:** nothing has changed. Just fix the problem the red step names.
- **After it is published:** in the **Actions** tab open the last good run and click **Re-run all jobs**. That republishes exactly that version.

## GitHub limits and where Nestlyzer stands

| Limit | GitHub | Nestlyzer 2.4.1 |
|---|---|---|
| Browser upload | 25 MB per file | parts of 21 MB and 5 MB |
| File size in the repository | 100 MB | largest file 8.4 MB |
| Published site | 1 GB | about 205 MB |
| Pages deployments | 10 per hour (soft limit) | 1 per upload or edit, at most 1 data refresh per month |
| Actions minutes | free for public repositories | about 7 minutes per run |

## After it is live: search engines, AdSense and Analytics

1. **Google Search Console:** add `nestlyzer.com` and submit `https://nestlyzer.com/sitemap.xml` (5,656 pages).
2. **AdSense:**
   - **Sites → Add site → nestlyzer.com**, then request review.
   - Do **not** turn on Google's own European consent message, because Nestlyzer has its own.
   - **Ads → By site → Auto ads on.** Set anchor ads to top or off, and vignettes off.
3. **Google Analytics (G-HR6G9XFTKZ):**
   - keep **Google signals off**;
   - **Admin → Data retention** to 2 months.

Before a visitor presses "Accept all", nothing loads from Google. After "Accept all", light Analytics and non-personalised ads load.
