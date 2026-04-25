import { Upload, Trash2, Loader2, Download } from "lucide-react";
import { showError } from "@/utils/toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useCallback, useEffect, useMemo, useState } from "react";
import { localDataProvider } from "@/lib/LocalDataProvider";
import { getPortfolioShowcaseData } from "@/lib/getPortfolioShowcaseData";
import { showSuccess } from "@/utils/toast";
import {
  buildMergedTabular,
  DATA_SECTION_KEYS,
  defaultImportSelectionAll,
  getEffectiveTabularSnapshot,
  keysPresentInImport,
  parseImportFile,
  selectionFromKeysInFile,
  SECTION_LABELS,
  TABULAR_BUNDLE_KEYS,
  validateImportSelection,
  type DataSectionKey,
  type DewDropsExportPayload,
  type ImportSelection,
  type ParsedImportFile,
} from "@/lib/dataImportExport";
import type { LocalDataBundleTabular } from "@/lib/localDataBundleStorage";
import {
  clearStoredLocalDataBundle,
  LOCAL_DATA_BUNDLE_STORAGE_KEY,
  parseLocalDataBundleTabular,
  setStoredLocalDataBundleTabular,
} from "@/lib/localDataBundleStorage";
import {
  clearStoredPortfolioShowcase,
  getStoredPortfolioShowcaseJson,
  setStoredPortfolioShowcaseJson,
} from "@/lib/portfolioShowcaseStorage";
import {
  clearStoredChatbotKnowledgeContent,
  getStoredChatbotKnowledgeContent,
  setStoredChatbotKnowledgeContent,
} from "@/lib/chatbotKnowledgeStorage";

type StorageSnapshot = {
  bundle: string | null;
  portfolio: string | null;
  chatbot: string | null;
};

function captureStorageSnapshot(): StorageSnapshot {
  if (typeof window === "undefined") {
    return { bundle: null, portfolio: null, chatbot: null };
  }
  try {
    return {
      bundle: localStorage.getItem(LOCAL_DATA_BUNDLE_STORAGE_KEY),
      portfolio: getStoredPortfolioShowcaseJson(),
      chatbot: getStoredChatbotKnowledgeContent(),
    };
  } catch {
    return { bundle: null, portfolio: null, chatbot: null };
  }
}

function restoreStorageSnapshot(s: StorageSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    if (s.bundle === null || s.bundle === "") {
      clearStoredLocalDataBundle();
    } else {
      try {
        const tabular = parseLocalDataBundleTabular(JSON.parse(s.bundle) as unknown);
        if (tabular) setStoredLocalDataBundleTabular(tabular);
        else clearStoredLocalDataBundle();
      } catch {
        clearStoredLocalDataBundle();
      }
    }
    if (s.portfolio === null) clearStoredPortfolioShowcase();
    else setStoredPortfolioShowcaseJson(s.portfolio);
    if (s.chatbot === null) clearStoredChatbotKnowledgeContent();
    else setStoredChatbotKnowledgeContent(s.chatbot);
  } catch {
    /* best-effort rollback */
  }
}

function defaultExportSelection(): ImportSelection {
  return defaultImportSelectionAll();
}

const ManageData = () => {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importInputKey, setImportInputKey] = useState(0);
  const [exportSelection, setExportSelection] = useState<ImportSelection>(() =>
    defaultExportSelection(),
  );
  const [importPreview, setImportPreview] = useState<
    null | { error: string } | { data: ParsedImportFile }
  >(null);
  const [importSelection, setImportSelection] = useState<ImportSelection>(() =>
    defaultImportSelectionAll(),
  );

  useEffect(() => {
    if (!importFile) {
      setImportPreview(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const text = await importFile.text();
        if (cancelled) return;
        const parsed = JSON.parse(text) as unknown;
        const r = parseImportFile(parsed);
        if (cancelled) return;
        if (!r.ok) {
          setImportPreview({ error: r.message });
          return;
        }
        setImportPreview({ data: r.data });
        setImportSelection(selectionFromKeysInFile(keysPresentInImport(r.data)));
      } catch {
        if (cancelled) return;
        setImportPreview({ error: "Could not read or parse this file." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [importFile]);

  const exportAnySelected = useMemo(
    () => DATA_SECTION_KEYS.some((k) => exportSelection[k]),
    [exportSelection],
  );

  const setExportKey = useCallback((key: DataSectionKey, checked: boolean) => {
    setExportSelection((prev) => ({ ...prev, [key]: checked }));
  }, []);

  const setImportKey = useCallback((key: DataSectionKey, checked: boolean) => {
    setImportSelection((prev) => ({ ...prev, [key]: checked }));
  }, []);

  const setAllExport = useCallback((checked: boolean) => {
    setExportSelection(
      Object.fromEntries(DATA_SECTION_KEYS.map((k) => [k, checked])) as ImportSelection,
    );
  }, []);

  const handleExport = () => {
    if (!exportAnySelected) {
      showError("Select at least one section to export.");
      return;
    }
    setIsLoading("export");
    try {
      const includedSections: DataSectionKey[] = [];
      const payload: DewDropsExportPayload = {
        exportVersion: 2,
        exportedAt: new Date().toISOString(),
        includedSections,
      };

      if (exportSelection.posts) {
        payload.posts = localDataProvider.getPosts();
        includedSections.push("posts");
      }
      if (exportSelection.profiles) {
        payload.profiles = localDataProvider.getProfiles();
        includedSections.push("profiles");
      }
      if (exportSelection.travel_locations) {
        payload.travel_locations = localDataProvider.getTravelLocations();
        includedSections.push("travel_locations");
      }
      if (exportSelection.gallery_images) {
        payload.gallery_images = localDataProvider.getGalleryImages();
        includedSections.push("gallery_images");
      }
      if (exportSelection.feature_toggles) {
        payload.feature_toggles = localDataProvider.getFeatureToggles();
        includedSections.push("feature_toggles");
      }
      if (exportSelection.chatbot_knowledge) {
        payload.chatbot_knowledge = localDataProvider.getChatbotKnowledge();
        includedSections.push("chatbot_knowledge");
      }
      if (exportSelection.portfolio_showcase) {
        payload.portfolio_showcase = getPortfolioShowcaseData();
        includedSections.push("portfolio_showcase");
      }

      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const suffix =
        includedSections.length === DATA_SECTION_KEYS.length
          ? "full"
          : `partial-${includedSections.length}-sections`;
      a.download = `dew-drops-export-${suffix}-${new Date().toISOString().replace(/:/g, "-")}.json`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess("Export downloaded.");
    } catch (e) {
      console.error(e);
      showError("Export failed. If the file is very large, try again or clear old data.");
    } finally {
      setIsLoading(null);
    }
  };

  const applySelectedImport = (
    data: ParsedImportFile,
    selection: ImportSelection,
    snapshot: StorageSnapshot,
  ): boolean => {
    const validation = validateImportSelection(selection, data);
    if (validation) {
      showError(validation);
      return false;
    }

    const rollback = () => restoreStorageSnapshot(snapshot);
    const bundleNeedsWrite = TABULAR_BUNDLE_KEYS.some(
      (k) => selection[k] && data.tabularPatches[k],
    );

    let merged: LocalDataBundleTabular | null = null;
    if (bundleNeedsWrite) {
      const base = getEffectiveTabularSnapshot();
      merged = buildMergedTabular(base, data.tabularPatches, selection);
    }

    if (selection.portfolio_showcase && data.portfolioShowcase !== undefined) {
      if (
        !setStoredPortfolioShowcaseJson(JSON.stringify(data.portfolioShowcase))
      ) {
        rollback();
        showError("Could not save portfolio to browser storage.");
        return false;
      }
    }

    if (selection.chatbot_knowledge) {
      if (data.chatbotInFile === "empty") {
        if (!clearStoredChatbotKnowledgeContent()) {
          rollback();
          showError("Could not clear stored chatbot knowledge.");
          return false;
        }
      } else if (data.chatbotInFile !== "absent" && "merged" in data.chatbotInFile) {
        if (!setStoredChatbotKnowledgeContent(data.chatbotInFile.merged)) {
          rollback();
          showError("Could not save chatbot knowledge to browser storage.");
          return false;
        }
      }
    }

    if (bundleNeedsWrite && merged) {
      if (!setStoredLocalDataBundleTabular(merged)) {
        rollback();
        showError(
          "Could not save to browser storage (quota or access). Try a smaller export or free space.",
        );
        return false;
      }
    }

    return true;
  };

  const handleImport = async () => {
    if (!importFile || !importPreview || !("data" in importPreview)) return;
    setIsLoading("import");
    try {
      const snapshot = captureStorageSnapshot();
      if (
        !applySelectedImport(importPreview.data, importSelection, snapshot)
      ) {
        return;
      }
      showSuccess("Import saved. Reloading…");
      setImportFile(null);
      setImportPreview(null);
      setImportInputKey((k) => k + 1);
      window.setTimeout(() => window.location.reload(), 400);
    } catch (e) {
      console.error(e);
      showError("Import failed.");
    } finally {
      setIsLoading(null);
    }
  };

  const handleReset = () => {
    setIsLoading("reset");
    try {
      clearStoredLocalDataBundle();
      clearStoredPortfolioShowcase();
      clearStoredChatbotKnowledgeContent();
      showSuccess("Local overrides cleared. Reloading…");
      window.setTimeout(() => window.location.reload(), 400);
    } catch (e) {
      console.error(e);
      showError("Reset failed.");
    } finally {
      setIsLoading(null);
    }
  };

  const importReady =
    importFile &&
    importPreview &&
    "data" in importPreview &&
    DATA_SECTION_KEYS.some((k) => importSelection[k]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Manage Data</h2>
      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>
            Choose which parts to download as JSON (smaller files when you only
            need portfolio, chatbot, etc.). Re-import with the matching sections
            selected; other data in the browser stays unchanged unless you
            overwrite it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAllExport(true)}
              disabled={!!isLoading}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAllExport(false)}
              disabled={!!isLoading}
            >
              Clear all
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {DATA_SECTION_KEYS.map((key) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={`export-${key}`}
                  checked={exportSelection[key]}
                  onCheckedChange={(v) => setExportKey(key, v === true)}
                  disabled={!!isLoading}
                />
                <Label
                  htmlFor={`export-${key}`}
                  className="text-sm font-normal leading-none cursor-pointer"
                >
                  {SECTION_LABELS[key]}
                </Label>
              </div>
            ))}
          </div>
          <Button onClick={handleExport} disabled={!!isLoading || !exportAnySelected}>
            {isLoading === "export" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export selected
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Import Data</CardTitle>
          <CardDescription>
            <span className="font-bold text-destructive">Warning:</span> Applies
            only the sections you select. Tabular sections (posts, gallery, etc.)
            are merged with what is already in this browser; portfolio and chatbot
            update only if you include them. Then the app reloads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            key={importInputKey}
            type="file"
            accept=".json,application/json"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            disabled={!!isLoading}
          />
          {importPreview && "error" in importPreview ? (
            <p className="text-sm text-destructive">{importPreview.error}</p>
          ) : null}
          {importPreview && "data" in importPreview ? (
            <div className="space-y-3 rounded-md border p-4">
              <p className="text-sm text-muted-foreground">
                This file includes:{" "}
                {keysPresentInImport(importPreview.data)
                  .map((k) => SECTION_LABELS[k])
                  .join(", ") || "—"}
              </p>
              <p className="text-sm font-medium">Apply to browser:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {DATA_SECTION_KEYS.map((key) => {
                  const inFile =
                    key === "portfolio_showcase"
                      ? importPreview.data.portfolioShowcase !== undefined
                      : key === "chatbot_knowledge"
                        ? importPreview.data.chatbotInFile !== "absent"
                        : Boolean(importPreview.data.tabularPatches[key]);
                  return (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`import-${key}`}
                        checked={importSelection[key]}
                        onCheckedChange={(v) => setImportKey(key, v === true)}
                        disabled={!!isLoading || !inFile}
                      />
                      <Label
                        htmlFor={`import-${key}`}
                        className={`text-sm font-normal leading-none ${inFile ? "cursor-pointer" : "text-muted-foreground cursor-not-allowed"}`}
                      >
                        {SECTION_LABELS[key]}
                        {!inFile ? " (not in file)" : ""}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={!importReady || !!isLoading}
              >
                {isLoading === "import" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Import selected
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apply import and reload?</AlertDialogTitle>
                <AlertDialogDescription>
                  Selected sections will be written to this browser&apos;s
                  localStorage and the page will reload. Bundled files in the repo
                  are not modified.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void handleImport()}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Yes, import and reload
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Reset All Data</CardTitle>
          <CardDescription>
            <span className="font-bold text-destructive">Warning:</span> Clears
            all localStorage overrides for this site (tabular bundle, portfolio,
            chatbot). After reload, the app uses bundled JSON from the build again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={!!isLoading}>
                {isLoading === "reset" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Reset All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear local overrides?</AlertDialogTitle>
                <AlertDialogDescription>
                  Removes imported or edited browser-only data and reloads. Your
                  repository files are unchanged.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Yes, reset and reload
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageData;
