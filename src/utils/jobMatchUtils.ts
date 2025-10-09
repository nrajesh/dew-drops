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

  let feedback = `**Breakdown:**\n`;
  feedback += `- **Experience:** ${breakdown.experience.toFixed(0)}%\n`;
  feedback += `- **Education:** ${breakdown.education.toFixed(0)}%\n`;
  feedback += `- **Skills:** ${breakdown.skills.toFixed(0)}%\n\n`;

  if (overlaps.length > 0) {
    feedback += `**Key Overlapping Skills/Requirements:**\n- ${overlaps.join(', ')}\n\n`;
  }
  if (missing.length > 0) {
    feedback += `**Missing Key Skills/Requirements:**\n- ${missing.join(', ')}\n\n`;
    feedback += `**Actionable Feedback:**\n`;
    feedback += `To improve alignment, consider highlighting experiences or projects where you've utilized these missing skills. If you have relevant experience not explicitly listed, ensure it's added to your CV. For skills you're developing, consider adding them to a "Learning" or "Future Skills" section, or gaining practical experience through projects.\n\n`;
  }

  // Qualitative assessment based on percentage, without explicitly stating the percentage
  let qualitativeAssessment = "";
  if (totalPercentage >= 70) {
    qualitativeAssessment = `Rajesh's profile shows a strong alignment with the job's requirements, particularly in areas of experience.`;
  } else if (totalPercentage >= 40) {
    qualitativeAssessment = `There's a moderate alignment. While some areas match well, others might require further development or a more tailored approach.`;
  } else {
    qualitativeAssessment = `The overall alignment is lower. This suggests the role might require a different set of core competencies or a significant upskilling effort.`;
  }

  onStepUpdate(4); // Step 5: Finalizing Profile Match
  const systemPrompt = `Analyze the following job description against the candidate's profile and provide a professional assessment.
  Job Description: ${jobDescription}
  Candidate Profile (summary from CV and chatbot knowledge): ${chatbotKnowledge}
  
  ${feedback}

  ${qualitativeAssessment}

  Provide a concise reasoning (2-3 sentences) explaining the alignment of the candidate's profile with the job description.
  If the alignment is strong, highlight specific skills or experiences that align.
  If the alignment is lower, suggest areas where the candidate might need to improve or where the job description might need to be adjusted.
  Be professional and constructive in your assessment.`;

  const reasoningText = await sendMessageToGemini(systemPrompt);
  // Trim multiple consecutive newlines to a maximum of two for better formatting
  const finalReasoning = reasoningText.replace(/\n{3,}/g, '\n\n').trim();

  return { percentage: totalPercentage, reasoning: finalReasoning, breakdown };
};