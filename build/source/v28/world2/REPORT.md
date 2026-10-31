# world2 - Nestlyzer 2.8 (saved by the coordinator from the agent's final report)
CA (2,929/2,929, census division containing the place, StatCan 2021 Census): median household income (2020), median dwelling value, median shelter cost for renters, unemployment (May 2021, pandemic), bachelor's degree or higher 25-64.
AU (2,014/2,034, LGA containing the place, ABS Census 2021): median weekly household income, median weekly rent, median monthly mortgage repayment.
US (county): bachelor's or higher 25-44 (ACS B15001 via County Health Rankings) 99.6%; median gross rent (states FIPS 01-26) 44%; median home value (FIPS 01-24) 39% - the remaining states were cut off by the response limit.
Joins: CA point-in-polygon on StatCan 2016 census divisions (codes unchanged in 2021) + nearest within 10 km; AU point-in-polygon on ABS 2016 LGAs + nearest within 5 km; US county join from world_places.
Spot checks: ABS QuickStats Sydney LGA 2212/550/2700 and Melbourne 1678/396/1963 match; Toronto median household income $84,000 matches; 36/36 AU and 16/16 CA verbatim re-fetches identical; California home values 58/58, Arizona rents 15/15 identical on separate state requests.
Flags: 9 AU border towns and 4 CA places carry a wrong region code in the country file (see join_methods.csv).
