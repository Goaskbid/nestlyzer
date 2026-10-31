---
title: "Nestlyzer: data task for ChatGPT (2.11)"
subtitle: "Find links and copy small tables. No downloads, no ZIP files."
---

# What you can and cannot do here

Your environment cannot download files, and Claude's can't either. Anton's browser can. So this task asks only for two things:

- **A. Verified direct download links** that Anton clicks. A link counts only if it opens or downloads the data file itself (CSV, XLSX, Parquet), not a landing page. Open each link yourself, confirm it starts a download or shows raw data, and state the format and approximate size.
- **B. Small tables copied from official web pages.** At most 400 rows per table, pasted into the chat as CSV in a code block, with these columns:

```
cc,indicator_id,period,value,unit,source_url
```

Use Nestlyzer country codes (UK for the United Kingdom, EL for Greece). Leave a cell out if the source has no value; never write 0 for a missing value. No ZIP files, no "sandbox:" links, no summaries in place of data.

**Reply format:** one heading per item below, then either the link block (A) or the CSV block (B), or one line saying "not found" with the reason.

# A. Download links (Anton clicks them)

1. **UK, industry structure.** A Nomis API URL (nomisweb.co.uk/api/v01/dataset/...data.csv) for UK Business Counts (local units) by local authority district and 2-digit SIC 2007, latest year, all size bands. Build the URL with geography `TYPE` codes for all local authority districts, open it, and confirm it returns CSV.
2. **Netherlands, industry structure.** The CBS OData or CSV download for table 81575NED (vestigingen by gemeente and SBI), latest year, all municipalities, SBI at 2-digit or the finest level offered.
3. **Switzerland, industry structure.** The BFS STATENT file by Gemeinde and NOGA division (asset page on bfs.admin.ch with a direct .xlsx or .csv link). Canton level does not count.
4. **France, industry structure.** An Insee file with establishments or employment by commune and NAF level A38 or A88 (for example Flores or the Sirene-based local tables). It must be one national file, not per-city dossiers. Give its size, and say so if it is over 500 MB.
5. **Germany, industry structure.** Employees by Kreis and WZ 2008 (division or section) from the Bundesagentur für Arbeit or Regionalstatistik (table 13111 or 52111), as a direct CSV or XLSX link.
6. **Foreign-resident share per municipality** (census 2021 round) for as many of these as possible: DE, FR, IT, ES, PT, NL, BE, AT, CH, SE, NO, DK, FI, UK, IE. One link per country.

# B. Small tables to copy (CSV in the chat)

| indicator_id | What | Countries | Source to prefer |
|---|---|---|---|
| `corporate_tax_rate` | Combined statutory corporate income tax rate, latest | all 45 Nestlyzer countries | OECD Corporate Tax Statistics, or Tax Foundation |
| `minimum_wage_monthly_eur` | Statutory minimum wage per month, latest | EU, UK, US, CA, AU, NZ, JP, KR, IL | Eurostat earn_mw_cur, OECD |
| `elec_industrial_eur_kwh` | Electricity price for non-household consumers, band ID (2–20 GWh), excluding VAT and recoverable taxes, latest half-year | EU, EFTA, UK, candidates | Eurostat nrg_pc_205 |
| `gas_industrial_eur_kwh` | Gas price for non-household consumers, band I3, excluding VAT, latest half-year | same | Eurostat nrg_pc_203 |
| `mortgage_rate_new_loans` | Interest rate on new housing loans, latest month | euro area countries, CH, UK, US, SE, NO, DK, PL, CZ, HU | ECB MIR, national central banks |
| `english_proficiency_score` | EF English Proficiency Index score, latest | all listed in EF EPI | EF EPI |
| `job_vacancy_rate` | Job vacancy rate, latest quarter | EU, CH, NO, UK | Eurostat jvs_q_nace2 |

**Rules:**
- Official or recognised publishers only.
- The licence must allow commercial reuse with attribution, because the site shows ads. Name the licence in one line per table.
- Give the latest period, and say which period each value is from.

# Order

Do B first (it is fast), then A1, A2, A3, A6, A4, A5. If you can't complete an item, write "not found" and why, then move to the next one.
