// This file provides minimal type declarations for Deno-specific modules and globals
// used in Supabase Edge Functions, allowing TypeScript to compile them
// within a non-Deno (e.g., Node.js/Vite) project.

// Declare global Deno namespace (for Deno.env)
declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
  }
  const env: Env;
}

// Declare modules imported from Deno.land/std
declare module "https://deno.land/std@0.190.0/http/server.ts" {
  // Assuming 'Request' and 'Response' are globally available from 'DOM' lib
  export function serve(
    handler: (req: Request) => Promise<Response> | Response,
  ): Promise<void>;
}

// Declare modules imported from esm.sh
declare module "https://esm.sh/@supabase/supabase-js@2.45.0" {
  // Use 'unknown' for simplicity to resolve the module not found error.
  // If more specific types are needed, ensure '@supabase/supabase-js' is installed
  // as a dev dependency and its types are available in node_modules.
  export const createClient: unknown;
}

// Specific declaration for @google/generative-ai to ensure named export is recognized
declare module "npm:@google/generative-ai" {
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(params: { model: string }): unknown; // Simplified for type declaration
  }
}

// Generic declaration for other 'npm:' specifiers
declare module "npm:*" {
  const content: unknown;
  export default content;
}
