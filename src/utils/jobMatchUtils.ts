// src/utils/jobMatchUtils.ts
import { extractJobKeywords } from "@/integrations/gemini/client";
// Removed: import { calculateWeightedMatchPercentage } from "@/utils/cosineSimilarity";
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
  // Add additional factors to the analysis
  const additionalFactors = [];

  // Factor 1: Industry Relevance
  if (resume.work && resume.work.length > 0) {
    const recentWork = resume.work[0];
    const industryMatch = jobDescription.toLowerCase().includes(recentWork.industry?.toLowerCase() || '');
    if (industryMatch) {
      additionalFactors.push(`+ **Industry Relevance**: My recent work in ${recentWork.industry || 'a relevant industry'} aligns well with the job's focus.`);
    } else {
      additionalFactors.push(`- **Industry Relevance**: While my experience is valuable, it's from a different industry than the job's focus.`);
    }
  }

  // Factor 2: Career Progression
  if (resume.work && resume.work.length > 1) {
    const progression = resume.work.reduce((acc, curr, i, arr) => {
      if (i > 0) {
        const prev = arr[i-1];
        if (curr.startDate && prev.endDate) {
          const years = new Date(curr.startDate).getFullYear() - new Date(prev.endDate).getFullYear();
          if (years < 2) {
            acc.push(`Transitioned from ${prev.position} to ${curr.position} within ${years} years`);
          }
        }
      }
      return acc;
    }, [] as string[]);

    if (progression.length > 0) {
      additionalFactors.push(`+ **Career Progression**: I have demonstrated career progression with ${progression.join(', ')}.`);
    }
  }

  // Factor 3: Soft Skills
  const softSkills = [
    "communication", "teamwork", "problem-solving", "adaptability", "leadership",
    "time management", "creativity", "critical thinking", "collaboration", "negotiation"
  ];

  const hasSoftSkills = softSkills.some(skill =>
    allCvSkills.some(cvSkill => cvSkill.toLowerCase().includes(skill))
  );

  if (hasSoftSkills) {
    additionalFactors.push(`+ **Soft Skills**: I possess strong soft skills such as ${softSkills.filter(skill =>
      allCvSkills.some(cvSkill => cvSkill.toLowerCase().includes(skill))
    ).join(', ')} which are valuable in many roles.`);
  }

  // Factor 4: Adaptability
  if (resume.work && resume.work.length > 2) {
    const roles = resume.work.map(w => w.position.toLowerCase());
    const uniqueRoles = new Set(roles);
    if (uniqueRoles.size > 1) {
      additionalFactors.push(`+ **Adaptability**: I have experience transitioning between different roles (${Array.from(uniqueRoles).join(', ')}), demonstrating adaptability.`);
    }
  }

  // Factor 5: Cultural Fit
  const culturalFitKeywords = [
    "team player", "collaborative", "supportive", "mentorship", "inclusive",
    "diverse", "equitable", "respectful", "cultural awareness", "global mindset"
  ];

  const hasCulturalFit = culturalFitKeywords.some(keyword =>
    allCvSkills.some(cvSkill => cvSkill.toLowerCase().includes(keyword))
  );

  if (hasCulturalFit) {
    additionalFactors.push(`+ **Cultural Fit**: I have demonstrated cultural awareness and teamwork through ${culturalFitKeywords.filter(keyword =>
      allCvSkills.some(cvSkill => cvSkill.toLowerCase().includes(keyword))
    ).join(', ')}.`);
  }

  onStepUpdate(4); // Step 5: Generating Match Report & Percentage
  
  let additionalFactorsSection = '';
  if (additionalFactors.length > 0) {
    additionalFactorsSection = `
## Additional Factors
${additionalFactors.join('\n')}
`;
  }

  const systemPrompt = `You are a career fit analyst for my personal portfolio. Your task is to provide a professional assessment of how well my profile aligns with a given job description. The output must be in a first-person passive tone (using 'my' instead of 'Rajesh's' or 'the candidate').

Your final output must be a single, valid JSON object with two keys: "percentage" and "reasoning".
- "percentage": A number between 0 and 100, representing the overall match.
- "reasoning": A markdown string containing ONLY the 'Matching Areas', 'Gaps', and 'Additional Factors' sections. Do NOT include a 'Match Percentage' section in this string.

Here is the job description: ${jobDescription}
Here is a summary of my profile (CV and chatbot knowledge): ${chatbotKnowledge}
My detailed resume data (JSON): ${JSON.stringify(resume, null, 2)}
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
${additionalFactorsSection}

Now, generate the JSON object.
`;

  const rawResponse = await sendMessageToGemini(systemPrompt);
  
  // Gemini might sometimes wrap JSON in markdown code blocks, so we need to extract it.
  const jsonString = rawResponse.replace(/```json\n([\s\S]*?)\n```/, '$1').trim();
  
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