# Bug Fix Request: Implement Collision Detection & Map Boundaries
**Current Issue:** The avatar passes right through walls (no collision), goes into blank spaces where it shouldn't move, and walks out of the map boundaries entirely. 

Please modify the existing code to implement strict **AABB (Axis-Aligned Bounding Box)** and **Grid-Based Collision Detection** using the following technical requirements:

---

## 1. Implement Map Boundaries (Clamp Movement)
- Define explicit total dimensions for the map (e.g., `MAP_WIDTH = 2000;` and `MAP_HEIGHT = 2000;`).
- Before updating `player.globalX` and `player.globalY`, clamp the values so the player can never move below `0` or above the maximum map bounds.
  ```javascript
  player.globalX = Math.max(0, Math.min(player.globalX, MAP_WIDTH - player.width));
  player.globalY = Math.max(0, Math.min(player.globalY, MAP_HEIGHT - player.height));
  ```

## 2. Implement Grid/Tile Collision Matrix
- Create a 2D JavaScript Array (Grid) representing the walkable room map where each cell is `16x16` pixels.
- Use `0` for Walkable Floor Tiles and `1` for Wall/Obstacle Tiles (matching the placement of `Room_Builder_Walls.png` and solid furniture items from `Interiors_free_16x16.png`).
- Write a helper function `isColliding(nextX, nextY)` that converts pixel coordinates to grid indices:
  ```javascript
  let gridX = Math.floor((nextX + offsetX) / TILE_SIZE);
  let gridY = Math.floor((nextY + offsetY) / TILE_SIZE);
  ```
- Check all 4 corners of the player's bounding box. If any corner hits a grid cell marked as `1`, return `true` and block the movement.

## 3. Handle Blank/Void Space Behavior
- Any area outside the active room grid coordinates must default to a collision value of `1` (solid obstacle) so that the avatar cannot walk into the empty canvas background or blank space.

## 4. Expected Output
Update the movement handler inside the `update()` loop. Test the `nextX` and `nextY` positions against the collision map *before* assigning them to the player. Keep the camera center lock functioning seamlessly.
