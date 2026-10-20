import { Router } from "express";
import { authenticateToken } from "@shared/middleware/auth.middleware";
import { ReadingRepository } from "./repository/readings.repository";
import { ReadingService } from "./reading.service";
import { ReadingController } from "./reading.controller";

const readingRepo = new ReadingRepository();
const readingService = new ReadingService(readingRepo);
const readingController = new ReadingController(readingService);

export const readingRouter = Router();

// Public routes
readingRouter.get("/", readingController.getAll);
readingRouter.get("/search", readingController.search);
readingRouter.get("/category/:category", readingController.getByCategory);
readingRouter.get(
  "/subcategory/:subcategory",
  readingController.getBySubcategory,
);
readingRouter.get("/:slug", readingController.getBySlug);

// Protected routes
readingRouter.post(
  "/cache/invalidate",
  authenticateToken,
  readingController.invalidateCache,
);
