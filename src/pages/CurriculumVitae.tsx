import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Mail, Phone, Globe, MapPin, Briefcase, GraduationCap, Zap, Link as LinkIcon, Award, Languages, Heart, BookOpen, Users, Printer, ChevronDown, Linkedin } from "lucide-react";
import type { JsonResume, ResumeWork, ResumeEducation, ResumeSkill, ResumeAward, ResumeLanguage, ResumeInterest, ResumePublication, ResumeReference } from "@/types/resume";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { JobMatchPopup } from "@/components/JobMatchPopup";
import { usePortfolioContext } from "@/hooks/usePortfolioContext";

const RESUME_URL = import.meta.env.VITE_RESUME_URL;

const CurriculumVitae = () => {
  const [resume, setResume] = useState<JsonResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJobMatchOpen, setIsJobMatchOpen] = useState(false);
  const { chatbotKnowledge, resume: contextResume, loading: contextLoading, error: contextError } = usePortfolioContext();

  // State for collapsible sections
  const [isWorkOpen, setIsWorkOpen] = useState(true);
  const [isEducationOpen, setIsEducationOpen] = useState(true);
  const [isSkillsOpen, setIsSkillsOpen] = useState(true);
  const [isAwardsOpen, setIsAwardsOpen] = useState(true);
  const [isLanguagesOpen, setIsLanguagesOpen] = useState(true);
  const [isInterestsOpen, setIsInterestsOpen] = useState(true);
  const [isPublicationsOpen, setIsPublicationsOpen] = useState(true);
  const [isReferencesOpen, setIsReferencesOpen] = useState(true);

  useEffect(() => {
    const fetchResume = async () => {
      if (!RESUME_URL) {
        setError("VITE_RESUME_URL environment variable is not set.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(RESUME_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch resume: ${response.statusText}`);
        }
        const data: JsonResume = await response.json();
        setResume(data);
      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching resume:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResume();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Present";
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } catch {
      return dateString; // Fallback for invalid date strings
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `${resume?.basics.name || "Rajesh Narayanan"}-Resume.pdf`;
    window.print();
    document.title = originalTitle;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error loading CV</AlertTitle>
          <AlertDescription>
            {error} Please ensure <code>VITE_RESUME_URL</code> is set correctly in your environment variables and points to a valid JSON Resume Gist.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!resume) {
    return <div className="text-center py-8">No resume data found.</div>;
  }

  const { basics, work, education, skills, awards, languages, interests, publications, references } = resume;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-end items-end sm:items-center gap-2 print:hidden mb-4 group">
        <p className="text-sm text-muted-foreground opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">Collapsed sections will not be printed.</p>
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" /> Print to PDF
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={basics.picture} alt={basics.name} />
            <AvatarFallback>{basics.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left">
            <CardTitle className="text-4xl font-bold">{basics.name}</CardTitle>
            <CardDescription className="text-xl text-muted-foreground">{basics.label}</CardDescription>
            <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-2 mt-4 text-sm">
              {basics.email && (
                <a href={`mailto:${basics.email}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Mail className="h-4 w-4" /> {basics.email}
                </a>
              )}
              {basics.phone && (
                <a href={`tel:${basics.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Phone className="h-4 w-4" /> {basics.phone}
                </a>
              )}
              {basics.url && (
                <a href={basics.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Globe className="h-4 w-4" /> {basics.url.replace(/^(https?:\/\/)?(www\.)?/, '')}
                </a>
              )}
              {basics.location?.city && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {basics.location.city}, {basics.location.countryCode}
                </span>
              )}
            </div>
            {basics.profiles && basics.profiles.length > 0 && (
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                {basics.profiles.map((profile, index) => {
                  const isLinkedIn = profile.network.toLowerCase() === 'linkedin';
                  const displayUrl = isLinkedIn ? 'https://linkedin.com/in/nrajesh' : profile.url;
                  return (
                    <a key={index} href={displayUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                      {isLinkedIn ? <Linkedin className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                      {profile.network}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </CardHeader>
        {basics.summary && (
          <CardContent>
            <p className="text-muted-foreground">{basics.summary}</p>
          </CardContent>
        )}
      </Card>

      {/* Add the new "Add Your Job Description" button with wave animation */}
      <div className="flex justify-center mt-4">
        <Button
          variant="default"
          size="lg"
          className="relative overflow-hidden group"
          onClick={() => setIsJobMatchOpen(true)}
        >
          <span className="relative z-10">Add Your Job Description</span>
          <span className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-in-out"></span>
        </Button>
      </div>

      {work && work.length > 0 && (
        <Card>
          <Collapsible open={isWorkOpen} onOpenChange={setIsWorkOpen} className="cv-collapsible-section">
            <CardHeader>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
                  <CardTitle className="flex items-center gap-2 text-primary"><Briefcase className="h-5 w-5" /> Work Experience</CardTitle>
                  <ChevronDown className={cn("h-5 w-5 transition-transform", isWorkOpen ? "rotate-180" : "rotate-0")} />
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none space-y-6">
                  {work.map((job: ResumeWork, index: number) => (
                    <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                      <h3 className="text-lg font-semibold">{job.position} at {job.company} ({job.location})</h3>
                      <p className="text-muted-foreground">
                        {formatDate(job.startDate)} – {job.endDate ? formatDate(job.endDate) : "Present"}
                      </p>
                      {job.summary && <p>{job.summary}</p>}
                      {job.highlights && job.highlights.length > 0 && (
                        <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                          {job.highlights.map((highlight, hIndex) => (
                            <li key={hIndex}>{highlight}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {education && education.length > 0 && (
        <Card>
          <Collapsible open={isEducationOpen} onOpenChange={setIsEducationOpen} className="cv-collapsible-section">
            <CardHeader>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
                  <CardTitle className="flex items-center gap-2 text-primary"><GraduationCap className="h-5 w-5" /> Education</CardTitle>
                  <ChevronDown className={cn("h-5 w-5 transition-transform", isEducationOpen ? "rotate-180" : "rotate-0")} />
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none space-y-6">
                  {education.map((edu: ResumeEducation, index: number) => (
                    <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                      <h3 className="text-lg font-semibold">{edu.institution}</h3>
                      <p className="text-muted-foreground">{edu.studyType} in {edu.area}</p>
                      <p className="text-muted-foreground">
                        {formatDate(edu.startDate)} – {edu.endDate ? formatDate(edu.endDate) : "Present"}
                      </p>
                      {edu.gpa && <p>GPA: {edu.gpa}</p>}
                      {edu.courses && edu.courses.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">Courses: {edu.courses.join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {skills && skills.length > 0 && (
        <Card>
          <Collapsible open={isSkillsOpen} onOpenChange={setIsSkillsOpen} className="cv-collapsible-section">
            <CardHeader>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
                  <CardTitle className="flex items-center gap-2 text-primary"><Zap className="h-5 w-5" /> Skills</CardTitle>
                  <ChevronDown className={cn("h-5 w-5 transition-transform", isSkillsOpen ? "rotate-180" : "rotate-0")} />
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="flex flex-wrap gap-2">
                {skills.map((skill: ResumeSkill, index: number) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {skill.name} {skill.level && `(${skill.level})`}
                  </Badge>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {awards && awards.length > 0 && (
        <Card>
          <Collapsible open={isAwardsOpen} onOpenChange={setIsAwardsOpen} className="cv-collapsible-section">
            <CardHeader>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
                  <CardTitle className="flex items-center gap-2 text-primary"><Award className="h-5 w-5" /> Awards</CardTitle>
                  <ChevronDown className={cn("h-5 w-5 transition-transform", isAwardsOpen ? "rotate-180" : "rotate-0")} />
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none space-y-6">
                  {awards.map((award: ResumeAward, index: number) => (
                    <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                      <h3 className="text-lg font-semibold">{award.title}</h3>
                      <p className="text-muted-foreground">{award.awarder} - {formatDate(award.date)}</p>
                      {award.summary && <p>{award.summary}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {languages && languages.length > 0 && (
        <Card>
          <Collapsible open={isLanguagesOpen} onOpenChange={setIsLanguagesOpen} className="cv-collapsible-section">
            <CardHeader>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
                  <CardTitle className="flex items-center gap-2 text-primary"><Languages className="h-5 w-5" /> Languages</CardTitle>
                  <ChevronDown className={cn("h-5 w-5 transition-transform", isLanguagesOpen ? "rotate-180" : "rotate-0")} />
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="flex flex-wrap gap-2">
                {languages.map((lang: ResumeLanguage, index: number) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {lang.language} ({lang.fluency})
                  </Badge>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {interests && interests.length > 0 && (
        <Card>
          <Collapsible open={isInterestsOpen} onOpenChange={setIsInterestsOpen} className="cv-collapsible-section">
            <CardHeader>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
                  <CardTitle className="flex items-center gap-2 text-primary"><Heart className="h-5 w-5" /> Interests</CardTitle>
                  <ChevronDown className={cn("h-5 w-5 transition-transform", isInterestsOpen ? "rotate-180" : "rotate-0")} />
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="flex flex-wrap gap-2">
                {interests.map((interest: ResumeInterest, index: number) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {interest.name} {interest.keywords && interest.keywords.length > 0 && `(${interest.keywords.join(', ')})`}
                  </Badge>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {publications && publications.length > 0 && (
        <Card>
          <Collapsible open={isPublicationsOpen} onOpenChange={setIsPublicationsOpen} className="cv-collapsible-section">
            <CardHeader>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
                  <CardTitle className="flex items-center gap-2 text-primary"><BookOpen className="h-5 w-5" /> Publications</CardTitle>
                  <ChevronDown className={cn("h-5 w-5 transition-transform", isPublicationsOpen ? "rotate-180" : "rotate-0")} />
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none space-y-6">
                  {publications.map((pub: ResumePublication, index: number) => (
                    <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                      <h3 className="text-lg font-semibold">
                        {pub.url ? (
                          <a href={pub.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">
                            {pub.name}
                            <LinkIcon className="h-4 w-4 inline-block ml-2" />
                          </a>
                        ) : (
                          pub.name
                        )}
                      </h3>
                      <p className="text-muted-foreground">{pub.publisher} - {formatDate(pub.releaseDate)}</p>
                      {pub.summary && <p>{pub.summary}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {references && references.length > 0 && (
        <Card>
          <Collapsible open={isReferencesOpen} onOpenChange={setIsReferencesOpen} className="cv-collapsible-section">
            <CardHeader>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
                  <CardTitle className="flex items-center gap-2 text-primary"><Users className="h-5 w-5" /> References</CardTitle>
                  <ChevronDown className={cn("h-5 w-5 transition-transform", isReferencesOpen ? "rotate-180" : "rotate-0")} />
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none space-y-6">
                  {references.map((ref: ResumeReference, index: number) => (
                    <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                      <h3 className="text-lg font-semibold">{ref.name}</h3>
                      <p className="text-muted-foreground">{ref.reference}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Add the JobMatchPopup component */}
      <JobMatchPopup
        isOpen={isJobMatchOpen}
        onOpenChange={setIsJobMatchOpen}
        onMatchRequest={() => {}}
      />
    </div>
  );
};

export default CurriculumVitae;