import { useEffect, useState } from "react";
import { getPortfolioShowcaseData } from "@/lib/getPortfolioShowcaseData";
import { PORTFOLIO_SHOWCASE_UPDATED_EVENT } from "@/lib/portfolioShowcaseStorage";
import type { PortfolioShowcaseData } from "@/types/portfolioShowcase";

export function usePortfolioShowcaseData(): PortfolioShowcaseData {
  const [data, setData] = useState<PortfolioShowcaseData>(() =>
    getPortfolioShowcaseData(),
  );

  useEffect(() => {
    const sync = () => setData(getPortfolioShowcaseData());
    window.addEventListener(PORTFOLIO_SHOWCASE_UPDATED_EVENT, sync);
    return () =>
      window.removeEventListener(PORTFOLIO_SHOWCASE_UPDATED_EVENT, sync);
  }, []);

  return data;
}
