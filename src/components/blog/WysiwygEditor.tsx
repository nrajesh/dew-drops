import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import TurndownService from 'turndown';

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    ['link', 'image', 'code-block'],
    ['clean']
  ],
};

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'indent',
  'link', 'image', 'code-block',
];

const turndownService = new TurndownService();

const WysiwygEditor: React.FC<WysiwygEditorProps> = ({ value, onChange }) => {
  const [editorContent, setEditorContent] = useState<string>('');

  // Convert Markdown to HTML for the editor
  useEffect(() => {
    if (value) {
      // Remove triple backticks if present
      const contentWithoutBackticks = value.replace(/^```\s*[\r\n]?/, '').replace(/\s*```\s*$/, '');
      const htmlContent = turndownService.turndown(contentWithoutBackticks);
      setEditorContent(htmlContent);
    } else {
      setEditorContent('');
    }
  }, [value]);

  const handleEditorChange = (content: string) => {
    // Convert HTML back to Markdown
    const markdownContent = turndownService.turndown(content);
    // Add triple backticks
    const wrappedContent = '```\n' + markdownContent + '\n```';
    onChange(wrappedContent);
  };

  return (
    <div className="w-full">
      <ReactQuill
        theme="snow"
        value={editorContent}
        onChange={handleEditorChange}
        modules={quillModules}
        formats={quillFormats}
        placeholder="Write your content here..."
        className="min-h-[200px] [&_.ql-container]:min-h-[150px]"
      />
    </div>
  );
};

export default WysiwygEditor;