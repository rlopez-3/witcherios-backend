import { db } from "@config/firebase";
import { redisCache } from "@shared/cache/redisCache";
import { Product } from "../domain/product.types";

const CATALOG_KEY = "rituals:catalog";
const PREFIX_SLUG = "rituals:slug";
const DEFAULT_TTL = 86400;

export class RitualRepository {
  private collection = db.collection("rituals");

  async getAll(): Promise<Product[]> {
    const start = Date.now();

    const cached = await redisCache.get<Product[]>(CATALOG_KEY);
    if (cached) {
      console.log(
        `[REDIS HIT] 'rituals.getAll' -> ${cached.length} items (${Date.now() - start}ms)`,
      );
      return cached;
    }

    console.log(
      "[FIRESTORE MISS] 'rituals.getAll' -> Consultando colección...",
    );
    try {
      const snapshot = await this.collection.get();
      const rituals = snapshot.docs.map((doc) => ({
        ...(doc.data() as Product),
        id: doc.id,
      }));

      await redisCache.set(CATALOG_KEY, rituals, DEFAULT_TTL);
      console.log(
        `[FIRESTORE OK] 'rituals.getAll' -> ${rituals.length} docs recuperados y cacheados (${Date.now() - start}ms)`,
      );

      return rituals;
    } catch (error) {
      console.error("[FIRESTORE ERROR] 'rituals.getAll' falló:", error);
      throw error;
    }
  }

  async getBySlug(slug: string): Promise<Product | null> {
    const start = Date.now();
    const cacheKey = `${PREFIX_SLUG}:${slug}`;

    const cached = await redisCache.get<Product>(cacheKey);
    if (cached) {
      console.log(
        `[REDIS HIT] 'rituals.getBySlug' -> slug: '${slug}' (${Date.now() - start}ms)`,
      );
      return cached;
    }

    const catalog = await this.getAll();
    const foundInCatalog = catalog.find((p) => p.slug === slug);

    if (foundInCatalog) {
      await redisCache.set(cacheKey, foundInCatalog, DEFAULT_TTL);
      console.log(
        `[CATALOG HIT] 'rituals.getBySlug' -> slug: '${slug}' recuperado del catálogo (${Date.now() - start}ms)`,
      );
      return foundInCatalog;
    }

    const snapshot = await this.collection
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log(
        `[NOT FOUND] 'rituals.getBySlug' -> slug: '${slug}' no existe`,
      );
      return null;
    }

    const doc = snapshot.docs[0];
    const ritual = { ...(doc.data() as Product), id: doc.id };

    await redisCache.set(cacheKey, ritual, DEFAULT_TTL);
    console.log(
      `[FIRESTORE OK] 'rituals.getBySlug' -> slug: '${slug}' recuperado (${Date.now() - start}ms)`,
    );

    return ritual;
  }

  async update(id: string, data: Partial<Product>): Promise<void> {
    const start = Date.now();
    try {
      await this.collection.doc(id).update(data);
      console.log(
        `[FIRESTORE WRITE] 'rituals.update' -> ID: '${id}' (${Date.now() - start}ms)`,
      );

      await this.invalidateCache();
    } catch (error) {
      console.error(
        `[FIRESTORE ERROR] 'rituals.update' falló en ID: '${id}'`,
        error,
      );
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const start = Date.now();
    try {
      await this.collection.doc(id).delete();
      console.log(
        `[FIRESTORE DELETE] 'rituals.delete' -> ID: '${id}' (${Date.now() - start}ms)`,
      );

      await this.invalidateCache();
    } catch (error) {
      console.error(
        `[FIRESTORE ERROR] 'rituals.delete' falló en ID: '${id}'`,
        error,
      );
      throw error;
    }
  }

  async invalidateCache(): Promise<void> {
    const start = Date.now();
    try {
      await redisCache.invalidatePrefix("rituals");
      console.log(
        `[REDIS PURGE] Prefijo 'rituals:*' eliminado (${Date.now() - start}ms)`,
      );
    } catch (error) {
      console.error("[REDIS ERROR] Fallo al purgar prefijo 'rituals:'", error);
    }
  }
}
