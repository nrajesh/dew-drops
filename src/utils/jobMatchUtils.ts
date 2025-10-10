// src/utils/jobMatchUtils.ts
import { extractJobKeywords } from "@/integrations/gemini/client";
import { calculateWeightedMatchPercentage } from "@/utils/cosineSimilarity";
import type { JsonResume, ResumeWork, ResumeEducation, ResumeSkill, ResumeLanguage, ResumeAward, ResumePublication, ResumeReference } from "@/types/resume";

// This function will be passed from the component where sendMessageToGemini is available
type SendMessageToGeminiFunction = (message: string) => Promise<string>;

export const generateJobMatchReasoning = async (
  jobDescription: string,
  chatbotKnowledge: string | null,
  resume: JsonResume,
  sendMessageToGemini: SendMessageToGeminiFunction,
  onStepUpdate: (stepIndex: number) => void // New callback for step updates
): Promise<{ percentage: number; reasoning: string; breakdown: { experience: number; education: number; skills: number; languages: number; publications: number; awards: number; references: number } }> => {
  onStepUpdate(0); // Step 1: Extracting Key Criteria
  // Step 1: Extract job requirements using Gemini
  const jobRequirements = await extractJobKeywords(jobDescription);

  onStepUpdate(1); // Step 2: Text Preprocessing
  // Step 2: Prepare CV sections for weighted similarity
  const cvSections = {
    experience: resume.work?.map((w: ResumeWork) => `${w.position} at ${w.company} ${w.summary} ${w.highlights?.join(' ')}`).join(' ') || '',
    education: resume.education?.map((e: ResumeEducation) => `${e.studyType} in ${e.area} from ${e.institution} ${e.courses?.join(' ')}`).join(' ') || '',
    skills: resume.skills?.map((s: ResumeSkill) => `${s.name} ${s.level} ${s.keywords?.join(' ')}`).join(' ') || '',
    languages: resume.languages?.map((l: ResumeLanguage) => `${l.language} ${l.fluency}`).join(' ') || '', // Include languages
    publications: resume.publications?.map((p: ResumePublication) => `${p.name} ${p.summary} ${p.publisher}`).join(' ') || '', // Added
    awards: resume.awards?.map((a: ResumeAward) => `${a.title} ${a.awarder} ${a.summary}`).join(' ') || '', // Added
    references: resume.references?.map((r: ResumeReference) => `${r.name} ${r.reference}`).join(' ') || '', // Added
  };

  onStepUpdate(2); // Step 3: Vectorization & Similarity Calculation
  // Updated weights for weighted similarity calculation
  const { totalPercentage, breakdown } = calculateWeightedMatchPercentage(jobDescription, cvSections, {
    experience: 0.40, // Updated weight for experience
    skills: 0.40,     // Updated weight for skills
    education: 0.05,  // Updated weight for education
    languages: 0.02,   // Updated weight for languages
    publications: 0.03, // Updated weight for publications
    awards: 0.05,      // Updated weight for awards
    references: 0.05,  // Updated weight for references
  });

  onStepUpdate(3); // Step 4: Keyword Matching & Gap Analysis
  // Step 3: Collect all skills from CV for direct comparison
  const allCvSkills: string[] = [];
  resume.skills?.forEach(s => {
    allCvSkills.push(s.name);
    s.keywords?.forEach(k => allCvSkills.push(k));
  });
  resume.work?.forEach(w => w.highlights?.forEach(h => allCvSkills.push(h))); // Also consider work highlights as skills
  resume.languages?.forEach(l => allCvSkills.push(l.language)); // Add languages to skills for direct comparison
  resume.publications?.forEach(p => allCvSkills.push(p.name, p.publisher)); // Add publication names and publishers
  resume.awards?.forEach(a => allCvSkills.push(a.title, a.awarder)); // Add award titles and awarders

  // Step 4: Generate reasoning with Markdown, overlaps, and feedback using Gemini
  const jobReqSet: Set<string> = new Set(jobRequirements.map(s => s.toLowerCase()));
  const cvSkillsSet: Set<string> = new Set(allCvSkills.map(s => s.toLowerCase()));

  const overlaps = Array.from(jobReqSet).filter((req: string) => cvSkillsSet.has(req));
  const missing = Array.from(jobReqSet).filter((req: string) => !cvSkillsSet.has(req));

  // Relaxed qualitative assessment based on percentage
  let qualitativeAssessment = "";
  if (totalPercentage >= 60) {
    qualitativeAssessment = `My profile shows a strong alignment with the job's requirements, particularly in areas of experience.`;
  } else if (totalPercentage >= 30) {
    qualitativeAssessment = `There's a moderate alignment. While some areas match well, others might require further development or a more tailored approach.`;
  } else {
    qualitativeAssessment = `The overall alignment is lower. This suggests the role might require a different set of core competencies or a significant upskilling effort.`;
  }

  // Add additional factors to the analysis
  const additionalFactors = [];

  // Factor 1: Industry Relevance
  if (resume.work && resume.work.length > 0) {
    const recentWork = resume.work[0];
    const industryMatch = jobDescription.toLowerCase().includes(recentWork.industry?.toLowerCase() || '');
    if (industryMatch) {
      additionalFactors.push(`+ **Industry Relevance**: My recent work in ${recentWork.industry || 'the same industry'} aligns well with the job's focus.`);
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

  onStepUpdate(4); // Step 5: Finalizing Profile Match
  const systemPrompt = `You are a career fit analyst for my personal portfolio. Your task is to provide a professional assessment of how well my profile aligns with a given job description. The output must be in a first-person passive tone (using 'my' instead of 'Rajesh's' or 'the candidate').

Structure your response into two main sections: 'Matching Areas' and 'Gaps'. Each section should be a bulletized paragraph.

Here is the job description: ${jobDescription}
Here is a summary of my profile (CV and chatbot knowledge): ${chatbotKnowledge}
My detailed resume data (JSON): ${JSON.stringify(resume, null, 2)}
Identified overlapping skills/requirements: ${overlaps.join(', ')}
Identified missing skills/requirements: ${missing.join(', ')}
Qualitative assessment: ${qualitativeAssessment}
Match breakdown: Experience ${breakdown.experience.toFixed(0)}%, Skills ${breakdown.skills.toFixed(0)}%, Education ${breakdown.education.toFixed(0)}%, Languages ${breakdown.languages.toFixed(0)}%, Publications ${breakdown.publications.toFixed(0)}%, Awards ${breakdown.awards.toFixed(0)}%, References ${breakdown.references.toFixed(0)}%.

Provide the response strictly in the format below, using Markdown. Ensure each point starts with '+ ' or '- ' and is left-aligned.

## Matching Areas
+ **[Concise Title]:** [Succinct point describing a strength, using specific data points from my resume/portfolio (e.g., "My 10 years of experience in X aligns with...", "My project Y demonstrates Z skill..."). Focus on how my existing skills and experience directly match the job requirements.]
+ **[Another Concise Title]:** [Another point with specific data]
...

## Gaps
- [Missing skill/requirement] - [Identify a relevant soft skill from my profile (resume/chatbot knowledge) and explain how it can be leveraged to bridge this gap. E.g., "Missing skill: Cloud Security - My strong problem-solving skills, demonstrated in project X, can be leveraged to quickly learn and adapt to new security frameworks." Focus on how my existing soft skills can compensate or facilitate learning for the identified hard skill gaps.]
- [Another missing skill with soft skill leverage]
...

## Additional Factors
${additionalFactors.join('\n')}
`;

  const reasoningText = await sendMessageToGemini(systemPrompt);
  // Trim multiple consecutive newlines to a maximum of two for better formatting
  const finalReasoning = reasoningText.replace(/\n{3,}/g, '\n\n').trim();

  return { percentage: totalPercentage, reasoning: finalReasoning, breakdown };
};