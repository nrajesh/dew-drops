import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const LazyBackground = lazy(() => import("@/components/LazyBackground"));

const Index = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center gap-6">
      <Suspense fallback={<Skeleton className="h-16 w-3/4 mb-6" />}>
        <LazyBackground />
      </Suspense>
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
          Welcome to My Creative Space
        </h1>
        <p className="max-w-[700px] text-muted-foreground md:text-xl">
          A curated collection of professional work, personal projects and travels of Rajesh Narayanan. Explore my portfolio, get to know a bit about my creative work, and get in touch.
        </p>
      </div>
      <div className="flex gap-4">
        <Button asChild>
          <Link to="/portfolio">My Portfolio</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link to="/contact">Contact Me</Link>
        </Button>
      </div>
    </div>
  );
};

export default Index;