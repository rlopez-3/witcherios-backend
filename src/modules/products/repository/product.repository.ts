import { db } from "@config/firebase";
import { redisCache } from "@shared/cache/redisCache";
import { Product } from "../domain/product.types";

const CATALOG_KEY = "products:catalog";
const PREFIX_SLUG = "products:slug";
const DEFAULT_TTL = 86400;

export class ProductRepository {
  private collection = db.collection("products");

  async getAll(): Promise<Product[]> {
    const start = Date.now();

    // 1. Intentar Redis
    const cached = await redisCache.get<Product[]>(CATALOG_KEY);
    if (cached) {
      console.log(
        `[REDIS HIT] 'getAll' -> ${cached.length} items (${Date.now() - start}ms)`,
      );
      return cached;
    }

    // 2. Consulta Firestore
    console.log("[FIRESTORE MISS] 'getAll' -> Consultando colección...");
    try {
      const snapshot = await this.collection.get();
      const products = snapshot.docs.map((doc) => ({
        ...(doc.data() as Product),
        id: doc.id,
      }));

      // 3. Guardar en Redis
      await redisCache.set(CATALOG_KEY, products, DEFAULT_TTL);
      console.log(
        `[FIRESTORE OK] 'getAll' -> ${products.length} docs recuperados y cacheados (${Date.now() - start}ms)`,
      );

      return products;
    } catch (error) {
      console.error("[FIRESTORE ERROR] 'getAll' fallo:", error);
      throw error;
    }
  }

  async getBySlug(slug: string): Promise<Product | null> {
    const start = Date.now();
    const cacheKey = `${PREFIX_SLUG}:${slug}`;

    // 1. Intentar Redis individual
    const cached = await redisCache.get<Product>(cacheKey);
    if (cached) {
      console.log(
        `[REDIS HIT] 'getBySlug' -> slug: '${slug}' (${Date.now() - start}ms)`,
      );
      return cached;
    }

    // 2. Intentar desde catálogo general (evita lectura extra a Firestore si el catálogo está cacheado)
    const catalog = await this.getAll();
    const foundInCatalog = catalog.find((p) => p.slug === slug);

    if (foundInCatalog) {
      await redisCache.set(cacheKey, foundInCatalog, DEFAULT_TTL);
      console.log(
        `[CATALOG HIT] 'getBySlug' -> slug: '${slug}' recuperado del catálogo (${Date.now() - start}ms)`,
      );
      return foundInCatalog;
    }

    // 3. Fallback directo a Firestore
    const snapshot = await this.collection
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log(`[NOT FOUND] 'getBySlug' -> slug: '${slug}' no existe`);
      return null;
    }

    const doc = snapshot.docs[0];
    const product = { ...(doc.data() as Product), id: doc.id };

    await redisCache.set(cacheKey, product, DEFAULT_TTL);
    console.log(
      `[FIRESTORE OK] 'getBySlug' -> slug: '${slug}' recuperado (${Date.now() - start}ms)`,
    );

    return product;
  }

  async update(id: string, data: Partial<Product>): Promise<void> {
    const start = Date.now();
    try {
      await this.collection.doc(id).update(data);
      console.log(
        `[FIRESTORE WRITE] 'update' -> ID: '${id}' (${Date.now() - start}ms)`,
      );

      // Invalida la caché de Redis tras modificar
      await this.invalidateCache();
    } catch (error) {
      console.error(`[FIRESTORE ERROR] 'update' fallo en ID: '${id}'`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const start = Date.now();
    try {
      await this.collection.doc(id).delete();
      console.log(
        `[FIRESTORE DELETE] 'delete' -> ID: '${id}' (${Date.now() - start}ms)`,
      );

      // Invalida la caché de Redis tras eliminar
      await this.invalidateCache();
    } catch (error) {
      console.error(`[FIRESTORE ERROR] 'delete' fallo en ID: '${id}'`, error);
      throw error;
    }
  }

  async invalidateCache(): Promise<void> {
    const start = Date.now();
    try {
      await redisCache.invalidatePrefix("products");
      console.log(
        `[REDIS PURGE] Prefijo 'products:*' eliminado (${Date.now() - start}ms)`,
      );
    } catch (error) {
      console.error("[REDIS ERROR] Fallo al purgar prefijo 'products:'", error);
    }
  }
}
