import { saveAs } from "file-saver";

/**
 * Downloads a text file.
 * On modern browsers (Chrome/Edge), it uses the File System Access API
 * to force a "Save As" dialog with the requested filename.
 * Otherwise, it falls back to the robust file-saver approach.
 */
export const downloadTextFile = async (content: string, filename: string) => {
  // Try to use the modern File System Access API for a explicit "Save As" dialog
  if ("showSaveFilePicker" in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: "Text file",
            accept: { "text/plain": [".txt"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // User cancelled the dialog, just exit

      if (err.name === "AbortError") return;

      console.warn(
        "showSaveFilePicker failed or cancelled, falling back to file-saver:",
        err,
      );
    }
  }

  // Fallback for browsers without File System Access API or if it failed
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  saveAs(blob, filename);
};
