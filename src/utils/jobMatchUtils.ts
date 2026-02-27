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
type SendMessageToGeminiFunction = (message: string) => Promise<string>;

export const generateJobMatchReasoning = async (
  jobDescription: string,
  chatbotKnowledge: string | null,
  resume: JsonResume,
  sendMessageToGemini: SendMessageToGeminiFunction,
  onStepUpdate: (stepIndex: number) => void, // New callback for step updates
): Promise<{ percentage: number; reasoning: string; highlights: string }> => {
  // Simplified return type
  onStepUpdate(0); // Step 1: Extracting Key Criteria
  // Step 1: Extract job requirements using Gemini
  const jobRequirements = await extractJobKeywords(jobDescription);

  onStepUpdate(1); // Step 2: Text Preprocessing
  // Step 2: Prepare CV sections for AI consumption
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
  // Step 3: Collect all skills from CV for direct comparison
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

  onStepUpdate(3); // Step 4: Gap Identification & Soft Skill Leverage
  // Step 4 is now just a placeholder for the final step.

  onStepUpdate(4); // Step 5: Generating Match Report & Percentage

  const systemPrompt = `You are a career fit analyst for my personal portfolio. Your task is to provide a professional assessment of how well my profile aligns with a given job description. The output must be in a first-person passive tone (using 'my' instead of 'Rajesh's' or 'the candidate').

Your final output must be a single, valid JSON object with three keys: "percentage", "highlights", and "reasoning".
- "percentage": A number between 0 and 100, representing the overall match.
- "highlights": A JSON-escaped markdown string with ONLY a '## Job Highlights' section listing the 5 most critical requirements from the job description as short bullet points (each ≤ 10 words, starting with '- '). These are key criteria a recruiter would scan for.
- "reasoning": A JSON-escaped markdown string containing ONLY the 'Matching Areas' and 'Gaps' sections. Do NOT include any other sections. Ensure all double quotes within the markdown are escaped with a backslash (\\\\") and all newlines are escaped as (\\\\n).

CRITICAL FORMATTING RULES FOR REASONING:
- Each bullet point MUST be a SINGLE sentence, maximum 20 words total.
- Lead with **Bold Title:** then one short sentence. No paragraphs. No follow-on clauses.
- Do NOT write "My profile demonstrates..." prose — be direct and specific.
- Bad example:  + **Leadership:** My profile demonstrates over 20 years of experience in IT services, aligning with the 15+ years requirement. This includes significant roles such as Program Lead and Project Portfolio Manager, showcasing my capability in end-to-end delivery ownership and leadership.
- Good example: + **Leadership:** 20+ years across Program Lead, Delivery Manager, and Portfolio Manager roles directly match the seniority requirement.

Here is the job description: ${jobDescription}
Here is a summary of my profile (CV and chatbot knowledge): ${chatbotKnowledge}
My detailed resume data (JSON): ${JSON.stringify(resume, null, 2)}
Identified overlapping skills/requirements: ${overlaps.join(", ")}
Identified missing skills/requirements: ${missing.join(", ")}
Combined CV text for broader context: ${combinedCvText}

For the "reasoning" markdown string, follow this structure strictly. Ensure each point starts with '+ ' or '- ' and is left-aligned.

## Matching Areas
+ **[Concise Title]:** [Single sentence ≤ 20 words with a specific data point]
+ **[Another Title]:** [Single sentence ≤ 20 words]
...

## Gaps
- **[Missing skill]:** [Single sentence ≤ 20 words identifying the gap and one bridging soft skill]
- **[Another gap]:** [Single sentence ≤ 20 words]
...

Now, generate the JSON object.
`;

  const rawResponse = await sendMessageToGemini(systemPrompt);

  // Gemini might sometimes wrap JSON in markdown code blocks, so we need to extract it.
  const jsonString = rawResponse
    .replace(/```json\n([\s\S]*?)\n```/, "$1")
    .trim();

  try {
    const result: {
      percentage: number;
      reasoning: string;
      highlights?: string;
    } = JSON.parse(jsonString);

    if (
      typeof result.percentage !== "number" ||
      typeof result.reasoning !== "string"
    ) {
      throw new Error("AI response is not in the expected JSON format.");
    }

    // Trim multiple consecutive newlines to a maximum of two for better formatting
    const finalReasoning = result.reasoning.replace(/\n{3,}/g, "\n\n").trim();
    const finalHighlights = (result.highlights ?? "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return {
      percentage: result.percentage,
      reasoning: finalReasoning,
      highlights: finalHighlights,
    };
  } catch (e) {
    console.error("Failed to parse JSON response from AI:", e);
    console.error("Raw AI response:", rawResponse);
    throw new Error("The AI returned an invalid response. Please try again.");
  }
};
