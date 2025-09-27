import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useFontSettings } from "@/contexts/FontSettingsContext";

export const FontSettingsControl: React.FC = () => {
  const { settings, updateSettings } = useFontSettings();

  const handleFontSizeChange = (value: number[]) => {
    updateSettings({ fontSize: value[0] });
  };

  const handleLineHeightChange = (value: number[]) => {
    updateSettings({ lineHeight: value[0] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Text Readability</CardTitle>
        <CardDescription>
          Adjust the base font size and line spacing for better readability across the site.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="font-size-slider">Font Size ({settings.fontSize.toFixed(1)}rem)</Label>
          <Slider
            id="font-size-slider"
            min={0.8}
            max={1.2}
            step={0.1}
            value={[settings.fontSize]}
            onValueChange={handleFontSizeChange}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="line-height-slider">Line Spacing ({settings.lineHeight.toFixed(1)})</Label>
          <Slider
            id="line-height-slider"
            min={1.2}
            max={1.8}
            step={0.1}
            value={[settings.lineHeight]}
            onValueChange={handleLineHeightChange}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
};