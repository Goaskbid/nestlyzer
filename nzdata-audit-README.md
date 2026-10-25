Nestlyzer 2.11.0 data coverage audit (generated from the deployed build with local scripts; no crawling).
coverage.csv: one row per country x indicator. kind = scored factor, raw factor or context record (context is shown, never scored).
  source_levels: geography the figure is published for. unique_source_areas: distinct source areas. mapped_places: places the figure
  is attached to. displayed_places: places that show it. scored_places: places where it enters a score. missing_reason: why the rest lack it.
kpi_coverage.csv: for each key figure (household and business) (Method page) whether the build has it for the country, at which level and from which indicators.
industry_coverage.csv: industry-classification data per country (NACE, NAICS or broad sectors) and whether detailed local data exists.
unresolved_geographies.csv: source geographies from the collected data that are not linked to a place yet.
