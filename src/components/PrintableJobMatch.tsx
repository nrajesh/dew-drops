import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Printer } from 'lucide-react'; // Import Printer icon

interface PrintableJobMatchProps {
  jobDescription: string;
  matchReasoning: string;
}

export const PrintableJobMatch: React.FC<PrintableJobMatchProps> = ({ jobDescription, matchReasoning }) => {
  return (
    <div className="print-only hidden"> {/* This div will only be visible when printing */}
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Printer className="h-6 w-6" /> Career Fit Analysis Report
      </h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Job Description</h2>
        <div className="prose dark:prose-invert max-w-none p-4 border rounded-lg bg-muted">
          <p>{jobDescription}</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Analysis Result</h2>
        <div className="prose dark:prose-invert max-w-none career-fit-output">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {matchReasoning}
          </ReactMarkdown>
        </div>
      </section>
    </div>
  );
};