import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const videos = [
  {
    title: "Building a Portfolio with React & Dyad",
    youtubeId: "dQw4w9WgXcQ",
  },
  {
    title: "Exploring the Swiss Alps",
    youtubeId: "z_m4_vY_q-M",
  },
  {
    title: "A Guide to Sourdough Baking",
    youtubeId: "bSYdABrP_44",
  },
];

const Videos = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Videos</h1>
        <p className="text-muted-foreground">A collection of my favorite videos.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {videos.map((video) => (
          <Card key={video.youtubeId}>
            <CardHeader>
              <CardTitle>{video.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <AspectRatio ratio={16 / 9}>
                <iframe
                  className="rounded-lg"
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${video.youtubeId}`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </AspectRatio>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Videos;