"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-STEP WIZARD - Step-by-step form navigation
// ═══════════════════════════════════════════════════════════════════════════════

interface Step {
  id: string;
  title: string;
  description?: string;
}

interface MultiStepWizardProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
  children: React.ReactNode[];
  onComplete?: () => void;
  allowStepClick?: boolean;
  className?: string;
}

export function MultiStepWizard({
  steps,
  currentStep,
  onStepChange,
  children,
  onComplete,
  allowStepClick = false,
  className,
}: MultiStepWizardProps) {
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete?.();
    } else {
      onStepChange(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      onStepChange(currentStep - 1);
    }
  };

  const handleStepClick = (index: number) => {
    if (allowStepClick && index < currentStep) {
      onStepChange(index);
    }
  };

  return (
    <div className={cn("space-y-8", className)}>
      {/* Step Indicator */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-0 top-5 h-0.5 w-full bg-neon-cyan/20">
          <div
            className="h-full bg-neon-cyan transition-all duration-500"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isClickable = allowStepClick && index < currentStep;

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  "flex flex-col items-center",
                  isClickable && "cursor-pointer"
                )}
              >
                {/* Circle */}
                <div
                  className={cn(
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                    isCompleted &&
                      "border-neon-cyan bg-neon-cyan text-void-dark",
                    isCurrent &&
                      "border-neon-cyan bg-void-surface text-neon-cyan shadow-neon-cyan",
                    !isCompleted &&
                      !isCurrent &&
                      "border-neon-cyan/30 bg-void-surface text-gray-500"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Label */}
                <div className="mt-3 text-center">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isCurrent ? "text-neon-cyan" : "text-gray-400"
                    )}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="mt-0.5 text-xs text-gray-500 max-w-[120px]">
                      {step.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[300px]">{children[currentStep]}</div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-neon-cyan/10 pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={handlePrev}
          disabled={isFirstStep}
          className={cn(isFirstStep && "invisible")}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>

        <Button type="button" variant="cyan" onClick={handleNext}>
          {isLastStep ? "Abschließen" : "Weiter"}
          {!isLastStep && <ChevronRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

// Hook for wizard state management
export function useMultiStepWizard(totalSteps: number) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<number[]>([]);

  const goToStep = (step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setCompletedSteps([]);
  };

  return {
    currentStep,
    completedSteps,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === totalSteps - 1,
    goToStep,
    nextStep,
    prevStep,
    reset,
    setCurrentStep,
  };
}
