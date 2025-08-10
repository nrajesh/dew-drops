import React, { Suspense, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { TravelLocation } from "@/types";
import { showError } from "@/utils/toast";
import { Button } from "@/components/ui/button";

const Map = React.lazy(() => import('@/components/Map'));

const Travel = () => {
  const [locations, setLocations] = useState<TravelLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedLocation, setFocusedLocation] = useState<TravelLocation | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("travel_locations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        showError("Could not fetch travel locations.");
        console.error(error);
      } else {
        setLocations(data as TravelLocation[]);
      }
      setLoading(false);
    };

    fetchLocations();
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Travel Map</h1>
        <p className="text-muted-foreground">
          Explore my travels on the map below, or click a card to learn more.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-[450px] w-full rounded-lg" />}>
        <Map locations={locations} focusedLocation={focusedLocation} />
      </Suspense>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : locations.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => {
            const hasBlogUrl = location.blog_url && location.blog_url.trim() !== '';
            const isInternalLink = hasBlogUrl && location.blog_url!.startsWith('/');
            
            return (
              <Card 
                key={location.id}
                onClick={() => setFocusedLocation(location)}
                className="h-full flex flex-col transition-all hover:shadow-md hover:border-primary/50 cursor-pointer"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    {location.title}
                  </CardTitle>
                  <CardDescription>{location.name}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground text-sm">Click to view on map.</p>
                </CardContent>
                {hasBlogUrl && (
                  <CardFooter>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-sm"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isInternalLink ? (
                        <Link to={location.blog_url!}>
                          Read Blog Post
                        </Link>
                      ) : (
                        <a href={location.blog_url!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                          Visit Website <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </Button>
                  </CardFooter>
                )}
              </Card>
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