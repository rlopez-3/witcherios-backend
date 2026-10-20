import { ReadingRepository } from "./repository/readings.repository";
import { Product, SupportedLocale } from "../products/domain/product.types";

export class ReadingService {
  constructor(private readingRepo: ReadingRepository) {}

  async getAllReadings(): Promise<Product[]> {
    const catalog = await this.readingRepo.getAll();
    return catalog.filter((p) => p.active);
  }

  async getReadingBySlug(slug: string): Promise<Product | null> {
    const reading = await this.readingRepo.getBySlug(slug);
    if (!reading || !reading.active) return null;
    return reading;
  }

  async getReadingsByCategory(
    categoryLabel: string,
    locale: SupportedLocale,
  ): Promise<Product[]> {
    const target = categoryLabel.toLowerCase();
    const catalog = await this.getAllReadings();

    return catalog.filter((item) => {
      if (!item.categoryLabel) return false;

      return Object.values(item.categoryLabel).some(
        (label) => typeof label === "string" && label.toLowerCase() === target,
      );
    });
  }

  async getReadingsBySubcategory(
    subcategoryLabel: string,
    locale: SupportedLocale,
  ): Promise<Product[]> {
    const target = subcategoryLabel.toLowerCase().trim();
    const catalog = await this.getAllReadings();

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

  async searchReadings(
    searchTerm: string,
    locale: SupportedLocale,
    limit = 6,
  ): Promise<Product[]> {
    const cleanQuery = searchTerm.trim().toLowerCase();
    if (!cleanQuery) return [];

    const catalog = await this.getAllReadings();

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

  async updateReading(id: string, data: Partial<Product>): Promise<void> {
    await this.readingRepo.update(id, data);
  }

  async deleteReading(id: string): Promise<void> {
    await this.readingRepo.delete(id);
  }

  async invalidateCache(): Promise<void> {
    await this.readingRepo.invalidateCache();
  }
}
