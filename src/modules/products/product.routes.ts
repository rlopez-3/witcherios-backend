import { Router } from "express";
import { authenticateToken } from "@shared/middleware/auth.middleware";
import { ProductRepository } from "./repository/product.repository";
import { ProductService } from "./product.service";
import { ProductController } from "./product.controller";

const productRepo = new ProductRepository();
const productService = new ProductService(productRepo);
const productController = new ProductController(productService);

export const productRouter = Router();

// Public routes
productRouter.get("/", productController.getAll);
productRouter.get("/search", productController.search);
productRouter.get("/category/:category", productController.getByCategory);
productRouter.get(
  "/subcategory/:subcategory",
  productController.getBySubcategory,
);
productRouter.get("/:slug", productController.getBySlug);

// Protected routes
productRouter.post(
  "/cache/invalidate",
  authenticateToken,
  productController.invalidateCache,
);
