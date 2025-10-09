import React from 'react';
import { Progress } from "@/components/ui/progress";

interface AnalysisProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export const AnalysisProgressBar: React.FC<AnalysisProgressBarProps> = ({
  currentStep,
  totalSteps,
  stepLabels,
}) => {
  const progressValue = (currentStep / totalSteps) * 100;
  const currentLabel = stepLabels[currentStep - 1] || "Starting analysis...";

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground text-center">
        {currentLabel} ({currentStep}/{totalSteps})
      </p>
      <Progress value={progressValue} className="w-full" />
    </div>
  );
};