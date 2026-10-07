import { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";

export async function isAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const user = session.user as typeof session.user & { role?: string };
        if (user.role !== "Admin") {
            return res.status(403).json({ message: "Admin access required" });
        }

        (req as any).session = session;
        (req as any).user = user;
        (req as any).userId = user.id;
        next();
    } catch (error) {
        console.error("Error in isAdmin middleware:", error);
        return res.status(401).json({ message: "Unauthorized" });
    }
}
