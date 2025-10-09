import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { JsonResume, ResumeWork, ResumeEducation, ResumeSkill, ResumeAward, ResumeLanguage, ResumeInterest, ResumePublication, ResumeReference } from '@/types/resume';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeFileName(fileName: string): string {
  let decodedName = fileName;
  try {
    // Attempt to decode, as filenames from some sources might be URI encoded.
    decodedName = decodeURIComponent(fileName);
  } catch (e) {
    // Ignore error if the filename is not a valid URI component.
  }

  // Normalize to NFD (Normalization Form Canonical Decomposition).
  // This separates base characters from their diacritical marks (e.g., "é" becomes "e" + "´").
  const normalized = decodedName.normalize('NFD');

  // Remove the diacritical marks.
  const withoutDiacritics = normalized.replace(/[\u0300-\u036f]/g, '');

  // Replace whitespace with a single underscore.
  const withUnderscores = withoutDiacritics.replace(/\s+/g, '_');

  // Remove any character that is not a letter, number, underscore, dot, or hyphen.
  // This is a very safe character set for filenames.
  const sanitized = withUnderscores.replace(/[^a-zA-Z0-9_.-]/g, '');

  // Remove leading/trailing underscores or dots.
  const finalName = sanitized.replace(/^[_.]+|[_.]+$/g, '');

  // Ensure the filename is not empty after sanitization.
  return finalName || "sanitized_file";
}

export function generateAltTextFromFileName(fileName: string): string {
  if (!fileName) return "";
  
  // Get the part of the filename after the last '/'
  const namePart = fileName.split('/').pop() || fileName;
  
  // Find the first underscore (which separates the timestamp from the original name)
  const firstUnderscoreIndex = namePart.indexOf('_');
  
  // If an underscore is found, take the substring after it. Otherwise, use the whole name part.
  const originalFileName = firstUnderscoreIndex !== -1 
    ? namePart.substring(firstUnderscoreIndex + 1) 
    : namePart;
    
  // Remove the file extension and replace underscores with spaces.
  return originalFileName.replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
}

/**
 * Helper function to limit gaps in markdown output for display
 * to a maximum of 3 bullet points in the 'Gaps' section.
 */
export const limitGapsInMarkdown = (markdown: string): string => {
  const lines = markdown.split('\n');
  let inGapsSection = false;
  let gapCount = 0;
  const newLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## Gaps')) {
      inGapsSection = true;
      newLines.push(line);
      continue;
    }

    if (inGapsSection) {
      // If it's a bullet point for a gap
      if (line.trim().startsWith('- ') || line.trim().startsWith('+ ')) {
        if (gapCount < 3) { // This is the limit
          newLines.push(line);
          gapCount++;
        }
      } else if (line.trim().length > 0 && !line.trim().startsWith('##')) {
        // Keep non-bullet point text within the gaps section (like 'No significant gaps identified.')
        // but only if it's not another heading
        newLines.push(line);
      } else if (line.trim().startsWith('##')) {
        // If a new heading starts, we're out of the gaps section
        inGapsSection = false;
        newLines.push(line);
      } else {
        // Keep empty lines or other non-bullet, non-heading content
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  }
  return newLines.join('\n');
};

/**
 * Helper function to convert markdown to plain text for download,
 * removing markdown formatting like headings, bold, and italics.
 */
export const markdownToPlainText = (markdown: string): string => {
  let plainText = markdown;
  // Remove headings (e.g., ## Matching Areas)
  plainText = plainText.replace(/^#+\s/gm, '');
  // Remove bold/italic markers
  plainText = plainText.replace(/\*\*([^*]+?)\*\*/g, '$1'); // **bold** -> bold
  plainText = plainText.replace(/\*([^*]+?)\*/g, '$1');   // *italic* -> italic
  plainText = plainText.replace(/_([^_]+?)_/g, '$1');     // _italic_ -> italic
  return plainText;
};

export const formatResumeJsonToHtml = (resumeData: JsonResume): string => {
  const { basics, work, education, skills, awards, languages, interests, publications, references } = resumeData;

  let html = `
    <div style="font-family: 'Arial', sans-serif; padding: 20px; color: #333; font-size: 12px; line-height: 1.4;">
      <h1 style="font-size: 24px; margin-bottom: 5px; color: #222;">${basics.name}</h1>
      <p style="font-size: 16px; color: #666; margin-bottom: 15px;">${basics.label}</p>
      <div style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
        ${basics.email ? `<p style="margin: 0; line-height: 1.2;">Email: <a href="mailto:${basics.email}" style="color: #007bff; text-decoration: none;">${basics.email}</a></p>` : ''}
        ${basics.phone ? `<p style="margin: 0; line-height: 1.2;">Phone: ${basics.phone}</p>` : ''}
        ${basics.url ? `<p style="margin: 0; line-height: 1.2;">Website: <a href="${basics.url}" style="color: #007bff; text-decoration: none;">${basics.url}</a></p>` : ''}
        ${basics.location?.city ? `<p style="margin: 0; line-height: 1.2;">Location: ${basics.location.city}, ${basics.location.countryCode}</p>` : ''}
      </div>
  `;

  if (basics.summary) {
    html += `<h2 style="font-size: 18px; margin-top: 20px; margin-bottom: 10px; color: #222;">Summary</h2><p style="margin-bottom: 15px;">${basics.summary}</p>`;
  }

  if (work && work.length > 0) {
    html += `<h2 style="font-size: 18px; margin-top: 20px; margin-bottom: 10px; color: #222;">Work Experience</h2>`;
    work.forEach((job: ResumeWork) => {
      html += `
        <div style="margin-bottom: 15px; page-break-inside: avoid;">
          <h3 style="font-size: 14px; margin-bottom: 5px; color: #333;">${job.position} at ${job.company} (${job.location})</h3>
          <p style="font-size: 11px; color: #666; margin-bottom: 5px;">${job.startDate} – ${job.endDate || 'Present'}</p>
          ${job.summary ? `<p style="margin-bottom: 5px;">${job.summary}</p>` : ''}
          ${job.highlights && job.highlights.length > 0 ? `
            <ul style="list-style-type: disc; margin-left: 20px; padding: 0;">
              ${job.highlights.map(h => `<li>${h}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `;
    });
  }

  if (education && education.length > 0) {
    html += `<h2 style="font-size: 18px; margin-top: 20px; margin-bottom: 10px; color: #222;">Education</h2>`;
    education.forEach((edu: ResumeEducation) => {
      html += `
        <div style="margin-bottom: 15px; page-break-inside: avoid;">
          <h3 style="font-size: 14px; margin-bottom: 5px; color: #333;">${edu.institution}</h3>
          <p style="font-size: 12px; color: #666; margin-bottom: 5px;">${edu.studyType} in ${edu.area}</p>
          <p style="font-size: 11px; color: #666; margin-bottom: 5px;">${edu.startDate} – ${edu.endDate || 'Present'}</p>
          ${edu.gpa ? `<p style="margin-bottom: 5px;">GPA: ${edu.gpa}</p>` : ''}
        </div>
      `;
    });
  }

  if (skills && skills.length > 0) {
    html += `<h2 style="font-size: 18px; margin-top: 20px; margin-bottom: 10px; color: #222;">Skills</h2><p style="margin-bottom: 15px;">`;
    html += skills.map((skill: ResumeSkill) => `${skill.name} ${skill.level ? `(${skill.level})` : ''}`).join(', ');
    html += `</p>`;
  }

  if (awards && awards.length > 0) {
    html += `<h2 style="font-size: 18px; margin-top: 20px; margin-bottom: 10px; color: #222;">Awards</h2>`;
    awards.forEach((award: ResumeAward) => {
      html += `
        <div style="margin-bottom: 15px; page-break-inside: avoid;">
          <h3 style="font-size: 14px; margin-bottom: 5px; color: #333;">${award.title}</h3>
          <p style="font-size: 12px; color: #666; margin-bottom: 5px;">${award.awarder} - ${award.date}</p>
          ${award.summary ? `<p style="margin-bottom: 5px;">${award.summary}</p>` : ''}
        </div>
      `;
    });
  }

  if (languages && languages.length > 0) {
    html += `<h2 style="font-size: 18px; margin-top: 20px; margin-bottom: 10px; color: #222;">Languages</h2><p style="margin-bottom: 15px;">`;
    html += languages.map((lang: ResumeLanguage) => `${lang.language} (${lang.fluency})`).join(', ');
    html += `</p>`;
  }

  if (interests && interests.length > 0) {
    html += `<h2 style="font-size: 18px; margin-top: 20px; margin-bottom: 10px; color: #222;">Interests</h2><p style="margin-bottom: 15px;">`;
    html += interests.map((interest: ResumeInterest) => `${interest.name} ${interest.keywords && interest.keywords.length > 0 ? `(${interest.keywords.join(', ')})` : ''}`).join(', ');
    html += `</p>`;
  }

  if (publications && publications.length > 0) {
    html += `<h2 style="font-size: 18px; margin-top: 20px; margin-bottom: 10px; color: #222;">Publications</h2>`;
    publications.forEach((pub: ResumePublication) => {
      html += `
        <div style="margin-bottom: 15px; page-break-inside: avoid;">
          <h3 style="font-size: 14px; margin-bottom: 5px; color: #333;">
            ${pub.url ? `<a href="${pub.url}" style="color: #007bff; text-decoration: none;">${pub.name}</a>` : pub.name}
          </h3>
          <p style="font-size: 12px; color: #666; margin-bottom: 5px;">${pub.publisher} - ${pub.releaseDate}</p>
          ${pub.summary ? `<p style="margin-bottom: 5px;">${pub.summary}</p>` : ''}
        </div>
      `;
    });
  }

  if (references && references.length > 0) {
    html += `<h2 style="font-size: 18px; margin-top: 20px; margin-bottom: 10px; color: #222;">References</h2>`;
    references.forEach((ref: ResumeReference) => {
      html += `
        <div style="margin-bottom: 15px; page-break-inside: avoid;">
          <h3 style="font-size: 14px; margin-bottom: 5px; color: #333;">${ref.name}</h3>
          <p style="font-size: 12px; color: #666; margin-bottom: 5px;">${ref.reference}</p>
        </div>
      `;
    });
  }

  html += `</div>`;
  return html;
};