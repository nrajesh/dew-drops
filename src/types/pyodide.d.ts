// This file provides type declarations for Pyodide
declare module 'pyodide' {
  interface PyodideInterface {
    runPython(code: string): void;
    globals: {
      get(name: string): any;
    };
    loadPackage(packages: string | string[]): Promise<void>;
  }

  function loadPyodide(options?: { indexURL?: string }): Promise<PyodideInterface>;

  export = loadPyodide;
}