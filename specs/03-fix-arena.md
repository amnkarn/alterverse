# Role: Senior Frontend Game Engine Engineer
# Objective: Generate a production-ready, single-file HTML5 Canvas + Vanilla JavaScript frontend code for a 2D Top-Down Multiplayer Metaverse Game. 
# Problem with Previous Code: The previous implementation did not render floors, walls, and objects consistently. Fix this by explicitly implementing a strict Multi-Layer Grid System (Tilesets & Layer Offsets) as described below.

---

## 1. STRICT FILE PATH MAP
You must use these exact relative asset paths:
- Background Default: `assets/background/bg.png`
- Consistent Map Tilesets:
  - Floor Sprite: `assets/archive/Room_Builder_Floors.png`
  - Wall Sprite: `assets/archive/Room_Builder_Walls.png`
- Furniture & Decorative Elements:
  - Interiors (Sofa, Chair, etc.): `assets/modern_tiles/Interiors_free/16x16/Interiors_free_16x16.png`
- Avatar Character Spritesheets (1st Version - Dynamic Walk Frames):
  - Down: `assets/avtar/Down/[TD] Character 0 Down Spritesheet.png`
  - Up: `assets/avtar/Up/[TD] Character 0 Up Spritesheet.png`
  - Left: `assets/avtar/Left/[TD] Character 0 Left Spritesheet.png`
  - Right: `assets/avtar/Right/[TD] Character 0 Right Spritesheet.png`
  *(Note: Ignore MetroCity & MetroCity 2.0 folders for now).*

---

## 2. RENDERING ARCHITECTURE (CORE ENGINE CODE)

### A. 2D Map Matrix & Grid Definition (16x16 Tile Size)
Instead of arbitrary coordinates, implement a clear structural layout array in JavaScript to make the map consistent:
1. Define a 2D Array or Grid for Layer 0 (Floors) and Layer 1 (Walls) using tile indices from `Room_Builder_Floors.png` and `Room_Builder_Walls.png`.
2. Define a separate `mapObjects` array containing explicit source crop bounds `(sx, sy, sw, sh)` pointing to `Interiors_free_16x16.png` to consistently place sofas, chairs, and computers on the map.

### B. Infinite Camera Follow & Offset Logic
1. The canvas dimensions must be `800x600`. The local player's avatar must remain locked exactly at `(canvas.width / 2, canvas.height / 2)`.
2. When the user presses `W, A, S, D` or `Arrow Keys`, modify `player.globalX` and `player.globalY`.
3. Compute camera positions: `camera.x = player.globalX - canvas.width / 2` and `camera.y = player.globalY - canvas.height / 2`.
4. Render `bg.png` using `ctx.createPattern` shifting opposite to the camera offset to give an infinite environment depth feel.
5. Apply camera transformations before drawing all map grids and decorations: `screenX = globalX - camera.x`.

### C. Layered Animation for Avatar (4-Directional Spritesheets)
1. Tracking State: Maintain player's current direction (`'up'`, `'down'`, `'left'`, `'right'`) and `isMoving` flag based on inputs.
2. Spritesheet Splitting: Each character sheet contains 4 frames horizontally. Animate the player walking by shifting the source X coordinate `(frameIndex * frameWidth)` on tick updates when moving. If stopped, default to frame index `0`.
3. Render Name Tag (`player.username`) text centered precisely 15px above the sprite bounding box.

### D. HTML Interface Overlay (Absolute UI)
1. **Chat HUD:** A CSS absolute-positioned box overlay at the bottom left with a scrollable text element and input block. Pressing `Enter` adds the text locally and invokes a clean stub method `sendSocketPositionAndMessage(text)`.

---

## 3. EXPECTED OUTCOME
Give me a highly optimized code block containing the complete Asset Loading Manager, Event Listeners for Movement, Multi-layer Grid Loop Parser, and standard WebSocket-ready stub hooks (`onPlayerMove`, `syncRemotePlayers`). Keep code clean and inline commented.
