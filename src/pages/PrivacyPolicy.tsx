import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
          <CardDescription>
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none space-y-4">
          <section>
            <h2 className="text-xl font-semibold">Introduction</h2>
            <p>
              Welcome to my Privacy Policy. Your privacy is critically important
              to me. It is my policy to respect your privacy regarding any
              information I may collect from you across my website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Information I Collect</h2>
            <p>
              I only ask for personal information when I truly need it to
              provide a service to you. I collect it by fair and lawful means,
              with your knowledge and consent. I also let you know why I’m
              collecting it and how it will be used.
            </p>
            <p>
              For example, when you use my contact form, I collect your name and
              email address so that I can reply to your message. I also use
              analytics services to understand how my website is used, which may
              collect anonymous data about your visit, such as pages viewed and
              time spent on the site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              How I Use Your Information
            </h2>
            <p>
              I use the information I collect in various ways, including to:
            </p>
            <ul className="list-disc pl-6">
              <li>Provide, operate, and maintain my website</li>
              <li>Improve, personalize, and expand my website</li>
              <li>
                Communicate with you to provide updates and other information
                relating to the website
              </li>
              <li>Find and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Security</h2>
            <p>
              The security of your personal information is important to me, but
              remember that no method of transmission over the Internet, or
              method of electronic storage, is 100% secure. While I strive to
              use commercially acceptable means to protect your personal
              information, I cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Contact Me</h2>
            <p>
              If you have any questions about this Privacy Policy, please
              contact me through my contact page.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;
