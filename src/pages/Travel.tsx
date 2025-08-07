import React, { Suspense } from "react";
import { useTravel } from "@/contexts/TravelContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const Map = React.lazy(() => import('@/components/Map'));

const Travel = () => {
  const { locations } = useTravel();

  const createGoogleMapsUrl = (city: string, country: string) => {
    const query = encodeURIComponent(`${city}, ${country}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Travel Map</h1>
        <p className="text-muted-foreground">
          Explore my travels on the map below, or click a card to learn more.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-[450px] w-full rounded-lg" />}>
        <Map locations={locations} />
      </Suspense>

      {locations.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => {
            const hasBlogUrl = location.blogUrl && location.blogUrl.trim() !== '';
            const isInternalLink = hasBlogUrl && location.blogUrl!.startsWith('/');
            
            const card = (
              <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    {location.city}, {location.country}
                  </CardTitle>
                  <CardDescription>{location.dateVisited}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{location.description}</p>
                </CardContent>
              </Card>
            );

            if (isInternalLink) {
              return (
                <Link key={location.id} to={location.blogUrl!} className="block">
                  {card}
                </Link>
              );
            }

            const href = hasBlogUrl ? location.blogUrl! : createGoogleMapsUrl(location.city, location.country);

            return (
              <a
                key={location.id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {card}
              </a>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 border rounded-lg bg-muted">
          <p className="text-muted-foreground">No travel locations have been added yet.</p>
          <p className="text-sm text-muted-foreground mt-2">Go to "Manage Travel" to add your first pin!</p>
        </div>
      )}
    </div>
  );
};

export default Travel;