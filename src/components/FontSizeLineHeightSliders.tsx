import * as React from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useFontSettings } from "@/contexts/FontSettingsContext";

export const FontSizeLineHeightSliders: React.FC = () => {
  const { settings, updateSettings } = useFontSettings();

  const handleFontSizeChange = (value: number[]) => {
    updateSettings({ fontSize: value[0] });
  };

  const handleLineHeightChange = (value: number[]) => {
    updateSettings({ lineHeight: value[0] });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="font-size-slider" className="text-sm">Font Size ({settings.fontSize.toFixed(1)}rem)</Label>
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
        <Label htmlFor="line-height-slider" className="text-sm">Line Spacing ({settings.lineHeight.toFixed(1)})</Label>
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
    </div>
  );
};