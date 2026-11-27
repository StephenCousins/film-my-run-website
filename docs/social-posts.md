# Social posts: news stories to Facebook and Instagram

Added 26 Nov 2026. Code: `src/lib/social/`. Admin page: `/admin/social`.

## What it does

When the news pipeline publishes a story (the daily run, `news:story`, or `news:publish`), it can make one post
for the Film My Run Facebook Page and Instagram account. **At most one a day** (see the rules below):

1. **A card**, 1080x1350 (Instagram's portrait shape, fine on Facebook): the story photo full width at the top,
   fading into a dark panel with a tag pill (BREAKING, RESULTS, RACE NEWS or ULTRA), a big headline with its key
   words in the brand orange, the photo credit, and the Film My Run logo and filmmyrun.com. Fonts are the site's
   (Space Grotesk and Inter, bundled in `assets/fonts`). `src/lib/social/card.ts`.
2. **The words**: Claude writes a short headline for the card (60 characters or so, facts from the story only) and
   a caption of 1 to 3 short, punchy sentences, hook first (about 220 characters; anything over 300 is cut back to
   its last full sentence). Code then adds, in this order: the link (Facebook: `Full story:
   https://filmmyrun.com/news/<slug>`; Instagram can't link from a caption, so `Full story: link in bio`), the photo
   credit (`📷 Photo: ...`), and 3 to 6 hashtags. `src/lib/social/copy.ts`.
3. **Posting** through Meta's official Graph API (`src/lib/social/meta.ts`, version in `GRAPH_VERSION`): the card is
   stored on R2 at `social/<slug>.jpg` (Meta fetches it from there), then posted to the Page, then to Instagram
   (make a media container, wait until Instagram says it is ready, publish, read the post's link). The two are
   independent: if one fails the other still goes out, and the log says which ("partial").

Every story that reaches this step gets one row in `social_posts`: posted, partial, skipped or failed, with the
reason. That is what `/admin/social` shows.

## The rules

- **No real photo, no post** (Stephen). Skipped, with the reason, when:
  - the story has no image (`no photo`);
  - its image is the branded fallback card, which `storyImage()` uses when no source photo works and
    `news:publish` always uses (`branded fallback`);
  - the source photo was under 900px wide (`photo too small`; 1080 until 27 Nov 2026, lowered by Stephen as too many news photos missed it). The site stores every news photo at 1200x675,
    upscaling small ones, so the stored copy says nothing; the original width is recorded when the photo is picked
    (`news_stories.image_source_width`, from 26 Nov 2026). Older stories have no width and are skipped.
- **One post a day at most** (Stephen, 26 Nov 2026), counted per UK calendar day (midnight to midnight,
  Europe/London) from the posts that went out (posted or partial). `SOCIAL_CONFIG.maxPostsPerDay` in
  `src/lib/social/rules.ts`; there is no admin setting for it. Any later story that day is skipped with
  `daily cap reached`.
- **A quiet day is fine.** If no story that day has a good enough photo, nothing is posted. That is not an error:
  there is no alert and no extra email. The skipped rows are still on `/admin/social`, so you can see why.
- **When one news run publishes several stories with good photos, the newest goes out** (latest `published_at`;
  if two are level, the more important one). The daily run publishes all its stories first, then picks
  (`planSocialRun` in `rules.ts`, called at the end of `runNews`). The others get a skipped row saying
  `not chosen today`, or their photo problem, made without asking Claude or making a card, so they cost nothing.
  If today's post already went out (say an earlier `news:publish`), nothing from the run is posted. `news:story`
  publishes one story, and `news:publish` posts its story straight away; the one-a-day cap applies to both.
- **Never twice.** One row per story (a unique key on `story_id`); a story that already has a row is left alone. The
  row is made before anything is posted, so even a crash part way can't lead to a second post.
- **Dry runs** publish nothing, so they make no social post.
- **It never stops the news.** Any error is caught and recorded as a failed row; the story stays published.
- The photo and cap checks come before Claude is asked anything, so a skip costs nothing.
- **The news-run email** lists social posts that went out (`posted`, `partial`) and any that `failed`. The expected
  skips (`no photo`, `branded fallback`, `photo too small`, `daily cap reached`, `not chosen today`) are left out
  (`isQuietSkip` in `rules.ts`). Other skips, such as `posting switched off` or an account-lock refusal, still show.

## The on/off switch, and "inert" mode

Nothing goes to Facebook or Instagram unless **all** of these hold:

1. the switch on `/admin/social` is **on** (stored in the `settings` table, key `social_posting_enabled`; off when
   missing, which is the default);
2. all five Meta settings are present on the news workflow (GitHub secrets; a missing secret arrives as an empty
   string, which counts as not set):

   | Setting | What it is | Film My Run's value |
   |---|---|---|
   | `META_FB_PAGE_ID` | the Facebook Page's ID (a number) | from Meta, step 7 below |
   | `META_IG_USER_ID` | the Instagram account's ID (a number, not the @name) | from Meta, step 8 below |
   | `META_FB_PAGE_ACCESS_TOKEN` | a **Page** access token for the Film My Run Page only | from Meta, step 6 below |
   | `META_FB_PAGE_USERNAME_EXPECTED` | the Page's username, as in facebook.com/... | `filmmyrun` |
   | `META_IG_USERNAME_EXPECTED` | the Instagram @username, without the @ | `filmmyrun` |

   `.env.example` lists them with the two usernames filled in and the IDs and token blank;
3. the account lock passes (next section).

When the switch is off or a setting is missing, the step still writes the headline and captions and stores the card
on R2, then records a **skipped** row (`posting switched off` or `Meta settings not set`). So `/admin/social` shows
exactly what would have gone out, card included, before anything is switched on. That costs one Claude call per
story with a usable photo (a few cents of the Claude API credit at most, or nothing on the Claude Code subscription)
and one small R2 upload. If the R2 upload fails while not posting, the row is kept without a card.

The admin page shows the locked targets (`facebook.com/<username> (ID …last 4)` and `@<username>`) and whether all
five settings are present, yes or no; it never shows the token. It reads the website's own settings on Railway, but
the posts are made by the news run on GitHub, so the GitHub secrets are what really count. To make the admin page's
"locked to" lines show, add the four non-secret values (the two IDs and two usernames) on Railway too; the token is
only needed on GitHub.

## The account lock

Stephen's Meta login also manages other Pages and Instagram accounts, NoblePro's among them (for example Instagram
@nobleprorunner). Posts must only ever go to Film My Run's. So:

- **The targets come only from the settings above.** The code never asks Meta for "the Pages this login manages"
  (`/me/accounts`) and never picks one; it posts to the two IDs it is given and nothing else.
- **The token is a Page token for the Film My Run Page,** not a personal (user) token. A user token could post to any
  Page Stephen runs; a Page token can only act as that one Page.
- **Before every post** (every story, not once per run), the news run asks Meta three questions, with the token in
  the request header (never in an address that could be logged):
  1. Whose token is this? (`GET /me?fields=id`.) A Page token answers with the Page's own ID; anything else means
     "the token is not the Film My Run Page token".
  2. What is this Page's username? (`GET /<META_FB_PAGE_ID>?fields=username,name`.) It must be `filmmyrun`. The
     username is what counts, not the display name, which anyone can set to anything; the name only appears in the
     message for information.
  3. What is this Instagram account's username? (`GET /<META_IG_USER_ID>?fields=username`.) It must be `filmmyrun`.

  Usernames are compared ignoring capitals, spaces round the edges and a leading @; otherwise they must match
  exactly (`filmmyrun2` does not match).
- **If anything doesn't match, or Meta can't be asked** (an error, a timeout, no username returned), nothing is
  posted to either Facebook or Instagram, the story gets a skipped row saying why (e.g. `account lock: Instagram
  account is 'nobleprorunner', expected 'filmmyrun'; posting switched off`), and **the switch on `/admin/social` is
  turned off**, so no later story in that run (or any run) posts until someone has looked. The admin page shows the
  refusal in red next to the switch. Fix the settings, then switch back on.

## Cost

The copy uses `completeJsonClaudeFirst` with `claude: 'opus'`: the Claude API key (Opus 5.5) first, then Claude
Code, then OpenRouter (`anthropic/claude-opus-5.5`). As in the news run, OpenRouter spend goes into the run's
`cost_usd` (the £15 ceiling) and Claude key spend into `claude_cost_usd` via `claudeCreditSpentThisRun()`. Each
`social_posts` row also keeps its own `cost_usd` and `claude_cost_usd`. Posting to Meta is free.

## The tag

`storyTag()` in `src/lib/social/tag.ts`, in this order: **RESULTS** when the title reports an outcome (wins, won,
results, record, podium, champion...) and neither title nor excerpt is about a ban, doping, a pull-out, an injury, a
death, an investigation, police, a disqualification, a course change or a cancellation; **BREAKING** for importance 8 or more (`NEWS_CONFIG.bigStory`),
published in the last 24 hours, and hard news (a feed item sorted as "news", none a "preview"); **ULTRA** for trail and
ultra stories; **RACE NEWS** for the rest. BREAKING has a red pill, the others orange.

## Trying it without posting

```bash
npm run social:sample -- stories.json out/
```

`stories.json` is a list of `{ slug, title, excerpt, content, image_url, photo_credit, topic, importance, tag? }`
(`image_url` can be a web address or a local file). For each story it writes `<slug>.png` (the card) and `<slug>.txt`
(headline, tag, both captions), using the real copy and card code. No database, no R2, no Meta.

## Setting up Meta (step by step, once)

Meta moves these screens around often; the names below were right in late 2026. Take your time on steps 1 and 2:
everything else depends on them.

1. **A Meta Business account (Business portfolio).** Go to <https://business.facebook.com>, sign in with your own
   Facebook account and create a business portfolio for Film My Run if there isn't one. Add the Film My Run Facebook
   Page to it (Settings → Accounts → Pages → Add).
2. **Instagram as a professional account, linked to the Page.** In the Instagram app: Settings → Account type and
   tools → Switch to professional account (Business is fine). Then link it to the Facebook Page: on the Page,
   Settings → Linked accounts → Instagram → Connect. In the business portfolio, add the Instagram account too
   (Accounts → Instagram accounts).
3. **A Meta developer app.** Go to <https://developers.facebook.com>, register as a developer if asked, then My
   Apps → Create app. Choose the "Other" use case and app type **Business**, and attach it to the Film My Run
   business portfolio. Add the products **Facebook Login for Business** and **Instagram** (the "Instagram API with
   Facebook Login" option).
4. **Permissions.** The token needs: `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`,
   `instagram_basic` and `instagram_content_publish` (and `business_management` if Meta asks for it when making a
   system user token).
5. **App Review and business verification.** Because the app only ever posts to your own Page and Instagram, and
   you are an admin of the app, "Standard Access" to these permissions is normally enough and no App Review is
   needed. Put the app in **Live** mode (App settings → Basic: add the privacy policy URL
   `https://filmmyrun.com/privacy` and a category, then flip the switch at the top) so posts are public. If Meta
   insists on App Review or business verification for a permission, follow its prompts: verification asks for
   business documents; App Review asks for a short screen recording of the app posting to your own Page.
6. **A Page access token for the Film My Run Page only.** Not a personal (user) token: the account lock refuses
   one. The simplest lasting way is a **system user**: in the business portfolio, Settings → Users → System users →
   Add (role Admin). Under "Assign assets", give it the **Film My Run Page only** (and the Film My Run Instagram
   account only), not any NoblePro asset, plus the app. Then "Generate new token": choose the app, expiry
   **Never**, tick the permissions from step 4, and copy it. That is a user-type token for the system user, so turn it
   into the Page's own token: in the Graph API Explorer (<https://developers.facebook.com/tools/explorer>), paste it
   as the access token and run `GET /<the Film My Run Page ID>?fields=access_token`. The `access_token` in the reply
   is the Page token, and it doesn't expire. Check it: with that Page token, `GET /me?fields=id,name` must answer
   with the Film My Run Page's ID and name. (Asking for that one Page by its ID is deliberate: listing all your Pages
   would put NoblePro's in the same reply, and the website never does that.) Treat the token like a password: only
   ever paste it into the GitHub secret.
7. **The Page ID.** On the Film My Run Facebook Page (facebook.com/filmmyrun): About → Page transparency shows the
   Page ID. Or with the Page token in the Graph API Explorer: `GET /me?fields=id,username` (username must say
   `filmmyrun`).
8. **The Instagram user ID** (a number, not the @name): with the Page token in the Graph API Explorer,
   `GET /<page-id>?fields=instagram_business_account` returns `{ "instagram_business_account": { "id": "1784..." } }`.
   Check it: `GET /<that id>?fields=username` must say `filmmyrun`, not `nobleprorunner`.
9. **Five GitHub secrets.** On GitHub: the film-my-run-website repo → Settings → Secrets and variables → Actions →
   New repository secret, once for each:
   - `META_FB_PAGE_ID`: the number from step 7
   - `META_IG_USER_ID`: the number from step 8
   - `META_FB_PAGE_ACCESS_TOKEN`: the Page token from step 6
   - `META_FB_PAGE_USERNAME_EXPECTED`: `filmmyrun`
   - `META_IG_USERNAME_EXPECTED`: `filmmyrun`

   The news workflow already passes all five to the run (`.github/workflows/news-daily.yml`). Optionally add the
   two IDs and two usernames (not the token) on Railway too, so `/admin/social` can show what it is locked to.
10. **Look before switching on.** Let a news run or two go by: `/admin/social` will show the cards and captions it
    would have posted, as "skipped: posting switched off". When you're happy, press **Switch on**. Before the first
    post the account lock checks the Page, the Instagram account and the token; if any is wrong you'll see the
    reason in red on `/admin/social` and the switch will be off again. Switch off at any time on the same page; it
    takes effect from the next story.

If a post fails, the reason is on `/admin/social` (and in the run email: "Social post failed: ..."). An "Invalid
OAuth access token" (code 190) means the token has expired or been revoked: make a new one (step 6) and replace the
`META_FB_PAGE_ACCESS_TOKEN` secret.
