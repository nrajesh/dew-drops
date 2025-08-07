import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { TravelLocation } from '@/contexts/TravelContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface MapProps {
  locations: TravelLocation[];
}

const Map: React.FC<MapProps> = ({ locations }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!MAPBOX_ACCESS_TOKEN) {
      console.error("Mapbox access token is not set.");
      return;
    }

    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [10, 45], // Default center
      zoom: 1.5,
    });

    map.current.on('load', () => {
      locations.forEach(location => {
        if (location.latitude && location.longitude) {
          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-1"><h3 class="font-bold text-base">${location.city}</h3><p class="text-sm">${location.description}</p></div>`
          );

          new mapboxgl.Marker()
            .setLngLat([location.longitude, location.latitude])
            .setPopup(popup)
            .addTo(map.current!);
        }
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [locations]);

  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Mapbox Configuration Error</AlertTitle>
        <AlertDescription>
          The Mapbox access token is missing. Please create a <code>.env.local</code> file and add: <code>VITE_MAPBOX_ACCESS_TOKEN=your_token_here</code>. Then, restart the application.
        </AlertDescription>
      </Alert>
    );
  }

  return <div ref={mapContainer} className="h-[450px] w-full rounded-lg border" />;
};

export default Map;