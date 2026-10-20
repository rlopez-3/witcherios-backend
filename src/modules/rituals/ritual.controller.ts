import { Request, Response, NextFunction } from "express";
import { RitualService } from "./ritual.service";
import { SupportedLocale } from "../products/domain/product.types";
import { AppError } from "@shared/middleware/errorHandler";

export class RitualController {
  constructor(private ritualService: RitualService) {}

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rituals = await this.ritualService.getAllRituals();
      return res.json(rituals);
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

      const results = await this.ritualService.searchRituals(q, locale, limit);
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

      const rituals = await this.ritualService.getRitualsByCategory(
        category,
        locale,
      );
      return res.json(rituals);
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
      const ritual = await this.ritualService.getRitualBySlug(slug);

      if (!ritual) {
        throw new AppError(404, "Ritual no encontrado");
      }

      return res.json(ritual);
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

      const rituals = await this.ritualService.getRitualsBySubcategory(
        subcategory,
        locale,
      );
      return res.json(rituals);
    } catch (error) {
      next(error);
    }
  };

  invalidateCache = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.ritualService.invalidateCache();
      return res.json({
        message: "Caché de rituales invalidado correctamente",
      });
    } catch (error) {
      next(error);
    }
  };
}
