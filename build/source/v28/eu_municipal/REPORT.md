# eu_municipal - Nestlyzer 2.8 (municipality income, housing and local tax)
Saved by the coordinator from the agent's final report (the agent could not write files named REPORT.md).

Coverage (places with a value / places in the file): FR income 31,277 (88.5%, Filosofi 2021), FR property-tax rate 34,862 (98.6%, DGFiP 2025),
FR rent map 34,845 (98.5%, 2025), DE Gewerbesteuer 10,774 (98.1%), DE Grundsteuer B 2024 10,732 (97.8%) and 2025 6,986 (63.6%),
ES ADRH income 8,124 (99.9%, 2023), NL CBS income 337 (93.6%, 2024), BE municipal income-tax surcharge 552 (90.9%, 2026),
BE new-lease rents 551 (2026-Q2), BE house prices 494, UK council tax Band D 283 (2026-27), UK HPI 315 (2026-07), UK ASHE pay/GDHI/claimants 318,
FI municipal key figures 308 (99%).

Spot checks: ES 8/8 exact vs INE ADRH 2023 press release; DE München/Duisburg/Offenbach/Mülheim rates vs city bylaws (all match);
FR rents 3/3 vs data.gouv; FR income vs secondary sites citing INSEE (Strasbourg 20,260; Toulouse 22,140; Nice 21,570; Bordeaux 24,870);
NL Amsterdam/Rotterdam vs CBS OData; UK Oxford Band D £2,678.40 vs council record; BE Gent surcharge 6.5% vs city regulation,
Q1-2025 house prices 6/8 exact (2 differ by later Statbel revisions); FI mirror verified as an unmodified official export (national totals).

Gaps: Paris/Lyon/Marseille income and rent (published per arrondissement); 41 abolished English districts (2023 reorganisation) and Scotland;
55 BE pre-merger codes; 18 NL merged municipalities; DE split 2025 property-tax rates.
Rejected: FR DVF prices (repo-computed, not official), BE taxable income per return (repo-computed), DE Grundsteuer A 2025 (implausible),
IT/SE/DK/NO/AT/PL/CZ/PT/IE/SI (no verifiable mirror).
