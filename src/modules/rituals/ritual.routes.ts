import { Router } from "express";
import { authenticateToken } from "@shared/middleware/auth.middleware";
import { RitualRepository } from "./repository/ritual.repository";
import { RitualService } from "./ritual.service";
import { RitualController } from "./ritual.controller";

const ritualRepo = new RitualRepository();
const ritualService = new RitualService(ritualRepo);
const ritualController = new RitualController(ritualService);

export const ritualRouter = Router();

// Public routes
ritualRouter.get("/", ritualController.getAll);
ritualRouter.get("/search", ritualController.search);
ritualRouter.get("/category/:category", ritualController.getByCategory);
ritualRouter.get(
  "/subcategory/:subcategory",
  ritualController.getBySubcategory,
);
ritualRouter.get("/:slug", ritualController.getBySlug);

// Protected routes
ritualRouter.post(
  "/cache/invalidate",
  authenticateToken,
  ritualController.invalidateCache,
);
