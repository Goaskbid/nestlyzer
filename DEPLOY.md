# Publishing Nestlyzer 2.4: GitHub builds the site

Repository: `Goaskbid/nestlyzer`, branch `main`. Domain: nestlyzer.com.

## What changes compared with before

Until 2.3 you uploaded the finished website: 5,800 files. From 2.4 on you upload the **sources**, about 215 files in one zip. GitHub then builds the 5,800 pages itself, tests them in a real browser, and publishes them.

It does this:

- after every push;
- once a month, to check whether Eurostat has published newer population figures. If it has, GitHub refreshes the data by itself.

If a test fails, nothing is published, the live site stays as it is, and GitHub emails you.

This uses one GitHub Actions workflow. For public repositories, Actions minutes are free.

## Step by step (about 15 minutes)

### 1. In GitHub, before you push anything (2 minutes)

Open https://github.com/Goaskbid/nestlyzer in the browser.

1. **Settings → Actions → General → Actions permissions.** Choose **Allow all actions and reusable workflows**. If you prefer a narrower choice, **Allow Goaskbid, and select non-Goaskbid, actions** with "Allow actions created by GitHub" ticked is enough; the workflow uses only GitHub's own actions. Click **Save**.
2. **Settings → Pages → Build and deployment → Source:** change "Deploy from a branch" to **GitHub Actions**.
   - The live site keeps running unchanged until the first new build is published.
   - Check that **Custom domain** still says `nestlyzer.com` and that **Enforce HTTPS** is ticked.

### 2. Replace the old files on your Mac: one paste in Terminal (1 minute)

1. Download `nestlyzer-repo-2.4.0.zip` into your **Downloads** folder. If Safari unzips it into a folder called `nestlyzer-repo-2.4.0`, that is fine too.
2. In GitHub Desktop choose the `nestlyzer` repository and click **Fetch origin** (and **Pull** if offered).
3. Open **Terminal** (Cmd + Space, type Terminal, Enter). Paste this line and press Enter. It must arrive as one line, so copy it from the Word version of this guide or from Claude's message; the PDF breaks long lines.

```
cd ~/Documents/GitHub/nestlyzer && [ -d .git ] && Z=~/Downloads/nestlyzer-repo-2.4.0 && { [ -f "$Z.zip" ] || [ -d "$Z" ]; } && find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} + && { if [ -f "$Z.zip" ]; then unzip -oq "$Z.zip" -d .; else cp -R "$Z/." .; fi; } && grep '"version"' package.json && ls -a
```

What it does, in order:

- goes to the repository folder;
- stops if that folder has no `.git`, so it can never empty the wrong folder;
- stops if the zip (or the folder Safari made from it) is not in Downloads;
- deletes everything except `.git`, which includes all 5,800 old site files and any old `.github` folder;
- puts the new sources in;
- prints `"version": "2.4.0"` and the list of files.

If it prints nothing, a safety check stopped it and nothing was deleted. Usually the repository is in a different folder. In GitHub Desktop use **Repository → Show in Finder** to see where it is. Then in Terminal type `cd `, drag that folder into the Terminal window, and paste the rest of the line starting from `&& [ -d .git ]`.

You should now see, among others: `.github`, `.gitignore`, `build`, `data`, `src`, `tests`, `package.json`, `README.md`.

### 3. One commit, one push (3 minutes)

1. GitHub Desktop lists about 5,800 deleted files and about 215 new or changed ones. That is expected.
2. Summary: `Nestlyzer 2.4`. Click **Commit to main**.
3. Click **Push origin**. This is about 25 MB, so it takes a few seconds to a minute.

### 4. Watch GitHub build it (6 minutes)

1. On github.com open the repository and click the **Actions** tab. A run called "Build and publish nestlyzer.com" is running.
2. After about 5 to 7 minutes it shows a green tick: the **build** job (install, tests, 5,800 pages, browser test) and the **deploy** job.
3. Open https://nestlyzer.com/VERSION.txt. It should say `Nestlyzer 2.4.0`. Reload https://nestlyzer.com once with **Cmd + Shift + R**.

If the run shows a red cross:

- Nothing was published, and the old site is still online.
- Click the run, then the red step, and send me the text or a screenshot.
- The most common cause is step 1.2 being skipped. In that case the "deploy" job says Pages is not set to GitHub Actions. Set it, then click **Re-run all jobs**.

### Undo

In GitHub Desktop: **History**, right-click `Nestlyzer 2.4`, choose **Revert changes in commit**, then **Push origin**. Then set **Settings → Pages → Source** back to **Deploy from a branch → main / (root)**.

## After that: the yearly data refresh runs by itself

- On the 3rd of every month GitHub asks Eurostat whether a newer year of municipal population figures exists. Usually the answer is no, and the run ends after about a minute without publishing anything.
- When a new year appears (Eurostat publishes once a year), GitHub rebuilds the data, runs every test, saves the new data in the repository as a commit called "Data refresh: …", and publishes. You do not need to do anything.
- **Safety gates:**
  - a country is updated only if at least 85% of its places match and its total population moves less than 12%;
  - a single place that jumps by more than half keeps its old figures;
  - if any test fails, nothing is published.
- **One limit to know:** GitHub pauses monthly schedules in public repositories after 60 days without a commit. Then the Actions page shows "This scheduled workflow is disabled". Click **Enable workflow**, or simply push anything. Every push also checks for new data.
- **To run it by hand at any time:** **Actions → Build and publish nestlyzer.com → Run workflow**.

## GitHub limits and where Nestlyzer stands

| Limit | GitHub | Nestlyzer 2.4 |
|---|---|---|
| File size | 100 MB hard limit, warning at 50 MB | largest file 8.4 MB |
| Repository upload | — | about 25 MB zipped, about 215 files |
| Published site | 1 GB | about 204 MB |
| Pages deployments | 10 per hour (soft limit) | 1 per push, at most 1 data refresh per month |
| Actions minutes | free for public repositories | about 6 minutes per push |

## After the push: search engines

1. In Google Search Console (search.google.com/search-console), add `nestlyzer.com`.
2. Under **Sitemaps**, submit `https://nestlyzer.com/sitemap.xml` (5,655 pages).

## After the push: AdSense and Analytics (in your Google accounts)

The site already has:

- the AdSense code for `ca-pub-2870312071451207`;
- the account meta tag;
- `ads.txt`.

Nestlyzer uses **its own consent banner**. Before a visitor presses "Accept all", nothing is loaded from Google. After "Accept all", light Google Analytics and non-personalised ads load.

1. **AdSense: Sites → Add site → nestlyzer.com.** Request review.
2. **AdSense: Privacy & messaging.** Do **not** turn on Google's own European consent message. It would show a second banner. Without it, Google serves non-personalised or limited ads in the EEA, UK and Switzerland, which is what Nestlyzer asks for anyway.
3. **AdSense: Ads → By site → nestlyzer.com → Auto ads on.** Set anchor ads to top or off, and vignettes off.
4. **Google Analytics, property G-HR6G9XFTKZ:**
   - **Admin → Data collection and modification → Data collection:** leave **Google signals off**.
   - **Admin → Data retention:** set **2 months** (the shortest). The privacy policy promises at most 14 months, so 2 or 14 both keep that promise.

## EU and UK representative

With Analytics after consent, Nestlyzer does measure visitors from the EU and UK when they agree. The release report explains the remaining risk and the options.
