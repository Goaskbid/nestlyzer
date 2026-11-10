# Evidence and execution limits

## What this run completed

The supplied 2.13.1 app was inspected programmatically. Seven core-country inventories, all active-place crosswalk tasks and all six Swiss scenario tasks were generated from that actual archive. Official source documentation was researched. Independent acquisition adapters, immutable raw-cache receipts, parsers, disk-backed staging, compatibility export, approval safeguards and tax coverage checks were written and tested with synthetic fixtures.

No new national source archive, municipal statistical observation or Swiss tax result was downloaded in this run. Outbound container DNS/download access was unavailable. Browser-automation integrations found in the environment were administrator-disabled. Web retrieval supplied documentation, not a substitute national raw dataset.

The earlier 145-row capital/Nantes sample is not included or relabelled as newly acquired data. The new task and crosswalk inventories are application-derived operational files, not official numeric observations. The 13,032 Swiss tasks contain no tax values. No production deployment, ranking or core data file was changed.

## Principal source references

France: https://www.insee.fr/fr/statistiques/5359146

US: https://www.census.gov/programs-surveys/acs/data/summary-file.2024.html

Canada: https://www150.statcan.gc.ca/n1/en/catalogue/98-401-X2021005

Australia: https://www.abs.gov.au/methodologies/data-region-methodology/2011-25

Brazil: https://servicodados.ibge.gov.br/api/docs/agregados?versao=3 and https://apisidra.ibge.gov.br/home/ajuda

Mexico: https://www.inegi.org.mx/programas/ccpv/2020/ and https://www.inegi.org.mx/contenidos/programas/ccpv/2020/doc/fd_iter_cpv2020.pdf

Swiss official calculator: https://www.estv.admin.ch/de/steuerbelastung-in-den-gemeinden and https://swisstaxcalculator.estv.admin.ch/

Swiss official commune API: https://www.agvchapp.bfs.admin.ch/documents/rest_api_de.pdf

Swiss roster dates: https://www.swissstats.bfs.admin.ch/data/webviewer/appId/ch.admin.bfs.swissstat/article/issue21000252100-27/package and https://statistik.admin.ch/de/asset/36390081

Swiss interface evidence, not an official supported API contract: https://github.com/noaahh/estv-mcp/blob/main/src/estv_mcp/api.py

The source registry records downloadable routes, period/geography scope, verification level and outstanding licence/schema reviews. A documented or constructed URL is not proof that the live download succeeded. No API credentials, licensed source copies or third-party client source code are bundled.

## Tests are bounded evidence

The new parser/guardrail tests use synthetic fixtures. They establish expected behaviour for those fixtures, not live compatibility with every publisher. Existing application tests ran on the unchanged uploaded app; their success does not prove that the new warehouse or score policy is integrated. Patch applicability and native-import compatibility are tested separately. See `11_validation.json` for measured results.

The observations stay held by design. Approval, geography matching, source-specific licences, statistical comparability and actual score integration remain substantive implementation work, not administrative checkboxes. The helper functions do not enforce policy inside the current website until Claude integrates them.

Selected census baselines are explicitly dated. Canada 2021 and Mexico 2020 are not presented as current household costs. Australian series have different observation years and LGA 2021 statistical boundaries. Brazilian latest population/GDP periods require live metadata. French source periods and geographic vintages vary. ACS five-year estimates have survey uncertainty. No dataset here justifies indiscriminate promotion of every place and profile to high confidence.
