# Blog Post Writing Project

Track progress on creating blog posts for races with video but no written report.

**Last Updated:** 2026-01-27

---

## Project Overview

- **Total Races in Video Archive:** 76
- **Races Already Having Blog Posts:** ~50+ (migrated from WordPress)
- **Races Confirmed Missing Blog Posts:** See list below
- **Blog Posts Written This Project:** 1 (Transgrancanaria 2022 - enhanced format)

### Races Confirmed Missing Blog Posts

These races have videos but NO existing blog post in the database:

| Year | Race | Notes |
|------|------|-------|
| 2024 | Paris Olympic Marathon | |
| 2024 | Paris Marathon | |
| 2024 | SDW100 | South Downs Way 100 |
| 2023 | UTMB 100 | The big one - Chamonix |
| 2023 | Paris Marathon | Sub-3 attempt? |
| 2023 | Country to Capital | 45mi ultra |
| 2023 | Purbeck 16 | |
| 2022 | Autumn 100 | Centurion |
| 2022 | Purbeck Plod | |
| 2021 | NDW100 | North Downs Way 100 |
| 2019 | NDW100 | North Downs Way 100 |
| 2019 | Cape Wrath Ultra | 8-day stage race |
| 2018 | Lakeland 100 | |
| 2018 | SDW100 | South Downs Way 100 |
| 2017 | UTMB CCC | |
| 2017 | UTMB OCC | |

### Resources Available
- **Transcripts Downloaded:** 39
- **Transcripts Pending (rate limited):** 37
- **Strava Embed Codes:** 71
- **Screenshots:** 22 (Strava race analysis)

---

## Transcript Rate Limiting Status

**Last Checked:** 2026-01-27

### Current Situation

YouTube is actively rate-limiting this IP address (HTTP 429 "Too Many Requests"). The IP block occurred during the initial bulk transcript fetch and has not yet expired.

**Tested with:**
- `youtube-transcript-api` Python library (v1.2.3)
- `yt-dlp` subtitle download
- Both return IP blocked errors

**Note:** The `api.list()` method works (can see transcripts exist), but `api.fetch()` is blocked.

### Workarounds

| Option | Description |
|--------|-------------|
| **Wait** | IP block may expire after hours/days |
| **VPN** | Connect from a different IP address |
| **Different network** | Try from mobile hotspot or different WiFi |
| **Manual copy** | Copy transcript text manually from YouTube |
| **Browser cookies** | Export cookies from logged-in YouTube session |

### Transcripts Available for Blog Writing

These races have transcripts downloaded and likely don't have blog posts yet:

| Race | Date | Distance | Transcript File |
|------|------|----------|-----------------|
| Serpent Trail 100k | 03/07/2021 | 62mi | `03-07-2021_serpent-trail-100k.txt` |
| Centurion CROC 100 | 30/05/2020 | 100mi | `30-05-2020_centurion-croc-100.txt` |
| South Downs Way 100 | 09/06/2018 | 100mi | `09-06-2018_south-downs-way-100.txt` |
| UTMB CCC | 31/08/2018 | 62mi | `31-08-2018_utmb-ccc.txt` |
| Tenerife Bluetrail | 07/06/2019 | 62mi | `07-06-2019_tenerife-bluetrail.txt` |
| 1066 Ultramarathon | 07/07/2019 | 100mi | `07-07-2019_1066-ultramarathon.txt` |
| Run Jurassic Ultra | 28/09/2019 | 31mi | `28-09-2019_run-jurassic-ultra.txt` |
| Atlantic Coast Challenge Day 1 | 06/10/2017 | 26.2mi | `06-10-2017_atlantic-coast-challenge-day-1.txt` |
| Atlantic Coast Challenge Day 2 | 07/10/2017 | 26.2mi | `07-10-2017_atlantic-coast-challenge-day-2.txt` |
| Atlantic Coast Challenge Day 3 | 08/10/2017 | 26.2mi | `08-10-2017_atlantic-coast-challenge-day-3.txt` |
| Mouth to Mouth Marathon | 02/12/2018 | 27mi | `02-12-2018_mouth-to-mouth-marathon.txt` |
| Sunrise Ultra | 11/12/2021 | 83mi | `11-12-2021_sunrise-ultra.txt` |
| Dark Star River Marathon | 06/01/2022 | 28mi | `06-01-2022_dark-star-river-marathon.txt` |
| Paris Marathon 2022 | 03/04/2022 | 26.2mi | `03-04-2022_paris-marathon.txt` |
| Larmer Tree Marathon | 31/07/2021 | 26.2mi | `31-07-2021_larmer-tree-marathon.txt` |
| Paris Marathon 2021 | 17/10/2021 | 26.2mi | `17-10-2021_paris-marathon.txt` |
| Guernsey GU36 | 19/05/2019 | 36mi | `19-05-2019_guernsey-gu36.txt` |
| GUN 31 Guernsey | 17/11/2019 | 29mi | `17-11-2019_gun-31-guernsey.txt` |
| Bewl Water Marathon | 19/09/2020 | 26.2mi | `19-09-2020_bewl-water-marathon.txt` |
| Vanguard Way Marathon | 02/08/2020 | 26.2mi | `02-08-2020_vanguard-way-marathon.txt` |
| Virtual London | 04/10/2020 | 26.2mi | `04-10-2020_virtual-london.txt` |

### Transcripts Blocked (Need Retry Later)

These 37 races have videos but transcripts couldn't be downloaded due to IP blocking:

- Three Forts Challenge (2022), Guernsey GU36 (2022), UTS 50k (2022)
- Montane Lakeland 100 (2022), Ben Nevis Ultra (2022), Berlin Marathon (2022)
- London Marathon (2022), Beachy Head Marathon (2022)
- Steyning Stinger (2023), **Paris Marathon 2023 (SUB-3!)**, Manchester Marathon (2023)
- Thames Path 100 (2023), South Downs Way 100 (2023), North Downs Way 100 (2023)
- **UTMB 100 (2023)**, Autumn 100 (2023), Beachy Head Marathon (2023)
- Steyning Stinger (2024), Brighton Marathon (2024), London Marathon (2024)
- **Cape Wrath Ultra Days 2,3,5,6,7 (2024)**, South Downs Way 100 (2024)
- Race to the Stones (2024), UTMB OCC (2024), Winter on the Downs (2024)
- Transgrancanaria Classic (2025), Brighton Marathon (2025), Manchester Marathon (2025)
- Ridgeway Challenge (2025), Race to the King (2025), Race to the Stones (2025)
- Hurtwood 50k (2025)

---

## Resources Available Per Race

| Resource | Description |
|----------|-------------|
| **YouTube Video** | Race footage with auto-generated captions |
| **Transcript** | Extracted from YouTube (when available) |
| **Strava Activity** | GPS data, photos, stats, description |
| **Strava Embed Code** | Collected for 71 races (see `data/strava-embeds.json`) |
| **Screenshots** | 22 Strava race analysis screenshots (see below) |
| **Centurion Reports** | RD race reports for Centurion 100s (see below) |
| **Race Research** | Web research on conditions, results, context (see below) |
| **Race Data** | From spreadsheet (time, position, elevation) |

---

## Progress Tracker

### Legend
- [ ] Not started
- [T] Transcript downloaded
- [S] Strava data gathered
- [D] Draft written
- [x] Published

---

## 2015

| Status | Date | Race | Distance | Time | Transcript | Strava |
|--------|------|------|----------|------|------------|--------|
| [T] | 03/05/2015 | Three Forts Challenge | 27.2mi | 04:27:23 | ✅ | [Link](https://www.strava.com/activities/297445792) |

---

## 2016

| Status | Date | Race | Distance | Time | Transcript | Strava |
|--------|------|------|----------|------|------------|--------|
| [T] | 15/02/2016 | Phoenix Breakfast Run | 26.2mi | 04:27:50 | ✅ | [Link](https://www.strava.com/activities/494099686) |
| [T] | 29/05/2016 | Weald Ultra 50k | 31mi | 05:19:30 | ✅ | [Link](https://www.strava.com/activities/591989654) |
| [T] | 21/08/2016 | Bad Cow Marathon | 26.2mi | 04:01:05 | ✅ | [Link](https://www.strava.com/activities/683666336) |
| [ ] | 18/09/2016 | Purbeck Marathon | 26.2mi | 04:55:09 | ❌ Disabled | [Link](https://www.strava.com/activities/717166698) |

---

## 2017

| Status | Date | Race | Distance | Time | Transcript | Strava |
|--------|------|------|----------|------|------------|--------|
| [T] | 28/05/2017 | Dorchester Marathon | 26.2mi | 04:41:41 | ✅ | [Link](https://www.strava.com/activities/1009882616) |
| [T] | 06/10/2017 | Atlantic Coast Challenge Day 1 | 26.2mi | 04:49:00 | ✅ | [Link](https://www.strava.com/activities/1217791516) |
| [T] | 07/10/2017 | Atlantic Coast Challenge Day 2 | 26.2mi | 04:51:22 | ✅ | [Link](https://www.strava.com/activities/1219026570) |
| [T] | 08/10/2017 | Atlantic Coast Challenge Day 3 | 26.2mi | 06:29:48 | ✅ | [Link](https://www.strava.com/activities/1221431431) |

---

## 2018

| Status | Date | Race | Distance | Time | Transcript | Strava |
|--------|------|------|----------|------|------------|--------|
| [T] | 11/03/2018 | Southend Pier Marathon | 26.2mi | 03:29:01 | ✅ | [Link](https://www.strava.com/activities/1447520971) |
| [T] | 08/04/2018 | Paris Marathon | 26.2mi | 04:23:08 | ✅ | [Link](https://www.strava.com/activities/1496548125) |
| [T] | 06/05/2018 | Three Forts Challenge | 27.2mi | 04:22:31 | ✅ | [Link](https://www.strava.com/activities/1554001954) |
| [T] | 09/06/2018 | South Downs Way 100 | 100mi | 24:44:57 | ✅ | [Link](https://www.strava.com/activities/1629802466) |
| [T] | 29/06/2018 | Marathon Madness Day 5 | 26.2mi | 04:31:34 | ✅ | [Link](https://www.strava.com/activities/1670511189/) |
| [T] | 11/08/2018 | RAT Plague | 62mi | 15:13:20 | ✅ | [Link](https://www.strava.com/activities/1765332651) |
| [T] | 31/08/2018 | UTMB - CCC | 62mi | 23:57:30 | ✅ | [Link](https://www.strava.com/activities/1811612798) |
| [T] | 08/09/2018 | Crafty Fox Marathon | 26.2mi | 05:14:51 | ✅ | [Link](https://www.strava.com/activities/1827391317) |
| [T] | 16/09/2018 | Purbeck Marathon | 26.2mi | 05:17:54 | ✅ | [Link](https://www.strava.com/activities/1845612591) |
| [T] | 27/10/2018 | Beachy Head Marathon | 26.2mi | 04:05:40 | ✅ | [Link](https://www.strava.com/activities/1929935557) |
| [T] | 02/12/2018 | Mouth to Mouth Marathon | 27mi | 04:10:42 | ✅ | [Link](https://www.strava.com/activities/1996279903) |

---

## 2019

| Status | Date | Race | Distance | Time | Transcript | Strava |
|--------|------|------|----------|------|------------|--------|
| [D] | 01/02/2019 | Arc of Attrition 100 | 100mi | 28:31:46 | ✅ | [Link](https://www.strava.com/activities/2121357724) |
| [T] | 19/05/2019 | Guernsey GU36 | 36mi | 07:57:31 | ✅ | [Link](https://www.strava.com/activities/2381394407/) |
| [T] | 07/06/2019 | Tenerife Bluetrail | 62mi | 22:02:42 | ✅ | [Link](https://www.strava.com/activities/2436838267) |
| [T] | 07/07/2019 | 1066 Ultramarathon | 100mi | 26:46:02 | ✅ | [Link](https://www.strava.com/activities/2511519558/) |
| [T] | 28/09/2019 | Run Jurassic Ultra | 31mi | 05:47:00 | ✅ | [Link](https://www.strava.com/activities/2746643160) |
| [T] | 17/11/2019 | Gun 31 Guernsey | 29mi | 07:08:07 | ✅ | [Link](https://www.strava.com/activities/2870620034) |

---

## 2020

| Status | Date | Race | Distance | Time | Transcript | Strava |
|--------|------|------|----------|------|------------|--------|
| [T] | 30/05/2020 | Centurion CROC 100 | 100mi | 27:42:30 | ✅ | [Link](https://www.strava.com/activities/3540444968/) |
| [T] | 02/08/2020 | Vanguard Way Marathon | 26.2mi | 04:15:33 | ✅ | [Link](https://www.strava.com/activities/3853288567) |
| [T] | 19/09/2020 | Bewl Water Marathon | 26.2mi | 04:02:35 | ✅ | [Link](https://www.strava.com/activities/4081713025/) |
| [T] | 04/10/2020 | Virtual London | 26.2mi | 03:24:49 | ✅ | [Link](https://www.strava.com/activities/4149326190) |
| [D] | 06/12/2020 | Goodwood Marathon | 26.2mi | 02:58:57 | ✅ | [Link](https://www.strava.com/activities/4437234030/) |

---

## 2021

| Status | Date | Race | Distance | Time | Transcript | Strava |
|--------|------|------|----------|------|------------|--------|
| [T] | 03/07/2021 | Serpent Trail 100k | 62mi | 13:41:59 | ✅ | [Link](https://www.strava.com/activities/5570031687) |
| [D] | 09/07/2021 | Val D'Aran 100 | 100mi | 46:50:32 | ✅ | [Link](https://www.strava.com/activities/5613391071) |
| [T] | 31/07/2021 | Larmer Tree Marathon | 26.2mi | 05:25:05 | ✅ | [Link](https://www.strava.com/activities/5715800858) |
| [T] | 24/08/2021 | TDS Bourg Saint Mauritz | 34mi | 09:26:57 | ✅ | [Link](https://www.strava.com/activities/5850188498) |
| [T] | 17/10/2021 | Paris Marathon | 26.2mi | 03:57:30 | ✅ | [Link](https://www.strava.com/activities/6126442860) |
| [T] | 11/12/2021 | Sunrise Ultra | 83mi | 22:53:53 | ✅ | [Link](https://www.strava.com/activities/6375524895) |

---

## 2022

| Status | Date | Race | Distance | Time | Transcript | Strava |
|--------|------|------|----------|------|------------|--------|
| [T] | 06/01/2022 | Dark Star River Marathon | 28mi | 03:58:05 | ✅ | [Link](https://www.strava.com/activities/6640152548) |
| [D] | 04/03/2022 | Transgrancanaria Classic | 80mi | 26:46:10 | ✅ | [Link](https://www.strava.com/activities/6780215292) |
| [T] | 03/04/2022 | Paris Marathon | 26.2mi | 03:47:29 | ✅ | [Link](https://www.strava.com/activities/6925144074/) |
| [ ] | 01/05/2022 | Three Forts Challenge | 27.2mi | 4:46:16 | ⏳ Rate limited | [Link](https://www.strava.com/activities/7070416017) |
| [ ] | 15/05/2022 | Guernsey GU36 | 36mi | 7:46:39 | ⏳ Rate limited | [Link](https://www.strava.com/activities/7147118189/) |
| [ ] | 01/07/2022 | UTS 50k | 32mi | 11:16:17 | ⏳ Rate limited | [Link](https://www.strava.com/activities/7405081701) |
| [ ] | 29/07/2022 | Montane Lakeland 100 | 105mi | 34:36:56 | ⏳ Rate limited | [Link](https://www.strava.com/activities/7560717387) |
| [ ] | 18/09/2022 | Ben Nevis Ultra | 32mi | 12:28:00 | ⏳ Rate limited | [Link](https://www.strava.com/activities/7830440608) |
| [ ] | 25/09/2022 | Berlin Marathon | 26.2mi | 03:24:19 | ⏳ Rate limited | [Link](https://www.strava.com/activities/7864147749) |
| [ ] | 02/10/2022 | London Marathon | 26.2mi | 03:23:12 | ⏳ Rate limited | [Link](https://www.strava.com/activities/7900186538) |
| [ ] | 22/10/2022 | Beachy Head Marathon | 26.2mi | 4:12:07 | ⏳ Rate limited | [Link](https://www.strava.com/activities/8001669996) |

---

## 2023

| Status | Date | Race | Distance | Time | Transcript | Strava |
|--------|------|------|----------|------|------------|--------|
| [ ] | 05/03/2023 | Steyning Stinger | 26.2mi | 3:44:38 | ⏳ Rate limited | [Link](https://www.strava.com/activities/8663424949) |
| [ ] | 02/04/2023 | Paris Marathon (SUB-3!) | 26.2mi | 2:55:42 | ⏳ Rate limited | [Link](https://www.strava.com/activities/8817494706) |
| [ ] | 16/04/2023 | Manchester Marathon | 26.2mi | 2:57:44 | ⏳ Rate limited | [Link](https://www.strava.com/activities/8900318667) |
| [ ] | 06/05/2023 | Thames Path 100 | 100mi | 27:16:56 | ⏳ Rate limited | [Link](https://www.strava.com/activities/9027525271) |
| [ ] | 10/06/2023 | South Downs Way 100 | 100mi | 29:18:49 | ⏳ Rate limited | [Link](https://www.strava.com/activities/9246176643) |
| [ ] | 05/08/2023 | North Downs Way 100 | 100mi | 28:51:32 | ⏳ Rate limited | [Link](https://www.strava.com/activities/9593196170) |
| [ ] | 01/09/2023 | UTMB 100 | 110mi | 44:47:11 | ⏳ Rate limited | [Link](https://www.strava.com/activities/9778352079) |
| [ ] | 14/10/2023 | Autumn 100 | 100mi | 27:20:04 | ⏳ Rate limited | [Link](https://www.strava.com/activities/10043131534) |
| [ ] | 21/10/2023 | Beachy Head Marathon | 26.2mi | 4:50:07 | ⏳ Rate limited | [Link](https://www.strava.com/activities/10077587570) |

---

## 2024

| Status | Date | Race | Distance | Time | Transcript | Strava |
|--------|------|------|----------|------|------------|--------|
| [ ] | 03/03/2024 | Steyning Stinger | 26.2mi | 5:11:19 | ⏳ Rate limited | [Link](https://www.strava.com/activities/10881236710) |
| [ ] | 07/04/2024 | Brighton Marathon | 26.2mi | 3:57:50 | ⏳ Rate limited | [Link](https://www.strava.com/activities/11128966682) |
| [ ] | 21/04/2024 | London Marathon | 26.2mi | 3:23:44 | ⏳ Rate limited | [Link](https://www.strava.com/activities/11232181505) |
| [ ] | 20/05/2024 | Cape Wrath Ultra Day 2 | 35mi | 10:23:26 | ⏳ Rate limited | [Link](https://www.strava.com/activities/11466713056) |
| [ ] | 21/05/2024 | Cape Wrath Ultra Day 3 | 42mi | 14:27:28 | ⏳ Rate limited | [Link](https://strava.com/activities/11643965090) |
| [ ] | 23/05/2024 | Cape Wrath Ultra Day 5 | 26.2mi | 7:04:29 | ⏳ Rate limited | [Link](https://strava.com/activities/11479069313) |
| [ ] | 24/05/2024 | Cape Wrath Ultra Day 6 | 42mi | 11:46:53 | ⏳ Rate limited | [Link](https://www.strava.com/activities/11498252524) |
| [ ] | 25/05/2024 | Cape Wrath Ultra Day 7 | 38mi | 13:45:27 | ⏳ Rate limited | [Link](https://strava.com/activities/11497093499) |
| [ ] | 08/06/2024 | South Downs Way 100 | 100mi | 25:17:06 | ⏳ Rate limited | [Link](https://www.strava.com/activities/11612024442) |
| [ ] | 13/07/2024 | Race to the Stones | 62mi | 13:18:02 | ⏳ Rate limited | [Link](https://www.strava.com/activities/11882704384) |
| [ ] | 29/08/2024 | UTMB - OCC | 34mi | 11:39:18 | ⏳ Rate limited | [Link](https://www.strava.com/activities/12276424120) |
| [ ] | 07/12/2024 | Winter on the Downs | 50mi | 11:41:04 | ⏳ Rate limited | [Link](https://www.strava.com/activities/13067775456) |

---

## 2025

| Status | Date | Race | Distance | Time | Transcript | Strava |
|--------|------|------|----------|------|------------|--------|
| [ ] | 21/02/2025 | Transgrancanaria Classic | 80mi | 28:56:24 | ⏳ Rate limited | [Link](https://www.strava.com/activities/13701770611) |
| [ ] | 06/04/2025 | Brighton Marathon | 26.2mi | 3:59:56 | ⏳ Rate limited | [Link](https://www.strava.com/activities/14097634397) |
| [ ] | 27/04/2025 | Manchester Marathon | 26.2mi | 3:40:48 | ⏳ Rate limited | [Link](https://www.strava.com/activities/14301072291) |
| [ ] | 31/05/2025 | Ridgeway Challenge | 86mi | 24:23:36 | ⏳ Rate limited | [Link](https://www.strava.com/activities/14661419122) |
| [ ] | 21/06/2025 | Race to the King | 64mi | 15:10:28 | ⏳ Rate limited | [Link](https://www.strava.com/activities/14874834652) |
| [ ] | 12/07/2025 | Race to the Stones | 64mi | 15:36:08 | ⏳ Rate limited | [Link](https://www.strava.com/activities/15093669634) |
| [ ] | 07/12/2025 | Hurtwood 50k | 31mi | 6:57:51 | ⏳ Rate limited | [Link](https://www.strava.com/activities/16677084986) |

---

## Priority Blog Posts

### Tier 1: Epic 100-Milers (Most Compelling Stories)
1. [ ] **UTMB 100** (2023) - 110mi, 44:47:11 - The big one!
2. [ ] **Montane Lakeland 100** (2022) - 105mi through the Lake District
3. [D] **Arc of Attrition 100** (2019) - Cornwall coastal in February
4. [D] **Val D'Aran 100** (2021) - 46+ hours in the Pyrenees

### Tier 2: Major Achievements
5. [ ] **Paris Marathon 2023** - SUB-3 (2:55:42)!
6. [ ] **Cape Wrath Ultra** (2024) - 6-day stage race across Scottish Highlands
7. [T] **Transgrancanaria Classic** (2022) - 80mi Gran Canaria

### Tier 3: UTMB Series
8. [T] **UTMB - CCC** (2018) - First UTMB event
9. [ ] **UTMB - OCC** (2024) - Most recent

### Tier 4: First Sub-3 Marathon
10. [D] **Goodwood Marathon** (2020) - 02:58:57 - First sub-3!

---

## File Locations

| Resource | Path |
|----------|------|
| Transcripts | `/new-site/transcripts/` |
| Race Data | `/new-site/public/races-data.json` |
| Strava Embeds | `/new-site/data/strava-embeds.json` |
| Screenshots | `/screenshots/` (at project root) |
| Centurion Reports | `/new-site/data/centurion-reports/` |
| Race Research | `/new-site/data/race-research/` |
| Blog Posts (data) | `/new-site/src/data/blog-posts.ts` |
| Blog Content | `/new-site/src/data/blog-content.ts` |
| Blog Images | `/new-site/public/images/blog/{year}/` |
| Markdown Drafts | `/new-site/content/blog/` |
| This File | `/new-site/BLOG-POST-PROJECT.md` |

**Note:** Blog posts are stored in the PostgreSQL database. The static TypeScript files (`blog-posts.ts`, `blog-content.ts`) are for reference/backup. The `content/blog/` folder contains markdown drafts.

---

## Writing Approach

### CRITICAL: DO NOT COPY TRANSCRIPTS VERBATIM

The transcript is a **resource and reference**, NOT content to copy. Use it to understand:
- What happened at each point in the race
- How Stephen was feeling
- Weather, scenery, struggles, triumphs
- Key quotes worth preserving

Then **write original prose** in Stephen's voice based on this information.

---

### Stephen's Writing Style

Study existing posts (Val D'Aran, TDS 2022, Running Without a Watch) for reference. Key characteristics:

**Voice & Tone:**
- First person, reflective - written as looking BACK on the experience, not live commentary
- Conversational but polished prose - NOT transcript-speak
- Self-deprecating humor ("Then, like an idiot - as I always do...")
- Honest about suffering without melodrama

**Structure:**
- **Strong opening hook** - memorable first line that grabs attention
  - "That was the hardest race I have ever, ever done."
  - "Have you ever considered running without a watch?"
- **Context early** - what the race is, why it matters, the stakes
- **Narrative flow** - time/distance markers woven naturally into story
- **Section headers that tell a story** - "The Quads Start to Go", "Sunrise, Sickness, and Stubbornness"
- **Reflective conclusion** - what it meant, what comes next

**What TO do:**
- Set scenes vividly ("standing in the finish area in Vielha, having just spent nearly 47 hours traversing the Spanish Pyrenees")
- Share inner thoughts and feelings
- Explain context for readers who don't know the race
- Use specific details (times, distances, place names)
- Include forward-looking conclusions

**What NOT to do:**
- Copy transcript speech patterns verbatim
- Use "okay so" or "right" or "um" filler words
- Write in present tense as if live (write as past reflection)
- Include every checkpoint - summarize where appropriate
- Over-quote yourself - use quotes sparingly at dramatic moments only

---

## Workflow for Writing Each Post

1. **Gather Resources**
   - [ ] **Read transcript file FIRST** (in `/transcripts/`) - this is the PRIMARY source
   - [ ] Check Strava activity for photos, description, stats
   - [ ] Check for race analysis screenshot (see mapping above)
   - [ ] Get Strava embed code from `data/strava-embeds.json`
   - [ ] For Centurion races: read RD report from `data/centurion-reports/`
   - [ ] Read race research for context (`data/race-research/`)

2. **Write Draft**
   - [ ] Opening hook (scene-setting)
   - [ ] Race context (training, goals, conditions)
   - [ ] Narrative sections with H2 headers
   - [ ] Results and reflection
   - [ ] Forward-looking conclusion

3. **Add Media**
   - [ ] Featured image (from Strava or video thumbnail)
   - [ ] In-post images (Strava photos, screenshots)
   - [ ] Embed YouTube video
   - [ ] Include Strava activity embed (route map)

4. **Publish**
   - [ ] Add to database
   - [ ] Link in race spreadsheet
   - [ ] Update this tracker

---

## Notes

- **Strava Photos**: Accessible via WebFetch - photos hosted on `dgtzuqphqg23d.cloudfront.net`
- **Strava Data**: Can get title, description, stats, kudos count, comments
- **YouTube Thumbnails**: Available at `https://img.youtube.com/vi/{VIDEO_ID}/maxresdefault.jpg`
- **Writing Style**: Personal, conversational, first-person narrative with clear section headings

---

## Image Workflow

### Architecture
- **Blog posts**: Stored in PostgreSQL database (via Prisma)
- **Images**: Stored locally in `/public/images/blog/{year}/` folder
- **Production**: Images will be uploaded to Cloudflare R2 when deploying to Railway

### How to Get Photos from Strava

1. **Fetch photo URLs** using WebFetch on the Strava activity:
   ```
   URL: https://www.strava.com/activities/{ACTIVITY_ID}
   Prompt: "Extract all photo URLs. Look for images on dgtzuqphqg23d.cloudfront.net"
   ```

2. **Download photos locally** using curl:
   ```bash
   cd /new-site/public/images/blog/{YEAR}
   curl -s "{CLOUDFRONT_URL}" -o "descriptive-filename.jpg"
   ```

3. **Name files descriptively**: `race-name-description.jpg`
   - Example: `goodwood-marathon-running.jpg`
   - Example: `arc-of-attrition-coastal-path.jpg`

### Photo Usage in Posts

- **Featured image**: Set in database `featuredImage` field (local path)
- **Inline images**: Use `<figure><img>` tags throughout content
- **Placement**: Add 3-5 images at key narrative moments
- **Format**: `<figure><img src="/images/blog/{year}/{filename}.jpg" alt="Description" /></figure>`

### Image Locations

```
/new-site/public/images/blog/
├── 2019/
│   ├── arc-of-attrition-coastal-path.jpg (featured)
│   ├── arc-of-attrition-race-vest.jpg
│   ├── arc-of-attrition-exhausted.jpg
│   └── arc-of-attrition-finish-buckle.jpg
├── 2020/
│   ├── goodwood-marathon-running.jpg (featured)
│   ├── goodwood-marathon-medal-selfie.jpg
│   ├── goodwood-marathon-results.jpg
│   └── goodwood-marathon-medal-portrait.jpg
└── {year}/
    └── {race-name-description}.jpg
```

### Strava Photo Source URLs

Photos are hosted on `dgtzuqphqg23d.cloudfront.net`. WebFetch can only extract ~4 photos from the initial page load; additional photos require expanding the gallery manually.

---

## Tools

### Strava Embed Collector

A browser-based tool to quickly collect Strava embed codes for all activities.

**Run:**
```bash
cd /Users/stephencousins/Documents/GitHub/Film-My-Run-Website/new-site
python scripts/strava-embed-collector.py
```

Then open http://localhost:8080 in your browser.

**Features:**
- Lists all 76 activities needing embed codes
- One-click to open each Strava activity
- Paste embed code and it auto-extracts the URL
- Progress tracking with filter (All/Pending/Completed)
- Auto-saves to `data/strava-embeds.json`

**Workflow:**
1. Click "Open Strava" → opens activity in new tab
2. On Strava: click `...` menu → "Embed Activity" → "Copy Embed Code"
3. Come back and paste into input field
4. Auto-saves! Move to next activity.

---

## Retry Failed Transcripts

**Status:** IP currently blocked by YouTube (HTTP 429). See "Transcript Rate Limiting Status" section above.

### Option 1: Wait and Retry with Script
```bash
cd /Users/stephencousins/Documents/GitHub/Film-My-Run-Website/new-site
source .venv/bin/activate
python3 -c "
from youtube_transcript_api import YouTubeTranscriptApi
api = YouTubeTranscriptApi()
# Test with one video first
try:
    transcript = api.fetch('wlqxTfR0HIY', languages=['en', 'en-GB'])
    print('SUCCESS - IP block lifted!')
except Exception as e:
    print(f'Still blocked: {type(e).__name__}')
"
```

### Option 2: Use VPN/Different Network
Connect to a VPN or mobile hotspot, then run the script above.

### Option 3: Manual Copy from YouTube
1. Open video on YouTube
2. Click `...` → "Show transcript"
3. Copy all text
4. Save to `/new-site/transcripts/{DD-MM-YYYY}_{race-slug}.txt`

### Virtual Environment
A Python venv with `youtube-transcript-api` is set up at `/new-site/.venv/`:
```bash
source .venv/bin/activate
```

---

---

## Screenshots (Strava Race Analysis)

22 Strava race analysis screenshots are available in `/screenshots/` at the project root.
These show pace charts, elevation profiles, and split times.

**Folder:** `/Users/stephencousins/Documents/GitHub/Film-My-Run-Website/screenshots/`

### Screenshot to Race Mapping

| Screenshot | Finish Time | Race | Date |
|------------|-------------|------|------|
| Screenshot 2026-01-27 at 15.42.43.png | 24:25:04 | South Downs Way 100 | 09/06/2018 |
| Screenshot 2026-01-27 at 15.43.46.png | 23:57:30 | UTMB - CCC | 31/08/2018 |
| Screenshot 2026-01-27 at 15.45.15.png | 28:31:41 | Arc of Attrition 100 | 01/02/2019 |
| Screenshot 2026-01-27 at 15.45.38.png | 7:57:17 | Guernsey GU36 | 19/05/2019 |
| Screenshot 2026-01-27 at 15.46.00.png | 22:03:32 | Tenerife Bluetrail | 07/06/2019 |
| Screenshot 2026-01-27 at 15.46.23.png | 26:46:02 | 1066 Ultramarathon | 07/07/2019 |
| Screenshot 2026-01-27 at 15.47.57.png | 28:03:27 | Centurion CROC 100 | 30/05/2020 |
| Screenshot 2026-01-27 at 15.49.00.png | 2:58:57 | Goodwood Marathon | 06/12/2020 |
| Screenshot 2026-01-27 at 15.49.52.png | 46:50:32 | Val D'Aran 100 | 09/07/2021 |
| Screenshot 2026-01-27 at 15.50.23.png | 15:17:25 | RAT Plague | 11/08/2018 |
| Screenshot 2026-01-27 at 15.51.19.png | 22:53:53 | Sunrise Ultra | 11/12/2021 |
| Screenshot 2026-01-27 at 15.51.52.png | 26:46:06 | Transgrancanaria Classic | 04/03/2022 |
| Screenshot 2026-01-27 at 15.54.14.png | 34:36:50 | Montane Lakeland 100 | 29/07/2022 |
| Screenshot 2026-01-27 at 15.55.00.png | 12:28:19 | Ben Nevis Ultra | 18/09/2022 |
| Screenshot 2026-01-27 at 16.01.28.png | 2:55:44 | Paris Marathon (SUB-3!) | 02/04/2023 |
| Screenshot 2026-01-27 at 16.02.07.png | 2:57:46 | Manchester Marathon | 16/04/2023 |
| Screenshot 2026-01-27 at 16.02.54.png | 27:17:11 | Thames Path 100 | 06/05/2023 |
| Screenshot 2026-01-27 at 16.03.25.png | 29:18:58 | South Downs Way 100 | 10/06/2023 |
| Screenshot 2026-01-27 at 16.04.16.png | 28:51:38 | North Downs Way 100 | 05/08/2023 |
| Screenshot 2026-01-27 at 16.04.55.png | 44:47:03 | UTMB 100 | 01/09/2023 |
| Screenshot 2026-01-27 at 16.05.32.png | 27:20:00 | Autumn 100 | 14/10/2023 |
| Screenshot 2026-01-27 at 16.10.20.png | 13:18:02 | Race to the Stones | 13/07/2024 |

### Notes
- Screenshots matched by finish time visible in Strava race analysis
- All screenshots show pace distribution, elevation profile, and lap splits
- Useful for visualising race effort and identifying key moments for blog posts

---

## Strava Embed Codes

71 Strava embed codes have been collected (all races except Cape Wrath Ultra days).

**File:** `/new-site/data/strava-embeds.json`

### Cape Wrath Ultra (Not Collected)
Cape Wrath Ultra is a 6-day stage race and will be handled differently:
- Day 2: 20/05/2024
- Day 3: 21/05/2024
- Day 5: 23/05/2024
- Day 6: 24/05/2024
- Day 7: 25/05/2024

These may be written as a single multi-day race report rather than individual posts.

---

## Centurion Running Race Reports

Official race reports from Race Director James Elson (whom Stephen knows well) providing context on conditions, winners, and notable achievements. **Use these to embellish blog posts with specific details** about weather, field performance, notable runners, and race-day stories.

**Source:** https://centurionrunning.com/reports
**Saved to:** `/new-site/data/centurion-reports/`

### Available Reports

| File | Race | Date | Your Time |
|------|------|------|-----------|
| `sdw100-2018.md` | South Downs Way 100 | 13/06/2018 | 24:44:57 |
| `sdw100-2023.md` | South Downs Way 100 | 13/06/2023 | 29:18:49 |
| `sdw100-2024.md` | South Downs Way 100 | 11/06/2024 | 25:17:06 |
| `ndw100-2023.md` | North Downs Way 100 | 07/08/2023 | 28:51:32 |
| `tp100-2023.md` | Thames Path 100 | 06/05/2023 | 27:16:56 |
| `autumn100-2023.md` | Autumn 100 | 17/10/2023 | 27:20:04 |

### Key Details from Reports

**SDW100 2018:** Excellent conditions, 73% finish rate, 305 starters. Winner Charlie Harpur 15:01.

**SDW100 2023:** Brutal heat, lowest finish rate ever (57%). Winner Tim Bradley 15:50.

**SDW100 2024:** Near-perfect conditions, record 81.1% finish rate. Winner Dan Lawson 14:27.

**NDW100 2023:** Storm Antoni during registration, 70% finish rate. Winner Ryan Whelan 17:07.

**TP100 2023:** Heavy rain and epic mud, 61% finish rate. Winner Geoff Cheshire 14:18.

**Autumn 100 2023:** Ideal day temps (12°C), cold overnight (3°C), 70% finish rate. Winner Geoff Cheshire 13:58 (course record).

---

## Race Research (Web)

Additional research gathered from race reports, news articles, and official sources.

**Saved to:** `/new-site/data/race-research/`

### Available Research Files

| File | Race | Key Details |
|------|------|-------------|
| `utmb-100-2023.md` | UTMB 100 | Course reroute, Walmsley's record 19:37:43, Dauwalter win |
| `utmb-ccc-2018.md` | UTMB CCC | Course rerouted after fatal rockfall, added extra climb |
| `utmb-occ-2024.md` | UTMB OCC | Heat kit required, 21°C, Hemming first US male winner |
| `arc-of-attrition-2019.md` | Arc of Attrition | Cornwall winter 100, notorious Pendeen-St Ives section |
| `val-daran-2021.md` | Val d'Aran 100 | "Hardest race I've ever done", earned UTMB auto-entry |
| `lakeland-100-2022.md` | Lakeland 100 | Extremely wet/muddy, 40-50% normal failure rate |
| `transgrancanaria-2022.md` | Transgrancanaria | Storm, snow, wind, then scorching sun - brutal conditions |
| `cape-wrath-ultra-2024.md` | Cape Wrath Ultra | Norovirus outbreak, only 33% Ultra finish rate |
| `tenerife-bluetrail-2019.md` | Tenerife Bluetrail | Sea level to 3,500m, night start, volcanic landscape |
| `1066-ultramarathon-2019.md` | 1066 Ultra | Harold's march route, London to Battle Abbey |
| `goodwood-marathon-2020.md` | Goodwood Marathon | Freezing, windy, COVID race - YOUR FIRST SUB-3! |

### Research Highlights

- **UTMB 100 2023:** Jim Walmsley set course record (19:37:43), first US male winner
- **Arc of Attrition:** Pendeen to St Ives = 13mi of toughest terrain, expect 2mph pace
- **Val d'Aran 2021:** Completing this race earned automatic UTMB 100 entry
- **Transgrancanaria 2022:** "Expected nice warm sun, got a bad day in Scotland" - snow on Gran Canaria!
- **Cape Wrath 2024:** Norovirus devastated the field - only 33% finished the Ultra
- **Goodwood 2020:** Your first sub-3 marathon (2:58:57) in freezing December conditions

---

*Last updated: 2026-01-27 (transcript status updated)*
