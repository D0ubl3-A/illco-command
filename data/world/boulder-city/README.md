# Boulder City geospatial district

This package locks Boulder City to the same WGS84 / UTM Zone 11N production frame used by the Lake Mead region.

## Origin

`BC-A000` is Boulder City City Hall at 401 California Avenue. It is a permanent land anchor and the local East/North/Up origin for district-relative coordinates.

## Included anchors

- City Hall and the adjacent Recreation Center
- Boulder Dam Hotel / historic downtown reference
- Boulder City Hospital
- Boulder City High School
- Hemenway Valley Park
- Veterans Memorial Park
- Boulder City Municipal Airport reference point
- All four KBVU runway thresholds
- Nevada State Railroad Museum
- Southern Nevada Veterans Memorial Cemetery
- Bootleg Canyon Park

## Accuracy policy

The manifest separates identity evidence from coordinate evidence. Official city pages confirm facility identity and addresses. Current mapped centroids are tagged as secondary until directly reconciled against City of Boulder City GIS feature geometry. Airport and runway coordinates are sourced from current FAA records republished by aviation data providers and remain tagged secondary until the FAA NASR distribution is ingested directly.

No unknown elevation is guessed. `elevation_m_navd88` remains `null` until the final DEM and surveyed structure datasets are sampled.

## World integration order

1. Import city limits, parcels, addresses and street centerlines from Boulder City GIS.
2. Reproject all geometry to EPSG:32611 without intermediate rounding.
3. Snap the downtown street graph around City Hall and the historic district.
4. Build the KBVU runway, taxiway and apron mesh from runway threshold anchors and authoritative airport geometry.
5. Attach Hemenway Valley, Veterans Memorial and Bootleg Canyon terrain to the shared DEM.
6. Connect Boulder City to the Lake Mead district through US-93, Nevada Way, Lakeshore Road and the River Mountains Loop Trail.
7. Sample NAVD88 elevations and reject any asset exceeding its declared horizontal or vertical tolerance.

## Runtime API

Use `lib/geospatial/boulder-city.ts` to:

- fetch persistent anchors;
- convert arbitrary WGS84 points to Boulder City local coordinates;
- create Unity or Unreal positions;
- validate projection and local-offset consistency.
