import { Router } from "express";
import { authenticateToken } from "@shared/middleware/auth.middleware";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";

const userService = new UserService();
const userController = new UserController(userService);

export const userRouter = Router();

userRouter.post("/sync", authenticateToken, userController.sync);
userRouter.get("/me", authenticateToken, userController.getMe);
userRouter.patch("/me", authenticateToken, userController.updateMe);
