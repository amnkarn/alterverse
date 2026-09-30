import { Request, Response } from "express";
import { CreateAvatarSchema, createElementSchema, CreateMapSchema, UpdateElementSchema } from "../validators/index.js";
import { prismaClient } from "@repo/db/client";


export const createElement = async (req: Request, res: Response) => {
    const parsedData = createElementSchema.safeParse(req.body);
    if(!parsedData.success) {
        return res.status(400).json({
            message: "Validation error"
        })
    }

    try {
        const element = await prismaClient.element.create({
            data: {
                height: parsedData.data.height,
                width: parsedData.data.width,
                imageUrl: parsedData.data.imageUrl,
                static: parsedData.data.static
            }
        })

        return res.status(200).json({
            id: element.id
        })

    } catch (error) {
        console.log("Error in createElement controller: ", error);
        res.status(500).json("Sommething went wrong");
    }

    const userId = (req as any).userId;
}

export const updateElement = async (req: Request, res: Response) => {
    const parsedData = UpdateElementSchema.safeParse(req.body);
    if(!parsedData.success) {
        return res.status(400).json({
            message: "Validation error"
        })
    }

    try {
        const elementId = req.params.elementId;
        if(!elementId) {
            return res.status(400).json({
                messagea: "elementId is missing"
            })
        }

        const element = await prismaClient.element.findUnique({
            where: {
                id: elementId as string
            }
        })
        if(!element) {
            return res.status(400).json({ message: "Invalid element id" })
        }

        await prismaClient.element.update({
            where: {
                id: elementId as string,
            }, data: {
                imageUrl: parsedData.data.imageUrl
            }
        })

        return res.status(200).json({
            messasge: "Element updated"
        })

    } catch (error) {
        console.log("Error in updateElement controller: ", error);
        res.status(500).json("Sommething went wrong");
    }
}

export const createAvatar = async (req: Request, res: Response) => {
    const parsedData = CreateAvatarSchema.safeParse(req.body);
    if(!parsedData.success) {
        return res.status(400).json({
            message: "Validation error"
        })
    }

    try {
        const avatar = await prismaClient.avatar.create({
            data: {
                imageUrl: parsedData.data.imageUrl,
                name: parsedData.data.name,
            }
        })

        return res.status(200).json({
            avatarId: avatar.id
        })

    } catch (error) {
        console.log("Error in createAvatar controller: ", error);
        res.status(500).json("Sommething went wrong");
    }
}

export const createMap = async (req: Request, res: Response) => {
    const parsedData = CreateMapSchema.safeParse(req.body);
    //console.log(req.body);
    if(!parsedData.success) {
        return res.status(400).json({
            messge: "Validation error"
        })
    }

    try {
        const map = await prismaClient.map.create({
            data: {
                name: parsedData.data.name,
                height: Number(parsedData.data.dimensions.split("x")[0]),
                width: Number(parsedData.data.dimensions.split("x")[1]),
                thumbnail: parsedData.data.thumbnail,
                mapElements: {
                    create: parsedData.data.defaultElements.map(e => ({
                        elementsId: e.elementId,
                        x: e.x,
                        y: e.y 
                    }))
                }
            }
        })

        return res.status(200).json({
            id: map.id
        })

    } catch (error) {
        console.log("Error in createMap controller: ", error);
        res.status(500).json("Sommething went wrong");
    }
}