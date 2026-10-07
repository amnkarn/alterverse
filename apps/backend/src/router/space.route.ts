import { Router } from "express";
import { isUser } from "../middleware/isUser.js";
import { 
    allSpaces, 
    createSpace, 
    createSpaceElement, 
    deleteElement, 
    deleteSpace, 
    findSpace
} from "../controller/space.controller.js";


const spaceRouter: Router = Router();

spaceRouter.post("/", isUser, createSpace)

// should not be secured
spaceRouter.get("/all", allSpaces)

spaceRouter.post("/element", isUser, createSpaceElement)

spaceRouter.delete("/element", isUser, deleteElement)

spaceRouter.get("/:spaceId", isUser, findSpace)

spaceRouter.delete("/:spaceId", isUser, deleteSpace)


export default spaceRouter;