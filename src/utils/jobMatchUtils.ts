// src/utils/jobMatchUtils.ts
import { extractJobKeywords } from "@/integrations/gemini/client";
import { calculateWeightedMatchPercentage } from "@/utils/cosineSimilarity";
import type { JsonResume } from "@/types/resume";

// This function will be passed from the component where sendMessageToGemini is available
type SendMessageToGeminiFunction = (message: string) => Promise<string>;

export const generateJobMatchReasoning = async (
  jobDescription: string,
  chatbotKnowledge: string | null,
  resume: JsonResume,
  sendMessageToGemini: SendMessageToGeminiFunction,
  onStepUpdate: (stepIndex: number) => void // New callback for step updates
): Promise<{ percentage: number; reasoning: string; breakdown: { experience: number; education: number; skills: number } }> => {
  onStepUpdate(0); // Step 1: Extracting Key Criteria
  // Step 1: Extract job requirements using Gemini
  const jobRequirements = await extractJobKeywords(jobDescription);

  onStepUpdate(1); // Step 2: Text Preprocessing
  // Step 2: Prepare CV sections for weighted similarity
  const cvSections = {
    experience: resume.work?.map(w => `${w.position} at ${w.company} ${w.summary} ${w.highlights?.join(' ')}`).join(' ') || '',
    education: resume.education?.map(e => `${e.studyType} in ${e.area} from ${e.institution} ${e.courses?.join(' ')}`).join(' ') || '',
    skills: resume.skills?.map(s => `${s.name} ${s.level} ${s.keywords?.join(' ')}`).join(' ') || '',
  };

  onStepUpdate(2); // Step 3: Vectorization & Similarity Calculation
  const { totalPercentage, breakdown } = calculateWeightedMatchPercentage(jobDescription, cvSections);

  onStepUpdate(3); // Step 4: Keyword Matching & Gap Analysis
  // Step 3: Collect all skills from CV for direct comparison
  const allCvSkills: string[] = [];
  resume.skills?.forEach(s => {
    allCvSkills.push(s.name);
    s.keywords?.forEach(k => allCvSkills.push(k));
  });
  resume.work?.forEach(w => w.highlights?.forEach(h => allCvSkills.push(h))); // Also consider work highlights as skills

  // Step 4: Generate reasoning with Markdown, overlaps, and feedback using Gemini
  const jobReqSet: Set<string> = new Set(jobRequirements.map(s => s.toLowerCase()));
  const cvSkillsSet: Set<string> = new Set(allCvSkills.map(s => s.toLowerCase()));

  const overlaps = Array.from(jobReqSet).filter((req: string) => cvSkillsSet.has(req));
  const missing = Array.from(jobReqSet).filter((req: string) => !cvSkillsSet.has(req));

  // Qualitative assessment based on percentage, without explicitly stating the percentage
  let qualitativeAssessment = "";
  if (totalPercentage >= 70) {
    qualitativeAssessment = `My profile shows a strong alignment with the job's requirements, particularly in areas of experience.`;
  } else if (totalPercentage >= 40) {
    qualitativeAssessment = `There's a moderate alignment. While some areas match well, others might require further development or a more tailored approach.`;
  } else {
    qualitativeAssessment = `The overall alignment is lower. This suggests the role might require a different set of core competencies or a significant upskilling effort.`;
  }

  onStepUpdate(4); // Step 5: Finalizing Profile Match
  const systemPrompt = `You are a career fit analyst for my personal portfolio. Your task is to provide a professional assessment of how well my profile aligns with a given job description. The output must be in a first-person passive tone (using 'my' instead of 'Rajesh's' or 'the candidate').

Structure your response into two main sections: 'Matching Areas' and 'Gaps'. Each section should be a bulletized paragraph.

Here is the job description: ${jobDescription}
Here is a summary of my profile (CV and chatbot knowledge): ${chatbotKnowledge}
My detailed resume data (JSON): ${JSON.stringify(resume, null, 2)}
Identified overlapping skills/requirements: ${overlaps.join(', ')}
Identified missing skills/requirements: ${missing.join(', ')}
Qualitative assessment: ${qualitativeAssessment}
Match breakdown: Experience ${breakdown.experience.toFixed(0)}%, Education ${breakdown.education.toFixed(0)}%, Skills ${breakdown.skills.toFixed(0)}%.

Provide the response strictly in the format below, using Markdown. Ensure each point starts with '+ ' or '- ' and is left-aligned.

## Matching Areas
+ [Succinct point describing a strength, using specific data points from my resume/portfolio (e.g., "My 10 years of experience in X aligns with...", "My project Y demonstrates Z skill..."). Focus on how my existing skills and experience directly match the job requirements.]
+ [Another point with specific data]
...

## Gaps
- List a maximum of 3 gaps. If fewer than 3 are identified, list only those found. If no significant gaps are identified, state 'No significant gaps identified.'
- [Missing skill/requirement] - [Identify a relevant soft skill from my profile (resume/chatbot knowledge) and explain how it can be leveraged to bridge this gap. E.g., "Missing skill: Cloud Security - My strong problem-solving skills, demonstrated in project X, can be leveraged to quickly learn and adapt to new security frameworks." Focus on how my existing soft skills can compensate or facilitate learning for the identified hard skill gaps.]
- [Another missing skill with soft skill leverage]
...
`;

  const reasoningText = await sendMessageToGemini(systemPrompt);
  // Trim multiple consecutive newlines to a maximum of two for better formatting
  const finalReasoning = reasoningText.replace(/\n{3,}/g, '\n\n').trim();

  return { percentage: totalPercentage, reasoning: finalReasoning, breakdown };
};