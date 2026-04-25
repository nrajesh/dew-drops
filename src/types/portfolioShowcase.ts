import { z } from "zod";

export const thirtySixtyNinetySchema = z.object({
  days30: z.string(),
  days60: z.string(),
  days90: z.string(),
});

export const portfolioProblemSchema = z.object({
  id: z.string(),
  title: z.string(),
  context: z.string().optional(),
  problem: z.string(),
  resolution: z.string(),
  outcome: z.string(),
});

export const portfolioProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  problems: z.array(portfolioProblemSchema),
});

export const portfolioShowcaseSchema = z.object({
  intro: z.string().optional(),
  projects: z.array(portfolioProjectSchema),
  plan306090: thirtySixtyNinetySchema,
});

export type ThirtySixtyNinety = z.infer<typeof thirtySixtyNinetySchema>;
export type PortfolioProblem = z.infer<typeof portfolioProblemSchema>;
export type PortfolioProject = z.infer<typeof portfolioProjectSchema>;
export type PortfolioShowcaseData = z.infer<typeof portfolioShowcaseSchema>;

export function emptyPortfolioShowcase(): PortfolioShowcaseData {
  return {
    intro: "",
    projects: [],
    plan306090: {
      days30: "",
      days60: "",
      days90: "",
    },
  };
}
