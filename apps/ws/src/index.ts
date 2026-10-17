import { WebSocketServer } from "ws";
import { User } from "./user.js";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";

const wss = new WebSocketServer({ port: 3001 });
console.log("ws server is running on port 3001");


wss.on("connection", async (ws, req) => {
    const sessionPromise = auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
    }).then((session) => session ? {
        id: session.user.id,
        name: session.user.name ?? "Player",
    } : null).catch((error) => {
        console.error("WebSocket authentication failed:", error);
        return null;
    });

    // Construct User immediately so the join message sent by the browser in
    // onopen is not lost while Better Auth is checking the session.
    const user = new User(ws, sessionPromise);

    sessionPromise.then((session) => {
        if (!session && ws.readyState === ws.OPEN) {
            ws.close(1008, "Unauthorized");
        }
    });

    ws.on("close", () => user.destroy());
    ws.on("error", (error) => {
        console.error("WebSocket connection error:", error);
        user.destroy();
    });

})