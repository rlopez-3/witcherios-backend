import { Request, Response, NextFunction } from "express";
import { ReadingService } from "./reading.service";
import { SupportedLocale } from "../products/domain/product.types";
import { AppError } from "@shared/middleware/errorHandler";

export class ReadingController {
  constructor(private readingService: ReadingService) {}

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const readings = await this.readingService.getAllReadings();
      return res.json(readings);
    } catch (error) {
      next(error);
    }
  };

  search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (req.query.q as string) || "";
      const locale = ((req.query.locale as string) || "es") as SupportedLocale;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 6;

      const results = await this.readingService.searchReadings(
        q,
        locale,
        limit,
      );
      return res.json(results);
    } catch (error) {
      next(error);
    }
  };

  getByCategory = async (
    req: Request<{ category: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { category } = req.params;
      const locale = ((req.query.locale as string) || "es") as SupportedLocale;

      const readings = await this.readingService.getReadingsByCategory(
        category,
        locale,
      );
      return res.json(readings);
    } catch (error) {
      next(error);
    }
  };

  getBySlug = async (
    req: Request<{ slug: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { slug } = req.params;
      const reading = await this.readingService.getReadingBySlug(slug);

      if (!reading) {
        throw new AppError(404, "Lectura no encontrada");
      }

      return res.json(reading);
    } catch (error) {
      next(error);
    }
  };

  getBySubcategory = async (
    req: Request<{ subcategory: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { subcategory } = req.params;
      const locale = ((req.query.locale as string) || "es") as SupportedLocale;

      const readings = await this.readingService.getReadingsBySubcategory(
        subcategory,
        locale,
      );
      return res.json(readings);
    } catch (error) {
      next(error);
    }
  };

  invalidateCache = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.readingService.invalidateCache();
      return res.json({
        message: "Caché de lecturas invalidado correctamente",
      });
    } catch (error) {
      next(error);
    }
  };
}
