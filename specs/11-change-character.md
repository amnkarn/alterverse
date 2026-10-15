# Objective: Generate a clean, single-file HTML5 Canvas + Vanilla JavaScript engine for a 2D Top-Down Multiplayer Metaverse.
# Core Task: Rewrite the character state manager and rendering loop to support a character selection screen (Harry, Hermione, Ron, Ginny) and dynamic state transitions for Walking, Idle, and 4-Directional Sitting.
# Location - /apps/web

---

## 1. DYNAMIC CHARACTER ASSET MAPPING
Load character files based on user selection from the following structure (`assets/character/single/`):
- **Character Options:** `Harry`, `Hermoine`, `Ron`, `Ginny`
- **Idle Frames:** `[Name]_idle_anim_1.png` to `[Name]_idle_anim_24.png`
- **Run/Walk Frames:** `[Name]_run_1.png` to `[Name]_run_24.png`
- **Directional Sitting Sprites:**
  - Sit Facing Down: `assets/character/single/[Name]_sit_down.png`
  - Sit Facing Up: `assets/character/single/[Name]_sit_up.png`
  - Sit Facing Left: `assets/character/single/[Name]_sit_left.png`
  - Sit Facing Right: `assets/character/single/[Name]_sit_right.png`

---

## 2. ADVANCED STATE MACHINE & INTERACTION LOGIC

### A. Extended State Matrix
Every player (local and remote) must have these fields in their state object:
```javascript
player = {
    name: "Harry", // User selected character name
    username: "aman",
    state: "idle", // States: "idle", "walking", "sitting"
    direction: "down", // Directions: "up", "down", "left", "right"
    currentFrame: 1,
    globalX: 400,
    globalY: 300
};
```

### B. Proximity & Smart Sitting Logic
1. When the player is within a 20px radius of any map seat/sofa/chair object, display an HTML interaction prompt or allow them to press the **'E' key**.
2. On pressing 'E':
   - Detect the facing orientation of the target chair (e.g., if it's a chair facing left, set `player.direction = 'left'`).
   - Change `player.state = "sitting"`.
   - Snap `player.globalX` and `player.globalY` exactly to the center anchor of that chair object.
   - Dispatch the state change packet hook: `onPlayerStateChange(player)`.
3. If the user presses any movement key (`W, A, S, D` / `Arrows`) or press 'E' again while sitting, revert `player.state = "idle"`, unlock controls, and offset them slightly out of the chair.

---

## 3. CORE RENDERING ENGINE MODIFICATIONS

### A. Multi-Frame Animation Pre-loader
- Write an optimized pre-loader function that caches all 24 frames of `idle` and `run` sequences for the selected character, along with the 4 individual sitting PNGs, to prevent flickering on canvas updates.

### B. Dynamic Render Loop Branching
Inside the `render()` loop, resolve the active player frame based on their state:
- **`if state === "walking"`**: Increment `currentFrame` from 1 to 24 on a standard timestamp delta tick, drawing the corresponding `[Name]_run_[frame].png`.
- **`if state === "idle"`**: Loop `currentFrame` from 1 to 24 slowly, drawing `[Name]_idle_anim_[frame].png`.
- **`if state === "sitting"`**: Stop frame increments completely. Check `player.direction` and draw the exact static sitting file matching that direction (e.g., `Harry_sit_left.png`).

---

## 4. UI INTERFACE OVERLAYS
1. **Character Picker UI:** Create a crisp HTML CSS overlay at boot up featuring 4 preview cards (Harry, Hermione, Ron, Ginny). Clicking a card sets the global engine skin variables and closes the overlay.
2. **Chat HUD Integration:** Connect the input field to trigger name tag rendering directly above the avatar on canvas.

---

## 5. EXPECTED CODE ARCHITECTURE
Deliver a complete single-file implementation. Ensure the camera tracking coordinates stay centered on the player regardless of the "sitting" or "walking" state transitions. Keep all logic clean and modular so I can inject Socket.io listeners seamlessly.




change the current character to new charater with the correct frame