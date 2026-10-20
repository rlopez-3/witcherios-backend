export type SupportedLocale = "es" | "en";
export type SupportedCurrency = "CRC" | "USD";

export type LocalizedString = {
  es: string;
  en: string;
};

export type ProductBadge = "new" | "sale" | "featured";

export type Product = {
  id: string;
  slug: string;
  name: LocalizedString;
  category: string;
  categoryLabel: LocalizedString;
  parentSubcategory?: string;
  parentSubcategoryLabel?: LocalizedString;
  subcategory: string;
  subcategoryLabel: LocalizedString;
  prices: Record<SupportedCurrency, number>;
  originalPrices?: Record<SupportedCurrency, number>;
  priceRange?: {
    min: Record<SupportedCurrency, number>;
    max: Record<SupportedCurrency, number>;
  };
  image?: string;
  badge?: ProductBadge;
  description?: LocalizedString;
  stock?: number;
  tags?: string[];
  active: boolean;
  isWitcherios?: boolean;
};

export function getDefaultCurrency(locale: SupportedLocale): SupportedCurrency {
  return locale === "en" ? "USD" : "CRC";
}

const LOCALE_MAP: Record<SupportedLocale, string> = {
  es: "es-CR",
  en: "en-US",
};

export function formatPrice(
  value: number,
  currency: SupportedCurrency,
  locale: SupportedLocale = "es",
): string {
  const targetLocale = LOCALE_MAP[locale] || "es-CR";

  try {
    return new Intl.NumberFormat(targetLocale, {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "CRC" ? 0 : 2,
      maximumFractionDigits: currency === "CRC" ? 0 : 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString(targetLocale)} ${currency}`;
  }
}
