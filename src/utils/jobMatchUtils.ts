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

  const systemPrompt = `You are a career fit analyst. Profile alignment assessment for ${base64Image ? "the attached image" : "the provided text"}.
Tone: first-person passive (my/I).

Your final output MUST be a single, valid JSON object. No Markdown headers before or after.
{
  "percentage": number,
  "highlights": "Markdown listing 5 critical job requirements as short bullets (e.g., '- Requirement')",
  "reasoning": "Markdown with ONLY '## Matching Areas' and '## Gaps' sections"
}

RULES:
- 'reasoning' MUST contain both headers: '## Matching Areas' and '## Gaps'.
- Each bullet MUST be a single sentence (≤ 20 words).
- Lead with **Bold Title:**
- '## Gaps' section is REQUIRED. If you find no major gaps, focus on a "Niche Industry specific experience" or "Advanced certifications" that I might not have yet. Each gap MUST have a '- **Mitigation:**' bullet point underneath.
- Strictly generate 2 fewer gaps than matching areas.

Context:
- Summary: ${chatbotKnowledge}
- Overlaps: ${overlaps.join(", ")}
- Missing (Gaps): ${missing.join(", ")}
- CV Context: ${combinedCvText}
${!base64Image ? `\nJob Text: ${jobDescription}` : ""}

Analyze the ${base64Image ? "image" : "text"} and generate the JSON object now.`;

  let rawResponse: string;
  if (base64Image && sendMessageToGeminiWithImage) {
    rawResponse = await sendMessageToGeminiWithImage(systemPrompt, base64Image);
  } else {
    rawResponse = await sendMessageToGemini(systemPrompt);
  }

  const jsonString = rawResponse
    .replace(/```json\n([\s\S]*?)\n```/, "$1")
    .trim();

  try {
    const result: {
      percentage: number;
      reasoning: string;
      highlights?: string;
    } = JSON.parse(jsonString);

    if (typeof result.percentage !== "number" || typeof result.reasoning !== "string") {
      throw new Error("AI response format invalid.");
    }

    return {
      percentage: result.percentage,
      reasoning: result.reasoning.replace(/\n{3,}/g, "\n\n").trim(),
      highlights: (result.highlights ?? "").replace(/\n{3,}/g, "\n\n").trim(),
    };
  } catch (e) {
    console.error("AI Parse Error:", e, rawResponse);
    throw new Error("The AI returned an invalid response. Please try again.");
  }
};

