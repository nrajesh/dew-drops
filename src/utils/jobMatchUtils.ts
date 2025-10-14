import { extractJobKeywords } from "@/integrations/gemini/client";
import type { JsonResume, ResumeWork, ResumeEducation, ResumeSkill, ResumeLanguage, ResumeAward, ResumePublication, ResumeReference } from "@/types/resume";

// This function will be passed from the component where sendMessageToGemini is available
type SendMessageToGeminiFunction = (message: string) => Promise<string>;

export const generateJobMatchReasoning = async (
  jobDescription: string,
  chatbotKnowledge: string | null,
  resume: JsonResume,
  sendMessageToGemini: SendMessageToGeminiFunction,
  onStepUpdate: (stepIndex: number) => void // New callback for step updates
): Promise<{ percentage: number; reasoning: string }> => { // Simplified return type
  onStepUpdate(0); // Step 1: Extracting Key Criteria
  // Step 1: Extract job requirements using Gemini
  const jobRequirements = await extractJobKeywords(jobDescription);

  onStepUpdate(1); // Step 2: Text Preprocessing
  // Step 2: Prepare CV sections for AI consumption
  const allCvContent: string[] = [];
  if (resume.basics?.summary) allCvContent.push(resume.basics.summary);
  resume.work?.forEach((w: ResumeWork) => allCvContent.push(`${w.position} at ${w.company} ${w.summary} ${w.highlights?.join(' ')} ${w.industry || ''}`));
  resume.education?.forEach((e: ResumeEducation) => allCvContent.push(`${e.studyType} in ${e.area} from ${e.institution} ${e.courses?.join(' ')}`));
  resume.skills?.forEach((s: ResumeSkill) => allCvContent.push(`${s.name} ${s.level} ${s.keywords?.join(' ')}`));
  resume.languages?.forEach((l: ResumeLanguage) => allCvContent.push(`${l.language} ${l.fluency}`));
  resume.publications?.forEach((p: ResumePublication) => allCvContent.push(`${p.name} ${p.summary} ${p.publisher}`));
  resume.awards?.forEach((a: ResumeAward) => allCvContent.push(`${a.title} ${a.awarder} ${a.summary}`));
  resume.references?.forEach((r: ResumeReference) => allCvContent.push(`${r.name} ${r.reference}`));
  const combinedCvText = allCvContent.join(' ');

  onStepUpdate(2); // Step 3: Skill & Experience Mapping
  // Step 3: Collect all skills from CV for direct comparison
  const allCvSkills: string[] = [];
  resume.skills?.forEach(s => {
    allCvSkills.push(s.name);
    s.keywords?.forEach(k => allCvSkills.push(k));
  });
  resume.work?.forEach(w => w.highlights?.forEach(h => allCvSkills.push(h)));
  resume.languages?.forEach(l => allCvSkills.push(l.language));
  resume.publications?.forEach(p => allCvSkills.push(p.name, p.publisher));
  resume.awards?.forEach(a => allCvSkills.push(a.title, a.awarder));

  const jobReqSet: Set<string> = new Set(jobRequirements.map(s => s.toLowerCase()));
  const cvSkillsSet: Set<string> = new Set(allCvSkills.map(s => s.toLowerCase()));

  const overlaps = Array.from(jobReqSet).filter((req: string) => cvSkillsSet.has(req));
  const missing = Array.from(jobReqSet).filter((req: string) => !cvSkillsSet.has(req));

  onStepUpdate(3); // Step 4: Gap Identification & Soft Skill Leverage
  // Step 4 is now just a placeholder for the final step.

  onStepUpdate(4); // Step 5: Generating Match Report & Percentage
  
  const systemPrompt = `You are a career fit analyst for my personal portfolio. Your task is to provide a professional assessment of how well my profile aligns with a given job description. The output must be in a first-person passive tone (using 'my' instead of 'Rajesh's' or 'the candidate').

Your final output must be a single, valid JSON object with two keys: "percentage" and "reasoning".
- "percentage": A number between 0 and 100, representing the overall match.
- "reasoning": A JSON-escaped markdown string containing ONLY the 'Matching Areas' and 'Gaps' sections. Do NOT include any other sections. Ensure all double quotes within the markdown are escaped with a backslash (\\") and all newlines are escaped as (\\n).

Here is the job description: ${jobDescription}
Here is a summary of my profile (CV and chatbot knowledge): ${chatbotKnowledge}
My detailed resume data (JSON): ${JSON.stringify(resume)}
Identified overlapping skills/requirements: ${overlaps.join(', ')}
Identified missing skills/requirements: ${missing.join(', ')}
Combined CV text for broader context: ${combinedCvText}

For the "reasoning" markdown string, follow this structure strictly. Ensure each point starts with '+ ' or '- ' and is left-aligned.

## Matching Areas
+ **[Concise Title]:** [Succinct point describing a strength, using specific data points from my resume/portfolio (e.g., "My 10 years of experience in X aligns with...", "My project Y demonstrates Z skill..."). Focus on how my existing skills and experience directly match or are closely related to the job requirements.]
+ **[Another Concise Title]:** [Another point with specific data]
...

## Gaps
- [Missing skill/requirement] - [Identify a relevant soft skill from my profile (resume/chatbot knowledge) and explain how it can be leveraged to bridge this gap. E.g., "Missing skill: Cloud Security - My strong problem-solving skills, demonstrated in project X, can be leveraged to quickly learn and adapt to new security frameworks." Focus on how my existing soft skills can compensate or facilitate learning for the identified hard skill gaps.]
- [Another missing skill with soft skill leverage]
...

Now, generate the JSON object.
`;

  const rawResponse = await sendMessageToGemini(systemPrompt);
  
  // Gemini might sometimes wrap JSON in markdown code blocks, so we need to extract it.
  const jsonString = rawResponse.replace(/```json\n([\s\S]*?)\n```/, '$1').trim();
  console.log("Attempting to parse JSON (generateJobMatchReasoning):", jsonString); // Debugging line
  try {
    const result: { percentage: number; reasoning: string } = JSON.parse(jsonString);
    
    if (typeof result.percentage !== 'number' || typeof result.reasoning !== 'string') {
      throw new Error("AI response is not in the expected JSON format.");
    }

    // Trim multiple consecutive newlines to a maximum of two for better formatting
    const finalReasoning = result.reasoning.replace(/\n{3,}/g, '\n\n').trim();

    return { percentage: result.percentage, reasoning: finalReasoning };
  } catch (e) {
    console.error("Failed to parse JSON response from AI:", e);
    console.error("Raw AI response:", rawResponse);
    throw new Error("The AI returned an invalid response. Please try again.");
  }
};