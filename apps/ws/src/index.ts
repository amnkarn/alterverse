import { WebSocketServer } from "ws";
import { User } from "./user.js";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";

const wss = new WebSocketServer({ port: 3001 });
console.log("ws server is running on port 3001");


wss.on("connection", async (ws, req) => {
    console.log(`[ws] New connection from ${req.socket.remoteAddress}, URL: ${req.url}`);

    const sessionPromise = auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
    }).then((session) => {
        if (session) {
            console.log(`[ws] Session authenticated: ${session.user.name} (${session.user.id})`);
            return {
                id: session.user.id,
                name: session.user.name ?? "Player",
            };
        }
        console.log(`[ws] No Better-Auth session cookie found, using client identity`);
        return null;
    }).catch((error) => {
        console.error("[ws] WebSocket auth check error:", error);
        return null;
    });

    const user = new User(ws, sessionPromise);

    ws.on("close", () => user.destroy());
    ws.on("error", (error) => {
        console.error("WebSocket connection error:", error);
        user.destroy();
    });

})