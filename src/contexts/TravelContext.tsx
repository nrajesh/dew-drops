import React, { createContext, useContext, useState, ReactNode } from 'react';
import * as z from 'zod';

// Schema for a single travel location
export const travelLocationSchema = z.object({
  id: z.string(),
  city: z.string().min(2, "City must be at least 2 characters."),
  country: z.string().min(2, "Country must be at least 2 characters."),
  dateVisited: z.string().optional(), // Using string for simplicity, can be a date
  description: z.string().min(10, "Description must be at least 10 characters.").max(500),
});

export type TravelLocation = z.infer<typeof travelLocationSchema>;

// Initial mock data
const initialTravelLocations: TravelLocation[] = [
  {
    id: '1',
    city: 'Kyoto',
    country: 'Japan',
    dateVisited: 'April 2023',
    description: 'Visited during the cherry blossom season. Absolutely breathtaking scenery and historic temples.',
  },
  {
    id: '2',
    city: 'Rome',
    country: 'Italy',
    dateVisited: 'June 2022',
    description: 'Explored the Colosseum, Roman Forum, and ate way too much pasta. A city steeped in history.',
  },
];

// Context type
interface TravelContextType {
  locations: TravelLocation[];
  addLocation: (location: Omit<TravelLocation, 'id'>) => void;
  updateLocation: (location: TravelLocation) => void;
  deleteLocation: (id: string) => void;
}

const TravelContext = createContext<TravelContextType | undefined>(undefined);

// Provider component
export const TravelProvider = ({ children }: { children: ReactNode }) => {
  const [locations, setLocations] = useState<TravelLocation[]>(initialTravelLocations);

  const addLocation = (location: Omit<TravelLocation, 'id'>) => {
    const newLocation = { ...location, id: String(Date.now()) };
    setLocations(prev => [...prev, newLocation]);
  };

  const updateLocation = (updatedLocation: TravelLocation) => {
    setLocations(prev => prev.map(loc => loc.id === updatedLocation.id ? updatedLocation : loc));
  };

  const deleteLocation = (id: string) => {
    setLocations(prev => prev.filter(loc => loc.id !== id));
  };

  return (
    <TravelContext.Provider value={{ locations, addLocation, updateLocation, deleteLocation }}>
      {children}
    </TravelContext.Provider>
  );
};

// Custom hook to use the context
export const useTravel = () => {
  const context = useContext(TravelContext);
  if (context === undefined) {
    throw new Error('useTravel must be used within a TravelProvider');
  }
  return context;
};