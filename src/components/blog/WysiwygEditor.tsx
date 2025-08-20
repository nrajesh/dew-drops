"use client";

import React, { Suspense, useState } from 'react';
import 'react-quill/dist/quill.snow.css';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Link, Image, Code, Undo, Redo } from 'lucide-react';

// Dynamically import ReactQuill as it's a client-side only library
const ReactQuill = React.lazy(() => import('react-quill'));

interface WysiwygEditorProps {
  value: string; // Expects HTML
  onChange: (value: string) => void; // Returns HTML
}

const WysiwygEditor = ({ value, onChange }: WysiwygEditorProps) => {
  const [quillRef, setQuillRef] = useState<any>(null);

  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
        ['link', 'image'],
        ['code-block'],
        ['clean']
      ],
      handlers: {
        'bold': () => quillRef?.format('bold', 'toggle'),
        'italic': () => quillRef?.format('italic', 'toggle'),
        'underline': () => quillRef?.format('underline', 'toggle'),
        'strike': () => quillRef?.format('strike', 'toggle'),
        'list': (value: string) => quillRef?.format('list', value),
        'bullet': () => quillRef?.format('bullet', 'toggle'),
        'ordered': () => quillRef?.format('ordered', 'toggle'),
        'link': () => {
          const url = prompt('Enter the URL:');
          if (url) quillRef?.format('link', url);
        },
        'image': () => {
          const url = prompt('Enter the image URL:');
          if (url) quillRef?.format('image', url);
        },
        'code-block': () => quillRef?.format('code-block', 'toggle'),
        'clean': () => quillRef?.removeFormat(),
      }
    },
    clipboard: {
      matchVisual: false,
    },
    history: {
      delay: 2000,
      maxStack: 500,
      userOnly: true
    }
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image',
    'code-block'
  ];

  // Prevent rendering on the server
  const isSSR = typeof window === 'undefined';

  const handleButtonClick = (format: string, value?: string) => {
    if (quillRef) {
      if (format === 'link' || format === 'image') {
        const url = prompt(`Enter the ${format} URL:`);
        if (url) quillRef.format(format, url);
      } else {
        quillRef.format(format, value || 'toggle');
      }
    }
  };

  return (
    <Suspense fallback={<Skeleton className="w-full h-full rounded-md" />}>
      {!isSSR && (
        <>
          <div className="flex flex-wrap gap-1 mb-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleButtonClick('bold')}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleButtonClick('italic')}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleButtonClick('list', 'bullet')}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleButtonClick('list', 'ordered')}
              title="Ordered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleButtonClick('link')}
              title="Insert Link"
            >
              <Link className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleButtonClick('image')}
              title="Insert Image"
            >
              <Image className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleButtonClick('code-block')}
              title="Code Block"
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => quillRef?.history.undo()}
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => quillRef?.history.redo()}
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
          <ReactQuill
            theme="snow"
            value={value}
            onChange={onChange}
            modules={modules}
            formats={formats}
            className="h-full flex flex-col"
            ref={(el) => {
              if (el) {
                setQuillRef(el.getEditor());
              }
            }}
          />
        </>
      )}
    </Suspense>
  );
};

export default WysiwygEditor;