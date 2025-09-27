import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
          <CardDescription>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none space-y-4">
          <section>
            <h2 className="text-xl font-semibold">Introduction</h2>
            <p>
              Welcome to our Privacy Policy. Your privacy is critically important to us. It is our policy to respect your privacy regarding any information we may collect from you across our website.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold">Information We Collect</h2>
            <p>
              We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.
            </p>
            <p>
              For example, when you use our contact form, we collect your name and email address so that we can reply to your message. We also use analytics services to understand how our website is used, which may collect anonymous data about your visit, such as pages viewed and time spent on the site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">How We Use Your Information</h2>
            <p>
              We use the information we collect in various ways, including to:
            </p>
            <ul className="list-disc pl-6">
              <li>Provide, operate, and maintain our website</li>
              <li>Improve, personalize, and expand our website</li>
              <li>Communicate with you to provide updates and other information relating to the website</li>
              <li>Find and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Security</h2>
            <p>
              The security of your personal information is important to us, but remember that no method of transmission over the Internet, or method of electronic storage, is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us through our contact page.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;