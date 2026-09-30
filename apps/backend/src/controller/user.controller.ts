import { Request, Response } from "express"
import { UpdateMetaDataSchema } from "../validators/index.js"
import { prismaClient } from "@repo/db/client";



export const updateMetaData = async (req: Request, res: Response) => {
    const parsedData = UpdateMetaDataSchema.safeParse(req.body);
    if (!parsedData.success) {
        return res.send(400).json({
            message: "Validation error"
        })
    }

    try {
        const userId = (req as any).userId;

        const avatar = await prismaClient.avatar.findUnique({
            where: { id: parsedData.data.avatarId }
        })

        if(!avatar) {
            return res.status(400).json({
                message: "Invalid avatar"
            })
        }

        const data = await prismaClient.user.update({
            where: {
                id: userId
            }, data: {
                avatarId: parsedData.data.avatarId,
            }
        })

        return res.status(200).json({
            message: "metadata is updated"
        });

    } catch (error) {
        console.log("Error in updateMetaData conroller: ", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
}


export const getBulkMetaData = async (req: Request, res: Response) => {
    const userIdString = (req.query.ids ?? "[]") as string;
    const userIds = userIdString?.slice(1, userIdString.length - 1).split(",");
    //console.log(userIds)

    try {
        const metaData = await prismaClient.user.findMany({
            where: {
                id: {
                    in: userIds
                }
            }, select: {
                avatar: true,
                id: true
            }
        })

        return res.json({
            avatars: metaData.map(md => ({
                userId: md.id,
                avatarId: md.avatar?.imageUrl
            }))
        })

    } catch (error) {
        console.log("Error in getBulkMetaData: ", error);
        return res.status(500).json({
            message: "Something went wrong"
        })
    }
}