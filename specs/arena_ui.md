# Project Specification: 2D Multiplayer Metaverse Frontend
**Role:** apps/web/public/assets
**Role:** Senior Frontend & Game System Engineer  
**Context:** I am a Backend-focused engineer building a 2D Top-Down Metaverse Game (Alterverse). I have a Node.js server with WebSockets (PostgreSQL DB). I need you to write the absolute cleanest, robust, single-file HTML5 Canvas + Vanilla JavaScript (or React if cleanly encapsulated) frontend code based on the exact asset structure provided below. Do not use heavy game engines like Phaser; write raw, high-performance HTML5 Canvas 2D Context code.

---

## 1. Directory & Assets Map Available
Use these exact relative paths in the frontend code to load assets:
- **Map JSON Data:** `assets/map/map.json` (Tiled Map JSON format)
- **Map Texture/Tileset:** `assets/modern_tiles/Interiors_free/16x16/Interiors_free_16x16.png` and `assets/modern_tiles/Interiors_free/16x16/Room_Builder_free_16x16.png`
- **Background Loop Pattern:** `assets/background/bg.png`
- **Layered Custom Avatars (MetroCity):**
  - Base: `assets/MetroCity/CharacterModel/Character Model.png`
  - Hair Option: `assets/MetroCity/Hair/Hair1.png` to `Hair7.png`
  - Outfit Option: `assets/MetroCity/Outfits/Outfit1.png` to `Outfit6.png`
- **Pre-animated Avatars (Alternative):** `assets/modern_tiles/Characters_free/Adam_run_16x16.png` (16x16 grid spritesheet)

---

## 2. Core Functional Requirements

### A. Tiled JSON Map Parsing & Rendering
1. Read and parse the `map.json` file asynchronously. 
2. Match tilesets inside JSON to the actual PNG images (`Interiors_free_16x16.png`).
3. Render the floor, walls, and decorative elements (sofas, tables, computers) in correct layer order (`ctx.drawImage` cropping tiles using standard 16x16 spacing).

### B. Infinite Camera Follow & Scrolling Logic
1. The local player's avatar must remain strictly locked at the **center of the viewport/canvas** (Canvas dimensions: `800x600`).
2. When the user presses `W, A, S, D` or `Arrow Keys`, update the player's internal global coordinates `(player.x, player.y)`.
3. Compute `camera.x = player.x - canvas.width / 2` and `camera.y = player.y - canvas.height / 2`.
4. Draw the background `bg.png` looped infinitely using `ctx.createPattern` shifting opposite to the camera offset.
5. Translate all map elements, tiles, and other online players on screen relative to the camera: `screenX = globalX - camera.x`.

### C. Layered Avatar Assembly & Animation
1. Build an avatar rendering system that stitches together layers: **Character Model (Base) -> Outfit -> Hair**.
2. If rendering from a sheets grid (like `Adam_run_16x16.png`), calculate current animation frames based on timestamp loops for directions: Down, Left, Right, Up.
3. Every player must have a clean username Name-Tag text drawn directly above their avatar's head (`ctx.fillText`).

### D. Overlay UI Components (Absolute Positioned HTML)
1. **Character Customization Screen:** A modal overlays the canvas before entering. Let users click buttons to toggle `Outfit[1-6]` and `Hair[1-7]`. Upon clicking "Join", pass these choices to the game loop state.
2. **Chat Box HUD:** Anchored at the bottom left. An absolute CSS `div` container with a scrollable list of messages and an input element. Pressing `Enter` adds the text locally and calls a placeholder function `sendSocketMessage(text)`.

### E. Backend Sync System Hooks (Stub Functions)
Provide cleanly abstracted stub functions inside the script so I can wire them up to my WebSockets easily:
- `function onLocalPlayerMove(x, y, currentDirection, currentFrame)` -> To emit data to Node.js.
- `function handleRemotePlayerUpdate(playersArray)` -> To loop through and draw other users moving in the same room.

---

## 3. Deliverable Expected
Provide a highly organized, completely self-contained file (`index.html` or a structured React component file if explicitly structured) containing the CSS overlays, Canvas drawing loop, keyboard event listeners, and standard image asset loaders. Keep code optimized, avoiding drawing objects outside the camera viewport (frustum culling) where possible.
