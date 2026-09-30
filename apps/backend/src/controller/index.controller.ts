import { prismaClient } from "@repo/db/client";
import { Request, Response } from "express";


export const getAllElements = async (req: Request, res: Response) => {
    const elements = await prismaClient.element.findMany();

    return res.status(200).json({
        elements: elements.map(e => ({
            id: e.id,
            imageUrl: e.imageUrl,
            width: e.width,
            height: e.height,
            static: e.static
        }))
    })
}

export const getAllAvatars = async (req: Request, res: Response) => {
    const avatars = await prismaClient.avatar.findMany();

    return res.status(200).json({
        avatars: avatars.map(m => ({
            id: m.id,
            imageUrl: m.imageUrl,
            name: m.name
        }))
    })
}