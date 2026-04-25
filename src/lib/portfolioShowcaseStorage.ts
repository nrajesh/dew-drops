export const PORTFOLIO_SHOWCASE_STORAGE_KEY = "dew-drops-portfolio-showcase";

export const PORTFOLIO_SHOWCASE_UPDATED_EVENT =
  "dew-drops-portfolio-showcase-updated";

export function getStoredPortfolioShowcaseJson(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PORTFOLIO_SHOWCASE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredPortfolioShowcaseJson(json: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(PORTFOLIO_SHOWCASE_STORAGE_KEY, json);
    window.dispatchEvent(new Event(PORTFOLIO_SHOWCASE_UPDATED_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredPortfolioShowcase(): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.removeItem(PORTFOLIO_SHOWCASE_STORAGE_KEY);
    window.dispatchEvent(new Event(PORTFOLIO_SHOWCASE_UPDATED_EVENT));
    return true;
  } catch {
    return false;
  }
}
