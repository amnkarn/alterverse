# Fix Invisible Boundaries and Avatar Movement

## Issues Addressed
1. **Right-most bottom room (biggest room) invisible boundary**:
   - Issue: 122 ghost furniture elements with `objectsoncollide` in `demo-map.json` lacked sprite images on disk (`Modern_Office_Black_Shadow.png` missing) but retained collision boxes across `y=480..512` and `y=736..768` (cols 30..38), forming an invisible barrier across the middle of the room.
   - Resolution: Removed non-rendered element collision boxes from both `apps/web/public/assets/map/demo-map.json` and `apps/web/src/data/demo-map.json`. Genuine boundary walls remain enforced via solid wall tiles.

2. **Top-right room invisible boundary**:
   - Issue: Row 8 (cols 20..33) had empty `0` tiles for both floor and walls. The unified collision builder interpreted empty floor + wall tiles as void (solid boundary), blocking movement horizontally across row 8 and into the doorway.
   - Resolution: Filled missing floor tiles at Row 8 (cols 20..33) with room floor tile `668`. Also filled missing hallway floor tile at Row 15, Col 19 with floor tile `415`.

3. **Character movement speed slowdown on zoom out**:
   - Issue: When the browser zoom was decreased (or canvas resolution enlarged), canvas size increased in CSS pixels, physical pixels per world unit decreased, and frame rates fluctuated without delta-time compensation, causing noticeable avatar movement slowdown.
   - Resolution:
     - Captured baseline display pixel ratio (`initialDprRef`).
     - Scaled velocity by delta time (`dtFactor`) and inversely compensated for zoom ratio (`initialDprRef.current / currentDpr`).
     - Added smooth subpixel collision stepping with fractional remainder handling.

4. **Avatar stopped / idle frame**:
   - Issue: When the player stopped moving, the avatar frame reset to `frame = 0` (walking pose with one foot raised).
   - Resolution: Set idle frame to `frame = 1` (natural standing pose with both feet planted on the ground). Remote movement update emits frame 1 on stop.

5. **Navbar refactoring**:
   - Verified top-left navigation shows only the clean `ALTERVERSE` badge without duplicate "Alterverse HQ" labels.
