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
  sendMessageToGemini: SendMessageToGeminiFunction
): Promise<{ percentage: number; reasoning: string; breakdown: { experience: number; education: number; skills: number } }> => {
  // Step 1: Extract job requirements using Gemini
  const jobRequirements = await extractJobKeywords(jobDescription);

  // Step 2: Prepare CV sections for weighted similarity
  const cvSections = {
    experience: resume.work?.map(w => `${w.position} at ${w.company} ${w.summary} ${w.highlights?.join(' ')}`).join(' ') || '',
    education: resume.education?.map(e => `${e.studyType} in ${e.area} from ${e.institution} ${e.courses?.join(' ')}`).join(' ') || '',
    skills: resume.skills?.map(s => `${s.name} ${s.level} ${s.keywords?.join(' ')}`).join(' ') || '',
  };

  const { totalPercentage, breakdown } = calculateWeightedMatchPercentage(jobDescription, cvSections);

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

  const systemPrompt = `Analyze the following job description against the candidate's profile and provide a professional assessment.
  Job Description: ${jobDescription}
  Candidate Profile (summary from CV and chatbot knowledge): ${chatbotKnowledge}
  
  ${feedback}

  Provide a concise reasoning (2-3 sentences) explaining why this is a ${totalPercentage.toFixed(0)}% match or why it isn't.
  If the match is high, highlight specific skills or experiences that align.
  If the match is low, suggest areas where the candidate might need to improve or where the job description might need to be adjusted.
  Be professional and constructive in your assessment.`;

  const reasoningText = await sendMessageToGemini(systemPrompt);
  // Trim multiple consecutive newlines to a maximum of two for better formatting
  const finalReasoning = reasoningText.replace(/\n{3,}/g, '\n\n').trim();

  return { percentage: totalPercentage, reasoning: finalReasoning, breakdown };
};