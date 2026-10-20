import { ProductRepository } from "./repository/product.repository";
import { Product, SupportedLocale } from "./domain/product.types";

export class ProductService {
  constructor(private productRepo: ProductRepository) {}

  async getAllProducts(): Promise<Product[]> {
    const catalog = await this.productRepo.getAll();
    return catalog.filter((p) => p.active);
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    const product = await this.productRepo.getBySlug(slug);
    if (!product || !product.active) return null;
    return product;
  }

  async getProductsByCategory(
    categoryLabel: string,
    locale: SupportedLocale,
  ): Promise<Product[]> {
    const targetLabel = categoryLabel.toLowerCase();
    const catalog = await this.getAllProducts();
    const target = targetLabel.toLowerCase();

    return catalog.filter((product) => {
      if (!product.categoryLabel) return false;

      return Object.values(product.categoryLabel).some(
        (label) => typeof label === "string" && label.toLowerCase() === target,
      );
    });
    //return catalog.filter((product) => {
    //const labelInLocale = product.categoryLabel?.[locale]?.toLowerCase();
    //return labelInLocale === targetLabel;
    //});
  }

  async getProductsBySubcategory(
    subcategoryLabel: string,
    locale: SupportedLocale,
  ): Promise<Product[]> {
    const target = subcategoryLabel.toLowerCase().trim();
    const catalog = await this.getAllProducts();

    return catalog.filter((product) => {
      if (product.subcategory?.toLowerCase() === target) return true;
      if (product.subcategoryLabel) {
        return Object.values(product.subcategoryLabel).some(
          (label) =>
            typeof label === "string" && label.toLowerCase() === target,
        );
      }

      return false;
    });
  }

  async searchProducts(
    searchTerm: string,
    locale: SupportedLocale,
    limit = 6,
  ): Promise<Product[]> {
    const cleanQuery = searchTerm.trim().toLowerCase();
    if (!cleanQuery) return [];

    const catalog = await this.getAllProducts();

    return catalog
      .filter((product) => {
        const name = product.name?.[locale]?.toLowerCase() || "";
        const category = product.categoryLabel?.[locale]?.toLowerCase() || "";
        const subcategory =
          product.subcategoryLabel?.[locale]?.toLowerCase() || "";
        const tags = product.tags?.join(" ").toLowerCase() || "";

        return (
          name.includes(cleanQuery) ||
          category.includes(cleanQuery) ||
          subcategory.includes(cleanQuery) ||
          tags.includes(cleanQuery)
        );
      })
      .slice(0, limit);
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    await this.productRepo.update(id, data);
    // No necesitas llamar a invalidateCache aquí otra vez si el Repositorio ya lo hace
  }

  async deleteProduct(id: string): Promise<void> {
    await this.productRepo.delete(id);
  }

  async invalidateCache(): Promise<void> {
    await this.productRepo.invalidateCache();
  }
}
