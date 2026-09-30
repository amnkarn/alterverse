import { Router } from "express";
import { createAvatar, createElement, createMap, updateElement } from "../controller/admin.controller.js";
import { isAdmin } from "../middleware/isAdmin.js";


const adminRouter: Router = Router();

adminRouter.post("/element", isAdmin, createElement)

adminRouter.put("/element/:elementId", isAdmin, updateElement)

adminRouter.post("/avatar", isAdmin, createAvatar)

adminRouter.post("/map", isAdmin, createMap)



export default adminRouter;