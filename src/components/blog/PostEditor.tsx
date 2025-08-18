import { BlockNoteView, useBlockNote } from "@blocknote/react";
import { BlockNoteEditor } from "@blocknote/core";
import { useEffect } from "react";
import { useTheme } from "next-themes";

interface PostEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  editable?: boolean;
}

export const PostEditor = ({ initialContent, onChange, editable = true }: PostEditorProps) => {
  const { theme } = useTheme();

  const editor: BlockNoteEditor | null = useBlockNote({
    editable,
    onEditorContentChange: async (editor) => {
      const markdown = await editor.blocksToMarkdown();
      onChange(markdown);
    },
  });

  useEffect(() => {
    const setupContent = async () => {
      if (editor) {
        const blocks = await editor.markdownToBlocks(initialContent);
        editor.replaceBlocks(editor.topLevelBlocks, blocks);
      }
    };
    setupContent();
  }, [initialContent, editor]);

  if (!editor) {
    return <div>Loading Editor...</div>;
  }

  return <BlockNoteView editor={editor} theme={theme === "dark" ? "dark" : "light"} />;
};