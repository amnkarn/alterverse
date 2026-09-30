import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/config.js";


export function isAdmin(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1];

    if (!authHeader || !authHeader.startsWith("Bearer ") || !token) {
        return res.status(403).json({
            message: "Auth token is missing or invalid format"
        });
    }

    try {
        const decode = jwt.verify(token, JWT_SECRET) as {role: string, userId: string};
        
        if(decode.role !== "Admin") {
            return res.status(403).json({ "message": "Unauthorised" })
        }
        
        (req as any).userId = decode.userId;
        next();
        
    } catch (error) {
        console.log("Error in 'isAdmin' middleware: ", error);
        return res.status(401).json({
            message: "Unauthorised"
        })
    }
}