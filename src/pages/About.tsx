import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const About = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>About Me</CardTitle>
          <CardDescription>A little bit about my journey and passions.</CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none space-y-4">
          <p>
            Welcome to my personal space! I'm Rajesh Narayanan, and this portfolio is a reflection of my professional journey, creative endeavors, and personal interests. I believe in continuous learning and building things that make a difference.
          </p>
          <p>
            My work spans various technologies and domains, always with a focus on creating robust, scalable, and user-friendly solutions. Beyond the code, I'm passionate about photography, travel, and exploring new cultures, which you'll find showcased in my gallery and travel map.
          </p>
          <p>
            This platform is built with modern web technologies, demonstrating my commitment to staying current with industry best practices. Feel free to explore, connect, and reach out if you have any questions or collaboration ideas!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default About;