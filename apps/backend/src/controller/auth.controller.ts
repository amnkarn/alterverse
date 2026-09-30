import { Request, Response } from "express";
import { SigninSchema, SignupSchema } from "../validators/index.js";
import bcrypt from "bcrypt";
import { prismaClient } from "@repo/db/client";
import generateToken from "../utils/generateToken.js";

export async function signup(req: Request, res: Response) {
    const parsedData = SignupSchema.safeParse(req.body);
    if(!parsedData.success) {
        return res.status(400).json({
            message: "Validation failed"
        })
    }

    try {
        const { username, password, type } = parsedData.data;
        
        const isAlreadyRegistered = await prismaClient.user.findUnique({
            where: {
                username
            }
        })
        if(isAlreadyRegistered) {
            return res.status(400).json({
                message: "User is already registered"
            })
        }

        const salt = await bcrypt.genSalt(5);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prismaClient.user.create({
            data: {
                username,
                password: hashedPassword,
                role: type === "user" ? "User" : "Admin"
            }
        })

        return res.status(201).json({
            "userId": user.id
        })
        
    } catch (error) {
        console.log("Error in signup controller: ", error);
        return res.status(400).json({
            "message": "Something went wrong in signup"
        })
    }
}

export async function signin(req: Request, res: Response) {
    const parsedData = SigninSchema.safeParse(req.body);
    if(!parsedData.success) {
        return res.status(400).json({
            "message": "Error in validation"
        })
    }

    try {
        const {username, password} = parsedData.data;

        const user = await prismaClient.user.findUnique({
            where: {
                username
            }
        })

        if(!user) {
            return res.status(403).json({
                message: "User is not registered"
            })
        }

        const isCorrect = await bcrypt.compare(password, user.password);

        if(!isCorrect) {
            return res.status(401).json({
                message: "Password is not correct"
            })
        }

        //generate token
        const token = await generateToken(user.id, user.role);

        return res.status(200).json({
            token
        })

    } catch (error) {
        console.log("Error in signin controller: ", error);
        res.status(403).json({
            message: "Something went wrong in signin"
        })
    }
}