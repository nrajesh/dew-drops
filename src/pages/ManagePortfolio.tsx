import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { getPortfolioShowcaseData } from "@/lib/getPortfolioShowcaseData";
import {
  clearStoredPortfolioShowcase,
  PORTFOLIO_SHOWCASE_UPDATED_EVENT,
  setStoredPortfolioShowcaseJson,
} from "@/lib/portfolioShowcaseStorage";
import {
  portfolioShowcaseSchema,
  type PortfolioProblem,
  type PortfolioProject,
  type PortfolioShowcaseData,
} from "@/types/portfolioShowcase";
import { showError, showSuccess } from "@/utils/toast";

const newProblem = (): PortfolioProblem => ({
  id: crypto.randomUUID(),
  title: "",
  context: "",
  problem: "",
  resolution: "",
  outcome: "",
});

const newProject = (): PortfolioProject => ({
  id: crypto.randomUUID(),
  title: "",
  summary: "",
  problems: [newProblem()],
});

const ManagePortfolio = () => {
  const [draft, setDraft] = useState<PortfolioShowcaseData>(() =>
    structuredClone(getPortfolioShowcaseData()),
  );
  const [saving, setSaving] = useState(false);

  const syncFromSource = useCallback(() => {
    setDraft(structuredClone(getPortfolioShowcaseData()));
  }, []);

  useEffect(() => {
    const onUpdate = () => syncFromSource();
    window.addEventListener(PORTFOLIO_SHOWCASE_UPDATED_EVENT, onUpdate);
    return () =>
      window.removeEventListener(PORTFOLIO_SHOWCASE_UPDATED_EVENT, onUpdate);
  }, [syncFromSource]);

  const updateIntro = (intro: string) =>
    setDraft((d) => ({ ...d, intro }));

  const updatePlan = (field: keyof PortfolioShowcaseData["plan306090"], value: string) =>
    setDraft((d) => ({
      ...d,
      plan306090: { ...d.plan306090, [field]: value },
    }));

  const updateProject = (index: number, patch: Partial<PortfolioProject>) =>
    setDraft((d) => {
      const projects = [...d.projects];
      projects[index] = { ...projects[index], ...patch };
      return { ...d, projects };
    });

  const addProject = () =>
    setDraft((d) => ({ ...d, projects: [newProject(), ...d.projects] }));

  const moveProject = (index: number, delta: -1 | 1) =>
    setDraft((d) => {
      const next = index + delta;
      if (next < 0 || next >= d.projects.length) return d;
      const projects = [...d.projects];
      [projects[index], projects[next]] = [projects[next], projects[index]];
      return { ...d, projects };
    });

  const removeProject = (index: number) =>
    setDraft((d) => ({
      ...d,
      projects: d.projects.filter((_, i) => i !== index),
    }));

  const updateProblem = (
    pIndex: number,
    probIndex: number,
    patch: Partial<PortfolioProblem>,
  ) =>
    setDraft((d) => {
      const projects = [...d.projects];
      const problems = [...projects[pIndex].problems];
      problems[probIndex] = { ...problems[probIndex], ...patch };
      projects[pIndex] = { ...projects[pIndex], problems };
      return { ...d, projects };
    });

  const addProblem = (pIndex: number) =>
    setDraft((d) => {
      const projects = [...d.projects];
      projects[pIndex] = {
        ...projects[pIndex],
        problems: [...projects[pIndex].problems, newProblem()],
      };
      return { ...d, projects };
    });

  const moveProblem = (pIndex: number, probIndex: number, delta: -1 | 1) =>
    setDraft((d) => {
      const problems = [...d.projects[pIndex].problems];
      const next = probIndex + delta;
      if (next < 0 || next >= problems.length) return d;
      [problems[probIndex], problems[next]] = [
        problems[next],
        problems[probIndex],
      ];
      const projects = [...d.projects];
      projects[pIndex] = { ...projects[pIndex], problems };
      return { ...d, projects };
    });

  const moveProblemToProject = (
    fromPIndex: number,
    probIndex: number,
    toPIndex: number,
  ) =>
    setDraft((d) => {
      if (fromPIndex === toPIndex) return d;
      if (toPIndex < 0 || toPIndex >= d.projects.length) return d;
      const projects = d.projects.map((p) => ({
        ...p,
        problems: [...p.problems],
      }));
      const story = projects[fromPIndex].problems[probIndex];
      if (!story) return d;
      projects[fromPIndex].problems.splice(probIndex, 1);
      if (projects[fromPIndex].problems.length === 0) {
        projects[fromPIndex].problems.push(newProblem());
      }
      projects[toPIndex].problems.push(story);
      return { ...d, projects };
    });

  const removeProblem = (pIndex: number, probIndex: number) =>
    setDraft((d) => {
      const projects = [...d.projects];
      const problems = projects[pIndex].problems.filter((_, i) => i !== probIndex);
      projects[pIndex] = { ...projects[pIndex], problems };
      return { ...d, projects };
    });

  const handleSave = async () => {
    const parsed = portfolioShowcaseSchema.safeParse(draft);
    if (!parsed.success) {
      showError("Please fix validation errors before saving.");
      return;
    }
    setSaving(true);
    const json = JSON.stringify(parsed.data);
    const ok = setStoredPortfolioShowcaseJson(json);
    setSaving(false);
    if (!ok) {
      showError("Could not save to browser storage.");
      return;
    }
    showSuccess("Portfolio saved. It will appear on the public Portfolio page.");
  };

  const handleReset = () => {
    clearStoredPortfolioShowcase();
    syncFromSource();
    showSuccess("Restored bundled defaults (local overrides cleared).");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link to="/portfolio" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Portfolio
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Manage Portfolio</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Edits are stored in this browser (localStorage), like chatbot knowledge.
            Export from bundled JSON in the repo when you want a permanent backup.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to defaults
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear local overrides?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes your saved portfolio from this browser and reloads the
                  bundled sample JSON from the app. This cannot be undone unless you
                  have a backup.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Introduction</CardTitle>
          <CardDescription>Optional framing for readers and hiring managers.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="intro" className="sr-only">
            Introduction
          </Label>
          <Textarea
            id="intro"
            rows={4}
            value={draft.intro ?? ""}
            onChange={(e) => updateIntro(e.target.value)}
            placeholder="Short overview of what this page highlights…"
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Projects</h3>
          <p className="text-xs text-muted-foreground mt-1">
            New projects are added at the top; new stories are added at the bottom of
            each project. Use arrows to reorder within a project, or move a story to
            another project from its card.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addProject}>
          <Plus className="h-4 w-4 mr-2" />
          Add project
        </Button>
      </div>

      {draft.projects.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No projects yet. Click &quot;Add project&quot; to start.
          </CardContent>
        </Card>
      ) : (
        draft.projects.map((project, pIndex) => (
          <Card key={project.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div className="space-y-2 flex-1 min-w-0">
                <CardTitle className="text-base">Project {pIndex + 1}</CardTitle>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor={`pt-${project.id}`}>Title</Label>
                    <Input
                      id={`pt-${project.id}`}
                      value={project.title}
                      onChange={(e) =>
                        updateProject(pIndex, { title: e.target.value })
                      }
                      placeholder="e.g. Platform reliability program"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`ps-${project.id}`}>Summary / context</Label>
                    <Textarea
                      id={`ps-${project.id}`}
                      rows={2}
                      value={project.summary ?? ""}
                      onChange={(e) =>
                        updateProject(pIndex, { summary: e.target.value })
                      }
                      placeholder="What kind of work, stack, or team…"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-1 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveProject(pIndex, -1)}
                  disabled={pIndex === 0}
                  aria-label="Move project up"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveProject(pIndex, 1)}
                  disabled={pIndex === draft.projects.length - 1}
                  aria-label="Move project down"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive h-8 w-8"
                  onClick={() => removeProject(pIndex)}
                  aria-label="Remove project"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {project.problems.map((problem, probIndex) => (
                <div key={problem.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">Problem / story {probIndex + 1}</span>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {draft.projects.length > 1 ? (
                        <Select
                          key={`${problem.id}-${pIndex}`}
                          onValueChange={(v) => {
                            const to = parseInt(v, 10);
                            if (!Number.isNaN(to)) {
                              moveProblemToProject(pIndex, probIndex, to);
                            }
                          }}
                        >
                          <SelectTrigger
                            className="h-8 w-[min(100%,11rem)] text-xs"
                            aria-label="Move story to another project"
                          >
                            <SelectValue placeholder="Move to project…" />
                          </SelectTrigger>
                          <SelectContent>
                            {draft.projects.map((target, tIndex) =>
                              tIndex === pIndex ? null : (
                                <SelectItem key={target.id} value={String(tIndex)}>
                                  {target.title.trim()
                                    ? target.title.trim()
                                    : `Project ${tIndex + 1}`}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveProblem(pIndex, probIndex, -1)}
                        disabled={probIndex === 0}
                        aria-label="Move story up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveProblem(pIndex, probIndex, 1)}
                        disabled={probIndex === project.problems.length - 1}
                        aria-label="Move story down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => removeProblem(pIndex, probIndex)}
                        disabled={project.problems.length <= 1}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`pb-${problem.id}-title`}>Headline</Label>
                    <Input
                      id={`pb-${problem.id}-title`}
                      value={problem.title}
                      onChange={(e) =>
                        updateProblem(pIndex, probIndex, { title: e.target.value })
                      }
                      placeholder="Short title shown in the collapsible"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`pb-${problem.id}-ctx`}>Project context (optional)</Label>
                    <Textarea
                      id={`pb-${problem.id}-ctx`}
                      rows={2}
                      value={problem.context ?? ""}
                      onChange={(e) =>
                        updateProblem(pIndex, probIndex, { context: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`pb-${problem.id}-pr`}>Problem</Label>
                    <Textarea
                      id={`pb-${problem.id}-pr`}
                      rows={3}
                      value={problem.problem}
                      onChange={(e) =>
                        updateProblem(pIndex, probIndex, { problem: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`pb-${problem.id}-rs`}>How I resolved it</Label>
                    <Textarea
                      id={`pb-${problem.id}-rs`}
                      rows={3}
                      value={problem.resolution}
                      onChange={(e) =>
                        updateProblem(pIndex, probIndex, {
                          resolution: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`pb-${problem.id}-out`}>Outcome</Label>
                    <Textarea
                      id={`pb-${problem.id}-out`}
                      rows={2}
                      value={problem.outcome}
                      onChange={(e) =>
                        updateProblem(pIndex, probIndex, { outcome: e.target.value })
                      }
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => addProblem(pIndex)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add problem
              </Button>
            </CardContent>
          </Card>
        ))
      )}

      <Card>
        <CardHeader>
          <CardTitle>30 / 60 / 90 day plan</CardTitle>
          <CardDescription>
            Editable narrative for each phase. Shown as separate collapsible sections
            on the public page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="d30">First 30 days</Label>
            <Textarea
              id="d30"
              rows={4}
              value={draft.plan306090.days30}
              onChange={(e) => updatePlan("days30", e.target.value)}
            />
          </div>
          <Separator />
          <div>
            <Label htmlFor="d60">31–60 days</Label>
            <Textarea
              id="d60"
              rows={4}
              value={draft.plan306090.days60}
              onChange={(e) => updatePlan("days60", e.target.value)}
            />
          </div>
          <Separator />
          <div>
            <Label htmlFor="d90">61–90 days</Label>
            <Textarea
              id="d90"
              rows={4}
              value={draft.plan306090.days90}
              onChange={(e) => updatePlan("days90", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagePortfolio;
