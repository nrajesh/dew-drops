import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Mail, Phone, Globe, MapPin, Briefcase, GraduationCap, Zap, Link as LinkIcon } from "lucide-react";
import type { JsonResume, ResumeWork, ResumeEducation, ResumeSkill } from "@/types/resume";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const RESUME_URL = "https://gist.githubusercontent.com/nrajesh/773fb6b9372c3c44e08a47fea36644f9/raw/resume.json";

const CurriculumVitae = () => {
  const [resume, setResume] = useState<JsonResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResume = async () => {
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
            {error} Please check the Gist URL or your network connection.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!resume) {
    return <div className="text-center py-8">No resume data found.</div>;
  }

  const { basics, work, education, skills } = resume;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
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
                {basics.profiles.map((profile, index) => (
                  <a key={index} href={profile.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    {profile.network}
                  </a>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        {basics.summary && (
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{basics.summary}</p>
          </CardContent>
        )}
      </Card>

      {work && work.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary"><Briefcase className="h-5 w-5" /> Work Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none space-y-6">
              {work.map((job: ResumeWork, index: number) => (
                <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                  <h3 className="text-lg font-semibold">{job.position} at {job.company}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(job.startDate)} – {job.endDate ? formatDate(job.endDate) : "Present"}
                  </p>
                  {job.summary && <p className="text-sm">{job.summary}</p>}
                  {job.highlights && job.highlights.length > 0 && (
                    <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                      {job.highlights.map((highlight, hIndex) => (
                        <li key={hIndex}>{highlight}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {education && education.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary"><GraduationCap className="h-5 w-5" /> Education</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none space-y-6">
              {education.map((edu: ResumeEducation, index: number) => (
                <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                  <h3 className="text-lg font-semibold">{edu.institution}</h3>
                  <p className="text-sm text-muted-foreground">{edu.studyType} in {edu.area}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(edu.startDate)} – {edu.endDate ? formatDate(edu.endDate) : "Present"}
                  </p>
                  {edu.gpa && <p className="text-sm">GPA: {edu.gpa}</p>}
                  {edu.courses && edu.courses.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">Courses: {edu.courses.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {skills && skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary"><Zap className="h-5 w-5" /> Skills</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {skills.map((skill: ResumeSkill, index: number) => (
              <Badge key={index} variant="secondary" className="px-3 py-1">
                {skill.name} {skill.level && `(${skill.level})`}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CurriculumVitae;