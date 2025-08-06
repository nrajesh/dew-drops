import { useTravel } from "@/contexts/TravelContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

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
          Click on a card to see the location on Google Maps! For now, here's a list of places I've been.
        </p>
      </div>

      {locations.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <a
              key={location.id}
              href={createGoogleMapsUrl(location.city, location.country)}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
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
            </a>
          ))}
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