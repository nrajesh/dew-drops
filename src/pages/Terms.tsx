import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Terms = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Terms of Service</CardTitle>
          <CardDescription>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none space-y-4">
          <section>
            <h2 className="text-xl font-semibold">Introduction</h2>
            <p>
              These Terms of Service ("Terms") govern your access to and use of my personal portfolio website. By accessing or using the website, you agree to be bound by these Terms.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold">Use of Content</h2>
            <p>
              All content on this website, including text, images, and other media, is my property or used with permission. You may not reproduce, distribute, modify, or create derivative works of any content without my express written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Disclaimer</h2>
            <p>
              The information on this website is provided for general informational purposes only. I make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability with respect to the website or the information, products, services, or related graphics contained on the website for any purpose. Any reliance you place on such information is therefore strictly at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Changes to Terms</h2>
            <p>
              I reserve the right to modify or replace these Terms at any time. If a revision is material, I will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at my sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Contact Me</h2>
            <p>
              If you have any questions about these Terms, please contact me through my contact page.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default Terms;