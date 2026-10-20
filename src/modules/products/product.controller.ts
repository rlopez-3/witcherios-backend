import { Request, Response, NextFunction } from "express";
import { ProductService } from "./product.service";
import { SupportedLocale } from "./domain/product.types";
import { AppError } from "@shared/middleware/errorHandler";

export class ProductController {
  constructor(private productService: ProductService) {}

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const products = await this.productService.getAllProducts();
      return res.json(products);
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

      const results = await this.productService.searchProducts(
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

      const products = await this.productService.getProductsByCategory(
        category,
        locale,
      );
      return res.json(products);
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
      const product = await this.productService.getProductBySlug(slug);

      if (!product) {
        throw new AppError(404, "Producto no encontrado");
      }

      return res.json(product);
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

      const products = await this.productService.getProductsBySubcategory(
        subcategory,
        locale,
      );
      return res.json(products);
    } catch (error) {
      next(error);
    }
  };

  invalidateCache = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.productService.invalidateCache();
      return res.json({
        message: "Caché de productos invalidado correctamente",
      });
    } catch (error) {
      next(error);
    }
  };
}
