# Task for ChatGPT: industry structure per municipality (for Nestlyzer business profiles)

## Goal
For every place in Nestlyzer's 45 countries, the share of employment (preferred) or of local business units by industry, as finely as the official source publishes it. Nestlyzer maps these codes to GICS-style sectors and industry groups itself (mapping file: `build/source/business/gics_map.json`). Do not map to GICS yourself.

## Places
Use the native place roster you already hold, the 15 October reference with 129,508 active places. Keep the codes exactly as `oid` per country. Examples:
- DE: 8-digit AGS
- FR: INSEE commune code
- IT: ISTAT code
- ES: INE 5-digit code
- CH: BFS code
- UK: LAD code
- US, CA, AU, NZ, JP, KR, TW, IL, SG, HK: GeoNames IDs

Where a source publishes only at district or county level, deliver that level and say so (`level=nuts3` or `county`). Never copy a district value into municipalities.

## Fields (one row per place, field and period)
- NACE Rev.2 countries: `nace_<division>_pct` (e.g. `nace_10_pct`, `nace_21_pct`, `nace_62_pct`). If only sections exist, use `nace_section_<letter>_pct`.
- US: `naics_<3 or 4 digits>_pct` (County Business Patterns, county level). Canada: NAICS from the census by CSD. Australia and New Zealand: ANZSIC (`anzsic_<code>_pct`). Japan: JSIC (`jsic_<code>_pct`). Korea: KSIC (`ksic_<code>_pct`).
- Add `jobs_per_1000_residents` or `establishments_per_1000_residents`.
- `unit` must say the basis: `pct of employment` or `pct of local units`.

## Output format (exactly as before)
`values.csv` with the columns `cc,level,code,field,value,unit,period,source_id`, plus `sources.json` and `REPORT.md`:
- `sources.json`: publisher, dataset, URL, licence, period.
- `REPORT.md`: join rate per country, 3 spot checks per source, and the gaps.

## Priorities
Biggest coverage first:
1. US (CBP county)
2. DE, FR, IT, ES, CH, UK (BRES/Business Counts by LAD), NL (CBS wijken en buurten), AT, PL (GUS BDL REGON by section)
3. The rest

## Rules
- Official publishers only.
- The licence must allow commercial reuse with attribution, because the site shows ads.
- Use the latest period.
- Missing stays missing. Suppressed cells stay suppressed; never zero.
- Shares must not be normalised to 100% when components are missing.
