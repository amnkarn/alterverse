import { Router } from "express";
import spaceRouter from "./space.route.js";
import userRouter from "./user.route.js";
import adminRouter from "./admin.route.js";
import { getAllAvatars, getAllElements } from "../controller/index.controller.js";


const indexRouter: Router = Router();

indexRouter.get("/elements", getAllElements);

indexRouter.get("/avatars", getAllAvatars);

indexRouter.use("/user", userRouter);

indexRouter.use("/space", spaceRouter);

indexRouter.use("/admin", adminRouter);

export default indexRouter;