import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFeatureToggles } from "@/contexts/FeatureToggleContext";
import { Skeleton } from "@/components/ui/skeleton";
import { navFeatures } from "@/config/navigation";

const featureDescriptions: Record<string, { title: string; description: string }> = {
  [navFeatures.HOME]: { title: "Home Page", description: "The main landing page of your portfolio." },
  [navFeatures.BLOG]: { title: "Blog", description: "Your public blog section." },
  [navFeatures.GALLERY]: { title: "Gallery", description: "Your public photo gallery." },
  [navFeatures.TRAVEL]: { title: "Travel Map", description: "The interactive map of your travels." },
  [navFeatures.CHATBOT]: { title: "AI Chatbot", description: "The floating chatbot widget." },
  [navFeatures.MANAGE_BLOG]: { title: "Manage Blog", description: "The management page for blog posts." },
  [navFeatures.MANAGE_GALLERY]: { title: "Manage Gallery", description: "The management page for the photo gallery." },
  [navFeatures.MANAGE_TRAVEL]: { title: "Manage Travel", description: "The management page for the travel map." },
  [navFeatures.FEATURE_TOGGLES]: { title: "Feature Toggles", description: "This management page itself." },
};

const FeatureToggles = () => {
  const { toggles, loading, updateToggle } = useFeatureToggles();

  const orderedFeatures = Object.values(navFeatures).filter(
    key => key !== navFeatures.HOME && key !== navFeatures.FEATURE_TOGGLES
  );

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Feature Toggles</CardTitle>
        <CardDescription>
          Enable or disable modules across your portfolio. Changes are saved automatically. The Home page is a core feature and cannot be disabled.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>
            ))
          ) : (
            orderedFeatures.map(key => (
              <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor={key} className="text-base font-medium">
                    {featureDescriptions[key]?.title || key}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {featureDescriptions[key]?.description || "Manage this feature's visibility."}
                  </p>
                </div>
                <Switch
                  id={key}
                  checked={toggles[key] ?? true}
                  onCheckedChange={(checked) => updateToggle(key, checked)}
                  aria-label={`Toggle ${featureDescriptions[key]?.title}`}
                />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureToggles;