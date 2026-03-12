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

  const systemPrompt = `You are an expert career consultant and recruiting analyst with 20+ years of experience in technical talent acquisition. Your task is to perform a highly nuanced profile alignment assessment for ${base64Image ? "a job description image" : "job description text"}.

Your output MUST be a single JSON object (no preamble):
{
  "percentage": number (0-100),
  "highlights": "Markdown bullets (max 5 items, e.g., '- Requirement')",
  "reasoning": "Markdown with '## Matching Areas' and '## Gaps' sections"
}

SCORING CRITERIA:
- Calculate the percentage based on the technical skills (Overlaps vs Missing), seniority requirements, and core responsibilities.
- 85-100%: Strong match; fits all core requirements and has most preferred skills.
- 60-84%: Good match; has required core skills but misses some preferred ones.
- <60%: Partial match or mismatch.

CONSTRAINTS:
- No conversational filler. Just the JSON.
- 'reasoning' MUST contain both '## Matching Areas' and '## Gaps' headers.
- Bullet points must be concise but insightful.
- Every gap in '## Gaps' MUST have a '- **Mitigation:**' bullet immediately below it.

Context:
- Candidate Summary: ${chatbotKnowledge}
- Verified Skills Overlap: ${overlaps.join(", ")}
- Identified Skill Gaps: ${missing.join(", ")}
- Full Professional Profile: ${combinedCvText.slice(0, 12000)}
${!base64Image ? `\nFull JD Text: ${jobDescription.slice(0, 8000)}` : ""}

Generate the expert assessment now.`;

  let rawResponse: string;
  try {
    if (base64Image && sendMessageToGeminiWithImage) {
      rawResponse = await sendMessageToGeminiWithImage(systemPrompt, base64Image);
    } else {
      rawResponse = await sendMessageToGemini(systemPrompt);
    }
  } catch (apiError) {
    console.error("Gemini API call failed:", apiError);
    throw new Error("Failed to connect to the AI service. Please check your connection and try again.");
  }

  // Robustly extract JSON from the response
  const extractJson = (text: string) => {
    // Try to find content between triple backticks first
    const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (match) return match[1].trim();
    
    // Fallback: Find the first { and last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return text.substring(firstBrace, lastBrace + 1).trim();
    }
    return text.trim();
  };

  const jsonString = extractJson(rawResponse);

  try {
    const result: {
      percentage: number;
      reasoning: string;
      highlights?: string;
    } = JSON.parse(jsonString);

    if (typeof result.percentage !== "number" || typeof result.reasoning !== "string") {
      throw new Error("Missing required fields (percentage/reasoning).");
    }

    return {
      percentage: Math.min(100, Math.max(0, result.percentage)),
      reasoning: result.reasoning.replace(/\n{3,}/g, "\n\n").trim(),
      highlights: (result.highlights ?? "").replace(/\n{3,}/g, "\n\n").trim(),
    };
  } catch (parseError) {
    console.error("AI Response Parsing Failure:", parseError, "\nRaw Response:", rawResponse);
    throw new Error("The AI returned a malformed response. This usually happens if the job description is extremely long. Please try again with a more focused selection.");
  }
};

