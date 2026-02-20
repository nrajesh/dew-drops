import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Mail, Phone, Globe, MapPin, Briefcase, GraduationCap, Zap, Link as LinkIcon, Award, Languages, Heart, BookOpen, Users, Printer, ChevronDown, Linkedin } from "lucide-react";
import type { JsonResume, ResumeWork, ResumeEducation, ResumeSkill, ResumeAward, ResumeLanguage, ResumeInterest, ResumePublication, ResumeReference } from "@/types/resume";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils"; // Import centralized formatDate
import { Link } from 'react-router-dom'; // Import Link for navigation
import { supabase } from "@/integrations/supabase/client"; // Import Supabase client

const RESUME_URL = import.meta.env.VITE_RESUME_URL;

const CurriculumVitae = () => {
  const [resume, setResume] = useState<JsonResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchCvFeatureEnabled, setMatchCvFeatureEnabled] = useState(false); // New state for feature flag

  // State for collapsible sections
  const [isWorkOpen, setIsWorkOpen] = useState(true);
  const [isEducationOpen, setIsEducationOpen] = useState(true);
  const [isSkillsOpen, setIsSkillsOpen] = useState(true);
  const [isAwardsOpen, setIsAwardsOpen] = useState(true);
  const [isLanguagesOpen, setIsLanguagesOpen] = useState(true);
  const [isInterestsOpen, setIsInterestsOpen] = useState(true);
  const [isPublicationsOpen, setIsPublicationsOpen] = useState(true);
  const [isReferencesOpen, setIsReferencesOpen] = useState(true);

  // Helper to ensure URL has protocol for safe linking
  const ensureAbsoluteUrl = (url: string) => {
    if (!url) return url;
    // Check if the URL already starts with http:// or https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Prepend https:// to ensure it's treated as an absolute URL
      return `https://${url}`;
    }
    return url;
  };

  // Helper function to convert newlines to <br> tags
  const formatTextWithLineBreaks = (text: string) => {
    return text.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  useEffect(() => {
    const fetchResumeAndFeatureFlags = async () => {
      // Fetch resume data
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

      // Fetch feature flag status
      try {
        const { data, error: dbError } = await supabase
          .from('feature_toggles')
          .select('is_enabled')
          .eq('feature_key', 'match_cv')
          .single();

        if (dbError) {
          console.error("Error fetching feature flag 'match_cv':", dbError);
          setMatchCvFeatureEnabled(false); // Default to false on error
        } else {
          setMatchCvFeatureEnabled(data?.is_enabled || false);
        }
      } catch (err) {
        console.error("Unexpected error fetching feature flag:", err);
        setMatchCvFeatureEnabled(false); // Default to false on unexpected error
      }
    };

    fetchResumeAndFeatureFlags();
  }, []);

  const handlePrint = useCallback(() => {
    const originalTitle = document.title;
    document.title = `${resume?.basics.name || "Rajesh Narayanan"}-Resume.pdf`;

    // Add a class to the body to force light mode for printing
    document.body.classList.add('print-light-mode');

    window.print();

    // Remove the class after printing
    document.body.classList.remove('print-light-mode');
    document.title = originalTitle;
  }, [resume]);

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
            <AvatarImage
              src={basics.picture?.includes('media.licdn.com') ? undefined : basics.picture}
              alt={basics.name}
            />
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
              {basics.location?.city && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {basics.location.city}, {basics.location.countryCode}
                </span>
              )}
            </div>
            {(basics.profiles && basics.profiles.length > 0) || basics.website ? (
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                {basics.profiles && basics.profiles.map((profile, index) => {
                  const isLinkedIn = profile.network.toLowerCase() === 'linkedin';
                  // Apply ensureAbsoluteUrl to profile URLs unless it's the hardcoded LinkedIn URL
                  const displayUrl = isLinkedIn ? 'https://linkedin.com/in/nrajesh' : ensureAbsoluteUrl(profile.url);
                  return (
                    <a key={index} href={displayUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                      {isLinkedIn ? <Linkedin className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                      {profile.network}
                    </a>
                  );
                })}
                {basics.website && (
                  <a href={ensureAbsoluteUrl(basics.website)} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
              </div>
            ) : null}
          </div>
        </CardHeader>
        {basics.summary && (
          <CardContent>
            <p className="text-muted-foreground">{formatTextWithLineBreaks(basics.summary)}</p>
          </CardContent>
        )}
        {matchCvFeatureEnabled && (
          <div className="flex justify-center mt-4 pb-6 print:hidden"> {/* Added print:hidden here */}
            <Link to="/match-cv">
              <Button>
                Match CV with a Job
              </Button>
            </Link>
          </div>
        )}
      </Card>

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
                      <h3 className="text-lg font-semibold">{job.position} at {job.name} ({job.location})</h3>
                      <p className="text-muted-foreground">
                        {formatDate(job.startDate, { year: 'numeric', month: 'short' })} – {job.endDate ? formatDate(job.endDate, { year: 'numeric', month: 'short' }) : "Present"}
                      </p>
                      {job.summary && <p>{formatTextWithLineBreaks(job.summary)}</p>}
                      {job.highlights && job.highlights.length > 0 && (
                        <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                          {job.highlights.map((highlight, hIndex) => (
                            <li key={hIndex}>{formatTextWithLineBreaks(highlight)}</li>
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
                        {formatDate(edu.startDate, { year: 'numeric', month: 'short' })} – {edu.endDate ? formatDate(edu.endDate, { year: 'numeric', month: 'short' }) : "Present"}
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
              <CardContent className="space-y-4">
                {skills.map((skill: ResumeSkill, index: number) => (
                  <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <h3 className="text-lg font-semibold">
                      {skill.name} {skill.level && `(${skill.level})`}
                    </h3>
                    {skill.keywords && skill.keywords.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {skill.keywords.join(', ')}
                      </p>
                    )}
                  </div>
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
                      <p className="text-muted-foreground">{award.awarder} - {formatDate(award.date, { year: 'numeric', month: 'short' })}</p>
                      {award.summary && <p>{formatTextWithLineBreaks(award.summary)}</p>}
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
                          <a href={ensureAbsoluteUrl(pub.url)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">
                            {pub.name}
                            <LinkIcon className="h-4 w-4 inline-block ml-2" />
                          </a>
                        ) : (
                          pub.name
                        )}
                      </h3>
                      <p className="text-muted-foreground">{formatDate(pub.releaseDate, { year: 'numeric', month: 'short' })}</p>
                      {pub.summary && <p>{formatTextWithLineBreaks(pub.summary)}</p>}
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
                      <p className="text-muted-foreground">{formatTextWithLineBreaks(ref.reference)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </div>
  );
};

export default CurriculumVitae;