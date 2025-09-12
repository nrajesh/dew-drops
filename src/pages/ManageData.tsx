import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Download, Upload, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Input } from "@/components/ui/input";

const ManageData = () => {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleExport = async () => {
    setIsLoading("export");
    try {
      const { data, error } = await supabase.functions.invoke("export-data");
      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `portfolio-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showSuccess("Data exported successfully.");
    } catch (err: any) {
      showError(`Export failed: ${err.message}`);
    } finally {
      setIsLoading(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      showError("Please select a file to import.");
      return;
    }
    setIsLoading("import");
    try {
      const fileContent = await importFile.text();
      const jsonData = JSON.parse(fileContent);

      const { error } = await supabase.functions.invoke("import-data", {
        body: jsonData,
      });
      if (error) throw error;

      showSuccess("Data imported successfully. The page will now reload.");
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      showError(`Import failed: ${err.message}`);
    } finally {
      setIsLoading(null);
      setImportFile(null);
    }
  };

  const handleReset = async () => {
    setIsLoading("reset");
    try {
      const { error } = await supabase.functions.invoke("reset-data");
      if (error) throw error;
      showSuccess("All data has been reset. The page will now reload.");
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      showError(`Reset failed: ${err.message}`);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Manage Data</h2>
      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>Download all your portfolio data as a single JSON file. This includes blog posts, gallery images, and travel locations.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={!!isLoading}>
            {isLoading === 'export' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export All Data
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Import Data</CardTitle>
          <CardDescription>
            <span className="font-bold text-destructive">Warning:</span> This will permanently delete all existing data and replace it with the data from your backup file. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="file" accept=".json" onChange={(e) => setImportFile(e.target.files?.[0] || null)} disabled={!!isLoading} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={!importFile || !!isLoading}>
                {isLoading === 'import' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Import Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all current posts, gallery images, and travel locations, replacing them with the content from the selected file. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleImport} className="bg-destructive hover:bg-destructive/90">
                  Yes, delete and import
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
            <span className="font-bold text-destructive">Warning:</span> This will permanently delete all your blog posts, gallery images, and travel locations. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={!!isLoading}>
                {isLoading === 'reset' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Reset All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all posts, gallery images, and travel locations. This action cannot be undone and your data will be lost forever.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset} className="bg-destructive hover:bg-destructive/90">
                  Yes, delete everything
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