import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/config.js";
//import "dotenv/config";

//const secret = process.env.JWT_SECRET;

export default async function generateToken(userId: string, userRole: string) {
    const token = await jwt.sign({
        userId: userId,
        role: userRole
    }, JWT_SECRET)

    return token;
}