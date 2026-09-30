import { WebSocketServer } from "ws";
import { User } from "./user.js";

const wss = new WebSocketServer({ port: 3001 });
console.log("ws server is running");


wss.on("connection", (ws, req) => {
    const user = new User(ws);

    ws.on("close", () => {
        user?.destroy();
    })

})