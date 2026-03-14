import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const VERCEL_JSON_PATH = path.join(ROOT_DIR, 'vercel.json');

// Helper to recursively find all files in a directory
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

// Find all unique HTTPS domains used in the codebase
function findUsedDomains(files) {
  const domains = new Set();
  const urlRegex = /https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf-8');
    let match;
    while ((match = urlRegex.exec(content)) !== null) {
      try {
        const urlObj = new URL(match[0]);
        domains.add(urlObj.origin);
      } catch (e) {
         // ignore invalid URLs inline
      }
    }
  });

  return Array.from(domains);
}

// Get allowed domains from vercel.json
function getCspDomains() {
  const vercelConf = JSON.parse(fs.readFileSync(VERCEL_JSON_PATH, 'utf-8'));
  
  let cspString = '';
  // Traverse vercel.json to find CSP header
  if (vercelConf.headers) {
    vercelConf.headers.forEach((h) => {
      if (h.headers) {
        h.headers.forEach((headerObj) => {
          if (headerObj.key === 'Content-Security-Policy') {
            cspString = headerObj.value;
          }
        });
      }
    });
  }

  const allowedDomains = new Set();
  const directives = cspString.split(';');
  
  directives.forEach(directive => {
    const parts = directive.trim().split(/\s+/);
    // Ignore the directive name (e.g. 'connect-src', 'img-src')
    parts.slice(1).forEach(part => {
      if (part.startsWith('http')) {
        // Strip out wildcards for simplicity of checking if the root domain is permitted
        allowedDomains.add(part.replace('*.', ''));
      }
    });
  });

  return Array.from(allowedDomains);
}

const run = () => {
  console.log('🔍 Validating Content-Security-Policy...');
  const files = getAllFiles(SRC_DIR);
  const usedDomains = findUsedDomains(files);
  const allowedCspDomains = getCspDomains();

  let hasErrors = false;

  // 1. Check if used domains are missing from CSP
  usedDomains.forEach(domain => {
    // We do a "relaxed" match because the CSP might allow a wildcard (*.google.com)
    // or the primary domain.
    const isAllowed = allowedCspDomains.some(allowed => 
      domain === allowed || 
      domain.endsWith(allowed.replace('https://', '')) ||
      (allowed.includes('*') && domain.includes(allowed.split('*')[1]))
    );
    
    // Ignore local development domains like localhost or typical non-API patterns if needed
    if (!isAllowed && domain !== 'https://localhost') {
      console.warn(`\n⚠️  WARNING: Found URL ${domain} in code which may not be covered by Content-Security-Policy!`);
      console.warn(`   Consider adding this to vercel.json & index.html to prevent "Refused to connect" errors.`);
      hasErrors = true;
    }
  });

  // 2. We can also optionally flag allowed URLs that aren't used anywhere,
  // but many CSP URLs are for third-party scripts/iframes loaded independently 
  // (like Youtube embeds, Vercel analytics), so we heavily filter this.
  
  if (hasErrors) {
     console.log('\n❌ CSP Validation Finished: Warnings were found. Please review the missing domains.');
  } else {
     console.log('✅ CSP Validation Finished: All hardcoded codebase endpoints appear to be covered by Vercel.json.');
  }
};

run();
