# Pre-rename analytics baseline (September 2026)

Chrome Web Store analytics for the "Bookmark Import/Export" listing (v1.3.0)
before the Snug rename. Use it to compare installs, uninstalls, traffic and
ratings after v2.0.0 is published.

- Period: 2026-09-01 to 2026-09-29 (29 daily rows per CSV).
- Source: Developer Dashboard exports, captured 2026-10-01 (viewer access).
- The dashboard showed a notice that data was delayed, so late days may be
  incomplete.
- Every number below was computed from the CSVs with a script, not read off the
  dashboard cards. The headline numbers match the dashboard cards.

## Headline numbers

| Metric                        | Value | Change vs previous period |
| ----------------------------- | ----- | ------------------------- |
| Installs                      | 669   | +14.12%                   |
| Uninstalls                    | 162   | +16.92%                   |
| Page views (item detail page) | 700   | +21.44%                   |
| Impressions                   | 5.07K | +16.15%                   |
| Weekly users                  | ~5K   | +14.97%                   |
| Rating                        | 4.75  | 20 ratings, 16 with text  |
| Public listing, total users   | 4,000 |                           |

Exact values: impressions sum to 5,069 across the period. Weekly users were
5,157 on 2026-09-01 and 5,031 on 2026-09-29. The "Ratings over time" CSV has no
ratings inside the period (all zeros); the 4.75 over 20 ratings comes from the
dashboard snapshot in `store-current.md`, and the public listing rounds it to
4.8. The "Change vs previous period" column is from the dashboard cards, since
the CSVs hold no earlier period.

## Where the data is partial

Region, language and source breakdowns do not sum to the headline numbers
because the dashboard leaves out rows it cannot attribute. Percentages below are
shares of the breakdown's own total, not of the headline.

| Breakdown            | Breakdown total | Headline |
| -------------------- | --------------- | -------- |
| Installs by region   | 656             | 669      |
| Installs by language | 350             | 669      |
| Installs by OS       | 669             | 669      |
| Uninstalls by region | 158             | 162      |
| Page views by source | 92              | 700      |

## Top regions

Installs by region (total 656):

| Region         | Installs | Share |
| -------------- | -------- | ----- |
| United States  | 225      | 34.3% |
| Australia      | 54       | 8.2%  |
| India          | 33       | 5.0%  |
| Russia         | 26       | 4.0%  |
| United Kingdom | 25       | 3.8%  |
| Iran           | 23       | 3.5%  |
| Bolivia        | 22       | 3.4%  |
| Canada         | 21       | 3.2%  |

Uninstalls by region (total 158):

| Region        | Uninstalls | Share |
| ------------- | ---------- | ----- |
| United States | 29         | 18.4% |
| India         | 15         | 9.5%  |
| Israel        | 13         | 8.2%  |
| Canada        | 11         | 7.0%  |
| Japan         | 9          | 5.7%  |
| Bangladesh    | 7          | 4.4%  |
| France        | 5          | 3.2%  |
| Russia        | 5          | 3.2%  |

Weekly users by region on 2026-09-29 (total 4,874):

| Region         | Weekly users | Share |
| -------------- | ------------ | ----- |
| United States  | 1,262        | 25.9% |
| Sweden         | 365          | 7.5%  |
| South Korea    | 260          | 5.3%  |
| India          | 245          | 5.0%  |
| Russia         | 214          | 4.4%  |
| Germany        | 182          | 3.7%  |
| United Kingdom | 157          | 3.2%  |
| China          | 138          | 2.8%  |

## Top languages

Installs by language (total 350):

| Language                 | Installs | Share |
| ------------------------ | -------- | ----- |
| English (United States)  | 185      | 52.9% |
| Russian                  | 44       | 12.6% |
| English (United Kingdom) | 31       | 8.9%  |
| Chinese (China)          | 21       | 6.0%  |
| French                   | 10       | 2.9%  |
| Japanese                 | 9        | 2.6%  |
| German                   | 8        | 2.3%  |
| Korean                   | 6        | 1.7%  |

Weekly users by language on 2026-09-29 (total 4,258):

| Language                 | Weekly users | Share |
| ------------------------ | ------------ | ----- |
| English (United States)  | 2,277        | 53.5% |
| English (United Kingdom) | 367          | 8.6%  |
| Russian                  | 273          | 6.4%  |
| Korean                   | 250          | 5.9%  |
| Spanish                  | 196          | 4.6%  |
| Chinese (China)          | 194          | 4.6%  |
| German                   | 154          | 3.6%  |
| French                   | 90           | 2.1%  |

Spanish is the only locale with its own listing text besides English, and it
accounts for 4.6% of weekly users, so the ES listing is a small part of the
audience.

## Top operating systems

Installs by OS (total 669). "Other" is how the dashboard buckets browsers it
cannot map to the four named systems:

| OS       | Installs | Share |
| -------- | -------- | ----- |
| Other    | 295      | 44.1% |
| Windows  | 240      | 35.9% |
| macOS    | 63       | 9.4%  |
| ChromeOS | 59       | 8.8%  |
| Linux    | 12       | 1.8%  |

Uninstalls by OS (total 162):

| OS       | Uninstalls | Share |
| -------- | ---------- | ----- |
| Windows  | 99         | 61.1% |
| macOS    | 28         | 17.3% |
| Other    | 27         | 16.7% |
| Linux    | 5          | 3.1%  |
| ChromeOS | 3          | 1.9%  |

Weekly users by OS on 2026-09-29 (total 5,031):

| OS       | Weekly users | Share |
| -------- | ------------ | ----- |
| Windows  | 3,901        | 77.5% |
| macOS    | 808          | 16.1% |
| Linux    | 226          | 4.5%  |
| Other    | 66           | 1.3%  |
| ChromeOS | 30           | 0.6%  |

## Traffic sources

Page views by source (total 92 of 700 attributed):

| Source       | Page views | Share |
| ------------ | ---------- | ----- |
| ext_sidebar  | 70         | 76.1% |
| ext_app_menu | 16         | 17.4% |
| app-launcher | 4          | 4.3%  |
| chatgpt.com  | 2          | 2.2%  |

## Versions

All 3,519 daily users on 2026-09-29 ran version 1.3.0, the only version in the
"Daily users by item version" export.

## How to compare after the rename

- Use the same 29-day window length and the same CSV exports, from the Developer
  Dashboard analytics tabs.
- Compare ratios, not only counts: uninstalls divided by installs was 24.2% here
  (162 of 669).
- Expect a dip or a spike from the rename itself. Weekly users is the steadier
  signal; installs and impressions move with search ranking, which the new title
  and summary affect.
