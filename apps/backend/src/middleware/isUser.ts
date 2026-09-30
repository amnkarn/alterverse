import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/config.js";


export function isUser(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1];

    if (!authHeader || !authHeader.startsWith("Bearer ") || !token) {
        return res.status(403).json({
            message: "Auth token is missing or invalid format"
        });
    }

    //console.log("token in middleware", token);

    try {
        const decode = jwt.verify(token, JWT_SECRET) as {role: string, userId: string};
        (req as any).userId = decode.userId;
        next();
        //console.log("token decode: ", decode);
        
    } catch (error) {
        console.log("Error in 'isUser' middleware: ", error);
        return res.status(401).json({
            message: "Unauthorised"
        })
    }
}