import { Router } from "express";
import { isUser } from "../middleware/isUser.js";
import { getBulkMetaData, updateMetaData } from "../controller/user.controller.js";


const userRouter: Router = Router();

userRouter.post("/metadata", isUser, updateMetaData);

userRouter.get("/metadata/bulk", getBulkMetaData);

export default userRouter;