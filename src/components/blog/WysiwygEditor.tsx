"use client";

import React, { Suspense } from 'react';
import 'react-quill/dist/quill.snow.css';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import ReactQuill as it's a client-side only library
const ReactQuill = React.lazy(() => import('react-quill'));

interface WysiwygEditorProps {
  value: string; // Expects HTML
  onChange: (value: string) => void; // Returns HTML
}

const WysiwygEditor = ({ value, onChange }: WysiwygEditorProps) => {
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image'],
      ['clean']
    ],
  };

  // Prevent rendering on the server
  const isSSR = typeof window === 'undefined';

  return (
    <Suspense fallback={<Skeleton className="w-full h-full rounded-md" />}>
      {!isSSR && (
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          className="h-full flex flex-col"
        />
      )}
    </Suspense>
  );
};

export default WysiwygEditor;