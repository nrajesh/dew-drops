import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const blogPosts = [
  {
    title: "The Art of Web Development",
    description: "A deep dive into modern web development techniques and best practices.",
    date: "July 20, 2024",
  },
  {
    title: "My Journey with React",
    description: "Exploring the highs and lows of learning and mastering React.",
    date: "July 15, 2024",
  },
  {
    title: "Tailwind CSS: A Love Story",
    description: "Why I fell in love with utility-first CSS and how it changed my workflow.",
    date: "July 10, 2024",
  },
  {
    title: "Designing for Accessibility",
    description: "Tips and tricks for creating inclusive web experiences for everyone.",
    date: "July 5, 2024",
  },
];

const Blog = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Blog</h1>
        <p className="text-muted-foreground">My thoughts on design, development, and more.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {blogPosts.map((post, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>{post.title}</CardTitle>
              <CardDescription>{post.date}</CardDescription>
            </CardHeader>
            <CardContent>
              <p>{post.description}</p>
            </CardContent>
            <CardFooter>
              <Button variant="link" className="p-0">Read More</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Blog;