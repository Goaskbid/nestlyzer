# Nestlyzer data collection brief: map 555 unresolved geographies to Nestlyzer places or regions

**Goal.** Master V7 records exist for 555 source geographies that Nestlyzer could not link to a place by code or unique name. Map each one so its figures show on the right place pages. This is a mapping task, not a data-collection task: do not fetch new values.

**Inputs (attach both).**
- `unresolved_geographies.csv`: `source_geo_id,country,level,name`, one row per geography.
- `places_lookup_for_mapping.csv`: every Nestlyzer place in the 42 countries concerned: `cc,oid,name,official_name,region_code,nuts3,nuts3_name`.

**Output.** One file, `geo_mapping.csv`:

```
source_geo_id,target_kind,target_code,relationship,evidence,source_url
```

- `target_kind`:
  - `oid`: the geography is one Nestlyzer place, or a place lies inside it. Give one row per place.
  - `nuts3`: it equals a NUTS3 region; give the nuts3 code from the lookup.
  - `rc`: it equals a region code from the lookup, e.g. a US state or an Austrian Land.
  - `none`: no honest match. Say why in `evidence`.
- `relationship` is one of:
  - `is`: the same unit;
  - `district`: a city district inside a place;
  - `contains`: a county or region that contains the place;
  - `station`: a weather station that serves the place, within 25 km and inside the same municipality or county;
  - `principal_city`: the place is the named core of a metro or combined authority.
- `evidence`: one short line, e.g. "official code 3201 = Bærum", "Zagrebačka županija = HR050", "station inside municipality".
- `source_url`: an official gazetteer or statistics page proving the match. Wikipedia only as a last resort.

**Rules.**
- Never guess between same-name places. If two places share the name and the source gives no state or county, use `none`.
- Groupings that span several regions (`multi_state_region`, `country_or_country_group`, `utility_service_area`, `survey_city` without a code) map to `none`, unless the source defines exactly which units belong to the group. In that case list the member places as `contains`.
- Districts (Czech okresy, Hong Kong districts, Korean gu, Singapore HDB towns, Taiwanese counties and cities) map to every Nestlyzer place inside them with `contains`, or to the one place with `is` when the place is the district.
- UK upper-tier counties and combined authorities map to their member local authorities (`contains`, or `principal_city` for the core city).
- Keep every row, including `none`, so the list closes.

**Priorities by record count.**

| Country | Level | Geographies |
|---|---|---|
| CZ | district | 77 |
| US | county | 64 |
| ES | municipality | 40 |
| NZ | region | 32 |
| KR | city district | 25 |
| SG | HDB town | 24 |
| UK | upper-tier county | 21 |
| HR | county | 20 |
| HK | district | 18 |
| UK | combined authority | 15 |
| EE | county | 14 |
| UK | local authority | 14 |
| TW | county, city | 22 |

The remaining ~170 are small groups.

**Report (`REPORT.md`).**
- Counts by `target_kind`.
- Five spot checks with the source of each.
- Every `none` grouped by reason.

**Delivery.** Send me `geo_mapping.csv` and `REPORT.md`. I import them with `build/build_master_context.py`; re-running is safe, and conflicts are refused rather than overwritten.
