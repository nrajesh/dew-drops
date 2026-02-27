export interface ResumeBasics {
  name: string;
  label: string;
  picture?: string;
  email?: string;
  phone?: string;
  url?: string;
  website?: string; // Added website property
  summary?: string;
  location?: {
    address?: string;
    postalCode?: string;
    city?: string;
    countryCode?: string;
    region?: string;
  };
  profiles?: {
    network: string;
    username: string;
    url: string;
  }[];
}

export interface ResumeWork {
  company: string;
  name: string;
  location: string;
  position: string;
  website?: string;
  startDate: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
  industry?: string; // Added industry property
}

export interface ResumeEducation {
  institution: string;
  area: string;
  studyType?: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
  courses?: string[];
}

export interface ResumeSkill {
  name: string;
  level?: string;
  keywords?: string[];
}

export interface ResumeAward {
  title: string;
  date: string;
  awarder: string;
  summary?: string;
}

export interface ResumeLanguage {
  language: string;
  fluency: string;
}

export interface ResumeInterest {
  name: string;
  keywords?: string[];
}

export interface ResumePublication {
  name: string;
  url: string;
  publisher: string;
  releaseDate: string;
  website?: string;
  summary?: string;
}

export interface ResumeReference {
  name: string;
  reference: string;
}

export interface ResumeProject {
  name: string;
  description?: string;
  url?: string;
  highlights?: string[];
  keywords?: string[];
  startDate?: string;
  endDate?: string;
}

export interface JsonResume {
  basics: ResumeBasics;
  work?: ResumeWork[];
  education?: ResumeEducation[];
  skills?: ResumeSkill[];
  awards?: ResumeAward[];
  languages?: ResumeLanguage[];
  interests?: ResumeInterest[];
  publications?: ResumePublication[];
  references?: ResumeReference[];
  projects?: ResumeProject[];
}
