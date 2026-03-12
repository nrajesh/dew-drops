import { extractJobKeywords } from "@/integrations/gemini/client";
import type {
  JsonResume,
  ResumeWork,
  ResumeEducation,
  ResumeSkill,
  ResumeLanguage,
  ResumeAward,
  ResumePublication,
  ResumeReference,
} from "@/types/resume";

// This function will be passed from the component where sendMessageToGemini is available
// This function will be passed from the component where sendMessageToGemini is available
type SendMessageToGeminiFunction = (message: string) => Promise<string>;
type SendMessageToGeminiWithImageFunction = (prompt: string, image: string) => Promise<string>;

export const generateJobMatchReasoning = async (
  jobDescription: string,
  chatbotKnowledge: string | null,
  resume: JsonResume,
  sendMessageToGemini: SendMessageToGeminiFunction,
  onStepUpdate: (stepIndex: number) => void,
  base64Image?: string,
  sendMessageToGeminiWithImage?: SendMessageToGeminiWithImageFunction,
): Promise<{ percentage: number; reasoning: string; highlights: string }> => {
  // Step 1: Extract job requirements
  onStepUpdate(0); 
  
  let jobRequirements: string[] = [];
  if (base64Image && sendMessageToGeminiWithImage) {
    // For vision, we need to be very explicit about what to extract
    const keywordPrompt = `Identify and extract 8-12 key technical skills, experience requirements, and core responsibilities from this job description image. Return them as a simple comma-separated list. Only return the list, no other text.`;
    const keywordResponse = await sendMessageToGeminiWithImage(keywordPrompt, base64Image);
    jobRequirements = keywordResponse
      .split(",")
      .map(s => s.trim().replace(/^-\s*/, "")) // Clean bullet points if any
      .filter(s => s.length > 2); // Filter out noise
  } else {
    jobRequirements = await extractJobKeywords(jobDescription);
  }

  onStepUpdate(1); // Step 2: Text Preprocessing
  // ... (Prepare CV content - unchanged) ...
  const allCvContent: string[] = [];
  if (resume.basics?.summary) allCvContent.push(resume.basics.summary);
  resume.work?.forEach((w: ResumeWork) =>
    allCvContent.push(
      `${w.position} at ${w.company} ${w.summary} ${w.highlights?.join(" ")} ${w.industry || ""}`,
    ),
  );
  resume.education?.forEach((e: ResumeEducation) =>
    allCvContent.push(
      `${e.studyType} in ${e.area} from ${e.institution} ${e.courses?.join(" ")}`,
    ),
  );
  resume.skills?.forEach((s: ResumeSkill) =>
    allCvContent.push(`${s.name} ${s.level} ${s.keywords?.join(" ")}`),
  );
  resume.languages?.forEach((l: ResumeLanguage) =>
    allCvContent.push(`${l.language} ${l.fluency}`),
  );
  resume.publications?.forEach((p: ResumePublication) =>
    allCvContent.push(`${p.name} ${p.summary} ${p.publisher}`),
  );
  resume.awards?.forEach((a: ResumeAward) =>
    allCvContent.push(`${a.title} ${a.awarder} ${a.summary}`),
  );
  resume.references?.forEach((r: ResumeReference) =>
    allCvContent.push(`${r.name} ${r.reference}`),
  );
  const combinedCvText = allCvContent.join(" ");

  onStepUpdate(2); // Step 3: Skill & Experience Mapping
  const allCvSkills: string[] = [];
  resume.skills?.forEach((s) => {
    allCvSkills.push(s.name);
    s.keywords?.forEach((k) => allCvSkills.push(k));
  });
  resume.work?.forEach((w) =>
    w.highlights?.forEach((h) => allCvSkills.push(h)),
  );
  resume.languages?.forEach((l) => allCvSkills.push(l.language));
  resume.publications?.forEach((p) => allCvSkills.push(p.name, p.publisher));
  resume.awards?.forEach((a) => allCvSkills.push(a.title, a.awarder));

  const jobReqSet: Set<string> = new Set(
    jobRequirements.map((s) => s.toLowerCase()),
  );
  const cvSkillsSet: Set<string> = new Set(
    allCvSkills.map((s) => s.toLowerCase()),
  );

  const overlaps = Array.from(jobReqSet).filter((req: string) =>
    cvSkillsSet.has(req),
  );
  const missing = Array.from(jobReqSet).filter(
    (req: string) => !cvSkillsSet.has(req),
  );

  onStepUpdate(3); // Step 4: Gap Identification
  onStepUpdate(4); // Step 5: Generating Report

  const systemPrompt = `You are an expert technical recruiter. Perform a profile alignment assessment for ${base64Image ? "a job description image" : "job description text"}.

CRITICAL: Your response MUST be a single JSON object.
JSON SAFETY RULES:
- Use standard double quotes (") for all strings.
- NEVER use triple quotes (""") even for long text blocks.
- Escape all newlines as \\n and double quotes as \\" within strings.
- Do NOT include any markdown headers or preamble.

REQUIRED JSON TEMPLATE:
{
  "percentage": 85,
  "highlights": "- Bullet 1\\n- Bullet 2",
  "reasoning": "## Matching Areas\\n- Insight 1\\n- Insight 2\\n\\n## Gaps\\n- Gap 1\\n  - **Mitigation:** Plan 1"
}

SCORING: 
- 85-100%: Strong core match.
- 60-84%: Good match, some secondary gaps.
- <60%: Significant skill/experience mismatch.

Context:
- Summary: ${chatbotKnowledge}
- Overlaps: ${overlaps.join(", ")}
- Gaps: ${missing.join(", ")}
- Profile: ${combinedCvText.slice(0, 12000)}
${!base64Image ? `\nJD: ${jobDescription.slice(0, 6000)}` : ""}

Generate the expert JSON assessment now.`;

  let rawResponse: string;
  try {
    if (base64Image && sendMessageToGeminiWithImage) {
      rawResponse = await sendMessageToGeminiWithImage(systemPrompt, base64Image);
    } else {
      rawResponse = await sendMessageToGemini(systemPrompt);
    }
  } catch (apiError) {
    console.error("Gemini API call failed:", apiError);
    throw new Error("Failed to connect to the AI service. Please try again.");
  }

  const extractAndRepairJson = (text: string) => {
    // 1. Clean up invalid Python-style triple quotes which AI often hallucinations for long text
    let cleaned = text.replace(/"""/g, '"');
    
    // 2. Extract block between first { and last }
    const firstBrace = cleaned.indexOf('{');
    let lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace === -1) return cleaned.trim();
    
    // 3. Handle Truncation: If we have { but no }, or if text ends abruptly
    if (lastBrace === -1 || lastBrace < firstBrace) {
      console.warn("Detected truncated JSON response. Attempting repair...");
      cleaned = cleaned.substring(firstBrace) + '\n  "reasoning": "## Matching Areas\\n- [Truncated by AI]\\n\\n## Gaps\\n- [Truncated by AI]\\n  - **Mitigation:** Please try with a shorter JD snippet."\n}';
      return cleaned;
    }

    // 4. Extract content between braces (handles markdown wrappers implicitly)
    return cleaned.substring(firstBrace, lastBrace + 1).trim();
  };

  const jsonString = extractAndRepairJson(rawResponse);

  try {
    const result: {
      percentage: number;
      reasoning: string;
      highlights?: string;
    } = JSON.parse(jsonString);

    if (typeof result.percentage !== "number" || typeof result.reasoning !== "string") {
      throw new Error("Invalid structure.");
    }

    return {
      percentage: Math.min(100, Math.max(0, result.percentage)),
      reasoning: result.reasoning.replace(/\n{3,}/g, "\n\n").trim(),
      highlights: (result.highlights ?? "").replace(/\n{3,}/g, "\n\n").trim(),
    };
  } catch (parseError) {
    console.error("Final JSON Parse Failure:", parseError, "\nProcessed String:", jsonString, "\nRaw:", rawResponse);
    throw new Error("The AI returned a malformed response. This happens with very long or complex job descriptions. Please try selecting a more focused part of the JD.");
  }
};

