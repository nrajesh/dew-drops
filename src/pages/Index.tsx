import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center gap-6">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
          Welcome to My Creative Space
        </h1>
        <p className="max-w-[700px] text-muted-foreground md:text-xl">
          <!--A curated collection of my professional work, personal projects, and travels. Explore my blog, watch my videos, and get in touch.-->
        </p>
      </div>
      <div className="flex gap-4">
        <Button asChild>
          <Link to="/blog">Explore My Work</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link to="/contact">Contact Me</Link>
        </Button>
      </div>
    </div>
  );
};

export default Index;