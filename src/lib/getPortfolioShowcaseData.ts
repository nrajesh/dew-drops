import bundled from "@/data/portfolio_showcase.json";
import {
  emptyPortfolioShowcase,
  portfolioShowcaseSchema,
  type PortfolioShowcaseData,
} from "@/types/portfolioShowcase";
import { getStoredPortfolioShowcaseJson } from "@/lib/portfolioShowcaseStorage";

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function getPortfolioShowcaseData(): PortfolioShowcaseData {
  const storedRaw = getStoredPortfolioShowcaseJson();
  if (storedRaw) {
    const parsed = parseJson(storedRaw);
    const validated = portfolioShowcaseSchema.safeParse(parsed);
    if (validated.success) return validated.data;
  }

  const bundledValidated = portfolioShowcaseSchema.safeParse(bundled);
  if (bundledValidated.success) return bundledValidated.data;

  return emptyPortfolioShowcase();
}
