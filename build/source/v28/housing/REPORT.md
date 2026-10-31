# housing - Nestlyzer 2.8 local housing costs

## Delivered (values.csv, 24,973 data rows)
| cc | level | field | rows | join rate | period | source_id |
|---|---|---|---|---|---|---|
| DE | nuts3 | rent_net_m2_eur | 401 | 401/401 NUTS3 = 10,978/10,978 places | Zensus 2022 | de_zensus2022_grid_rent |
| DE | place | rent_net_m2_eur (approximation, see below) | 10,326 | 10,326/10,978 (94.1%) | Zensus 2022 | de_zensus2022_grid_rent_gem |
| IT | place | house_price_m2_omi_eur | 7,335 | 7,335/7,987 (91.8%) | 2018-S2 | it_omi_2018s2 |
| IT | place | rent_m2_omi_eur | 6,911 | 6,911/7,987 (86.5%) | 2018-S2 | it_omi_2018s2 |

## Method
- DE: official Zensus 2022 100m grid "Durchschnittliche Nettokaltmiete und Anzahl der Wohnungen" (Destatis, dl-de/by-2-0; mirror JsLth/z22data). Cell counts total 20.78 M = rented dwellings, so the dwelling-weighted mean reproduces official averages. Kreis = cells inside the BKG Kreis polygon (geoBoundaries DEU ADM3). Gemeinde = cells of the Kreis assigned to the nearest Gemeinde point (no Gemeinde polygons were available), so these are approximate.
- IT: OMI semester 2018/2 VALORI file (ondata mirror). For each comune: rows 'Abitazioni civili', stato NORMALE; zone mid = (min+max)/2; value = median across zones. 229 codes from 2018 no longer exist (municipal mergers).

## Spot checks
- DE Kreis vs official: Hamburg 9.16 vs 9.16; Halle (Saale) 5.92 vs 5.92; Altmarkkreis Salzwedel 4.80 vs 4.77; Dithmarschen 6.21 vs 6.12; Stormarn 8.69 vs 8.65 (Statistikamt Nord SI24_085/086, StaLa Sachsen-Anhalt PM 180/2024). Differences 0.00-0.09 EUR (max 1.5%), from Zensus cell-key noise and grid cells that were withheld.
- DE Gemeinde: Selke-Aue 3.70 vs 3.75; Barleben 6.15 vs 6.29 (-2.2%). The cities match their Kreis values.
- IT: all 39 Milano zones, sale min/max and rent min/max, are identical to the Comune di Milano official OMI 2018/2 open-data files (78/78). Recomputed Milano medians: 2500 EUR/m2 sale, 8.5 EUR/m2/month rent, both equal to the file. Raw saved in _raw/milano_omi/.

## Not delivered / rejected
- DE building land prices per Kreis (Regionaldatenbank 61511-01-03-4): regionalstatistik.de is robots-blocked for WebFetch, the GENESIS REST endpoint needs credentials or POST, and the Regionalatlas ArcGIS queries are longer than WebFetch's ~250-character URL limit. No GitHub mirror was found.
- DE official Gemeinde rent table (Zensus database / Regionaltabelle_Gebaeude_Wohnungen.xlsx, 20 MB): the API rejects GET, the xlsx is binary and the shell is blocked, so the grid approximation is used instead.
- ES MIVAU SERPAVI (cdn.mivau.gob.es/.../VDP001_01.csv): the shell is blocked and the file is several MB (all municipalities and years), too large for WebFetch. Also, it holds median monthly rent and median floor area, not a median per m2. INE IPVA 59060 holds indices only. Not delivered.
- IT IRPEF per comune: MEF publishes only a ZIP and no mirror holds the data. The Comune di Milano CKAN copy timed out on approval.
- AT: Statistik Austria Immobilien-Durchschnittspreise exist only as .ods (binary, not readable through WebFetch). No OGD CSV.
- CZ: the ČSÚ DataStat catalogue (data.csu.gov.cz) timed out on approval.
- US WV B25077: the api.census.gov call needs a key; data.census.gov/api returned a server error (retried once as asked).
- Licence note (IT): OMI requires the attribution "Agenzia Entrate - OMI". Comune di Milano republishes it under CC BY 4.0. onData notes that the Agenzia's own terms do not state an explicit open licence, so the coordinator should confirm.
