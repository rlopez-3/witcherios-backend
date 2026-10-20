import { RitualRepository } from "./repository/ritual.repository";
import { Product, SupportedLocale } from "../products/domain/product.types";

export class RitualService {
  constructor(private ritualRepo: RitualRepository) {}

  async getAllRituals(): Promise<Product[]> {
    const catalog = await this.ritualRepo.getAll();
    return catalog.filter((p) => p.active);
  }

  async getRitualBySlug(slug: string): Promise<Product | null> {
    const ritual = await this.ritualRepo.getBySlug(slug);
    if (!ritual || !ritual.active) return null;
    return ritual;
  }

  async getRitualsByCategory(
    categoryLabel: string,
    locale: SupportedLocale,
  ): Promise<Product[]> {
    const target = categoryLabel.toLowerCase();
    const catalog = await this.getAllRituals();

    return catalog.filter((item) => {
      if (!item.categoryLabel) return false;

      return Object.values(item.categoryLabel).some(
        (label) => typeof label === "string" && label.toLowerCase() === target,
      );
    });
  }

  async getRitualsBySubcategory(
    subcategoryLabel: string,
    locale: SupportedLocale,
  ): Promise<Product[]> {
    const target = subcategoryLabel.toLowerCase().trim();
    const catalog = await this.getAllRituals();

    return catalog.filter((item) => {
      if (item.subcategory?.toLowerCase() === target) return true;
      if (item.subcategoryLabel) {
        return Object.values(item.subcategoryLabel).some(
          (label) =>
            typeof label === "string" && label.toLowerCase() === target,
        );
      }

      return false;
    });
  }

  async searchRituals(
    searchTerm: string,
    locale: SupportedLocale,
    limit = 6,
  ): Promise<Product[]> {
    const cleanQuery = searchTerm.trim().toLowerCase();
    if (!cleanQuery) return [];

    const catalog = await this.getAllRituals();

    return catalog
      .filter((item) => {
        const name = item.name?.[locale]?.toLowerCase() || "";
        const category = item.categoryLabel?.[locale]?.toLowerCase() || "";
        const subcategory =
          item.subcategoryLabel?.[locale]?.toLowerCase() || "";
        const tags = item.tags?.join(" ").toLowerCase() || "";

        return (
          name.includes(cleanQuery) ||
          category.includes(cleanQuery) ||
          subcategory.includes(cleanQuery) ||
          tags.includes(cleanQuery)
        );
      })
      .slice(0, limit);
  }

  async updateRitual(id: string, data: Partial<Product>): Promise<void> {
    await this.ritualRepo.update(id, data);
  }

  async deleteRitual(id: string): Promise<void> {
    await this.ritualRepo.delete(id);
  }

  async invalidateCache(): Promise<void> {
    await this.ritualRepo.invalidateCache();
  }
}
