import { useEffect, useState } from "react";

const LazyBackground = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = "/background.jpg";
    img.onload = () => setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 -z-10 bg-cover bg-center opacity-10"
      style={{ backgroundImage: "url('/background.jpg')" }}
    />
  );
};

export default LazyBackground;
