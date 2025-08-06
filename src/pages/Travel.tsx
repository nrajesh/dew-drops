const Travel = () => {
  return (
    <div className="space-y-6 text-center">
      <h1 className="text-3xl font-bold">Travel Map</h1>
      <p className="text-muted-foreground">
        An interactive map of my travels is coming soon!
      </p>
      <div className="p-4 border rounded-lg bg-muted">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/3/3b/World_Map_1689.jpg"
          alt="Vintage world map"
          className="rounded-md mx-auto max-w-full h-auto"
        />
        <p className="text-sm text-muted-foreground mt-2">A placeholder map for now.</p>
      </div>
    </div>
  );
};

export default Travel;