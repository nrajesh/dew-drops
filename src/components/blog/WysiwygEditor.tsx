import { useEffect, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';

interface WysiwygEditorProps {
  value: string;
  onChange: (content: string) => void;
}

const WysiwygEditor = ({ value, onChange }: WysiwygEditorProps) => {
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setContent(value);
    }
  }, [value]);

  return (
    <Editor
      apiKey="your-tinymce-api-key"
      onInit={(evt, editor) => editorRef.current = editor}
      initialValue={value}
      init={{
        height: '100%',
        menubar: false,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | blocks | ' +
          'bold italic forecolor | alignleft aligncenter ' +
          'alignright alignjustify | bullist numlist outdent indent | ' +
          'removeformat | help',
        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
        skin: 'oxide-dark',
        content_css: 'dark',
      }}
      onEditorChange={(content) => onChange(content)}
    />
  );
};

export default WysiwygEditor;