import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Printer, ChevronDown, Pencil, Target, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortfolioShowcaseData } from "@/hooks/usePortfolioShowcaseData";
import { useAuth } from "@/contexts/AuthContext";
import type { PortfolioProblem, PortfolioProject } from "@/types/portfolioShowcase";

const formatTextWithLineBreaks = (text: string) =>
  text.split("\n").map((line, index) => (
    <span key={index}>
      {line}
      {index < text.split("\n").length - 1 && <br />}
    </span>
  ));

const Portfolio = () => {
  const data = usePortfolioShowcaseData();
  const { session } = useAuth();
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const isOpen = (key: string) => openMap[key] !== false;
  const setOpen = (key: string, open: boolean) => {
    setOpenMap((prev) => ({ ...prev, [key]: open }));
  };

  const handlePrint = useCallback(() => {
    const originalTitle = document.title;
    document.title = "Rajesh-Narayanan-Portfolio.pdf";
    document.body.classList.add("print-light-mode");
    window.print();
    document.body.classList.remove("print-light-mode");
    document.title = originalTitle;
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-2 print:hidden mb-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto items-end sm:items-center">
          <p className="text-sm text-muted-foreground order-2 sm:order-1 text-right sm:text-left">
            Collapsed sections will not be printed.
          </p>
          <div className="flex gap-2 order-1 sm:order-2">
            {session && (
              <Button variant="outline" asChild>
                <Link to="/manage-portfolio" className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
            <Button onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="h-4 w-4" /> Print to PDF
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Portfolio</CardTitle>
          <CardDescription>
            Selected projects, challenges, how they were addressed, and results.
          </CardDescription>
        </CardHeader>
        {data.intro ? (
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {formatTextWithLineBreaks(data.intro)}
            </p>
          </CardContent>
        ) : null}
      </Card>

      {data.projects.map((project: PortfolioProject) => (
        <Card key={project.id}>
          <CardHeader>
            <CardTitle className="text-xl">{project.title}</CardTitle>
            {project.summary ? (
              <CardDescription className="text-base">
                {formatTextWithLineBreaks(project.summary)}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {project.problems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stories added yet.</p>
            ) : (
              project.problems.map((problem: PortfolioProblem) => {
                const key = `p-${project.id}-${problem.id}`;
                return (
                  <Collapsible
                    key={problem.id}
                    open={isOpen(key)}
                    onOpenChange={(o) => setOpen(key, o)}
                    className="cv-collapsible-section rounded-lg border"
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between h-auto py-3 px-4 hover:bg-muted/50 rounded-b-none"
                      >
                        <span className="font-semibold text-left text-primary flex items-center gap-2">
                          <Target className="h-4 w-4 shrink-0" />
                          {problem.title}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 shrink-0 transition-transform",
                            isOpen(key) ? "rotate-180" : "rotate-0",
                          )}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="collapsible-content px-4 pb-4 pt-0">
                      <div className="prose dark:prose-invert max-w-none text-sm space-y-4 border-t pt-4">
                        {problem.context ? (
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-1">
                              Project context
                            </h4>
                            <p className="text-muted-foreground">
                              {formatTextWithLineBreaks(problem.context)}
                            </p>
                          </div>
                        ) : null}
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-1">
                            Problem
                          </h4>
                          <p className="text-muted-foreground">
                            {formatTextWithLineBreaks(problem.problem)}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-1">
                            How I resolved it
                          </h4>
                          <p className="text-muted-foreground">
                            {formatTextWithLineBreaks(problem.resolution)}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-1">
                            Outcome
                          </h4>
                          <p className="text-muted-foreground">
                            {formatTextWithLineBreaks(problem.outcome)}
                          </p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <CalendarRange className="h-5 w-5" />
            30 / 60 / 90 day plan
          </CardTitle>
          <CardDescription>
            How I typically ramp and deliver value in a new role.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              ["First 30 days", "plan-30", data.plan306090.days30],
              ["31–60 days", "plan-60", data.plan306090.days60],
              ["61–90 days", "plan-90", data.plan306090.days90],
            ] as const
          ).map(([label, key, body]) => (
            <Collapsible
              key={key}
              open={isOpen(key)}
              onOpenChange={(o) => setOpen(key, o)}
              className="cv-collapsible-section rounded-lg border"
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between h-auto py-3 px-4 hover:bg-muted/50 rounded-b-none"
                >
                  <span className="font-semibold text-primary">{label}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform",
                      isOpen(key) ? "rotate-180" : "rotate-0",
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="collapsible-content px-4 pb-4 pt-0">
                <div className="border-t pt-4 prose dark:prose-invert max-w-none text-sm text-muted-foreground">
                  {body.trim()
                    ? formatTextWithLineBreaks(body)
                    : "—"}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Portfolio;
