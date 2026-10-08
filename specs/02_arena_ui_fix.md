# Need to fix the arena page ui

* Create mock data with the same shape of my database, example:

```
export const demoMap = {
  id: "demo-map",
  name: "Demo Plaza",
  width: 1200,
  height: 800,
  elements: [
    {
      id: "tree-1",
      elementId: "tree",
      imageUrl: "/demo/tree.png",
      x: 300,
      y: 240,
      width: 64,
      height: 64,
    },
    {
      id: "bench-1",
      elementId: "bench",
      imageUrl: "/demo/bench.png",
      x: 600,
      y: 400,
      width: 96,
      height: 48,
    },
  ],
};
```

Then use a demo space:

```
export const demoSpace = {
  id: "demo-space",
  name: "Demo Plaza",
  map: demoMap,
};
```
and import the data like - import { demoSpace } from "./demo-data";

* remove unwanted things from arena page, like navbar and all things exept game.
* make the game box of full size, give full height and full width.
* the user avatar should not go out of the map, avtar can only move under the map, not the out of the map.
* avtar shoule also not cross or move on the wall, and need to be under the map.
* make the elements little bigger on full screen
* remove the other wall image, use consistent image for wall, and everything