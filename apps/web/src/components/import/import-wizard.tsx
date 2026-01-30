"use client";

import { useState, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HoloCard, NeonButton } from "@/components/scifi";
import { useImport, EntityType } from "@/hooks/use-import";
import UploadStep from "./upload-step";
import MappingStep from "./mapping-step";
import PreviewStep from "./preview-step";
import ImportStep from "./import-step";

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORT WIZARD - Multi-step CSV/Excel Data Import
// SciFi themed wizard with Upload -> Map -> Preview -> Import steps
// ═══════════════════════════════════════════════════════════════════════════════

export type WizardStep = "upload" | "mapping" | "preview" | "import";

const STEPS: { id: WizardStep; label: string; icon: string; description: string }[] = [
  { id: "upload", label: "Upload", icon: "01", description: "Select your data file" },
  { id: "mapping", label: "Map Columns", icon: "02", description: "Match columns to fields" },
  { id: "preview", label: "Preview", icon: "03", description: "Review and validate" },
  { id: "import", label: "Import", icon: "04", description: "Process your data" },
];

export interface ImportWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
  defaultEntityType?: EntityType;
}

export function ImportWizard({
  onComplete,
  onCancel,
  defaultEntityType = "contact",
}: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("upload");
  const [state, actions] = useImport();

  // Initialize entity type
  if (state.entityType !== defaultEntityType && !state.file) {
    actions.setEntityType(defaultEntityType);
  }

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case "upload":
        return state.parsedData !== null && !state.parseError;
      case "mapping":
        // Must have at least one required field mapped
        const requiredMapped = state.mapping.some(
          (m) => m.targetField === "name" || m.targetField === "email" || m.targetField === "amount"
        );
        return requiredMapped;
      case "preview":
        return state.validationResults.length > 0 && state.validCount > 0;
      case "import":
        return state.importResult !== null;
      default:
        return false;
    }
  }, [currentStep, state]);

  const handleNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      // Trigger validation when moving to preview
      if (currentStep === "mapping") {
        actions.runValidation();
      }
      setCurrentStep(STEPS[nextIndex].id);
    }
  }, [currentStepIndex, currentStep, actions]);

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex]);

  const handleCancel = useCallback(() => {
    actions.reset();
    setCurrentStep("upload");
    onCancel?.();
  }, [actions, onCancel]);

  const handleDone = useCallback(() => {
    actions.reset();
    setCurrentStep("upload");
    onComplete?.();
  }, [actions, onComplete]);

  const handleStartImport = useCallback(
    (skipInvalid: boolean) => {
      actions.runImport(skipInvalid);
    },
    [actions]
  );

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {/* Step Content */}
      <HoloCard
        variant="cyan"
        glow={currentStep === "import" && state.isImporting}
        title={STEPS[currentStepIndex].label.toUpperCase()}
        subtitle={STEPS[currentStepIndex].description}
        icon={`[${STEPS[currentStepIndex].icon}]`}
      >
        <div className="min-h-[400px]">
          {currentStep === "upload" && (
            <UploadStep
              file={state.file}
              parsedData={state.parsedData}
              parseError={state.parseError}
              isParsing={state.isParsing}
              entityType={state.entityType}
              onFileSelect={actions.setFile}
              onEntityTypeChange={actions.setEntityType}
            />
          )}

          {currentStep === "mapping" && state.parsedData && (
            <MappingStep
              parsedData={state.parsedData}
              mapping={state.mapping}
              entityType={state.entityType}
              onUpdateMapping={actions.updateMapping}
              onResetMapping={actions.resetMapping}
            />
          )}

          {currentStep === "preview" && state.parsedData && (
            <PreviewStep
              parsedData={state.parsedData}
              mapping={state.mapping}
              validationResults={state.validationResults}
              validCount={state.validCount}
              invalidCount={state.invalidCount}
            />
          )}

          {currentStep === "import" && (
            <ImportStep
              isImporting={state.isImporting}
              importProgress={state.importProgress}
              importResult={state.importResult}
              validCount={state.validCount}
              invalidCount={state.invalidCount}
              onStartImport={handleStartImport}
              onDownloadErrors={actions.downloadErrors}
              onDone={handleDone}
            />
          )}
        </div>
      </HoloCard>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <NeonButton
          variant="ghost"
          onClick={handleCancel}
          disabled={state.isImporting}
        >
          Cancel
        </NeonButton>

        <div className="flex items-center gap-3">
          {currentStepIndex > 0 && currentStep !== "import" && (
            <NeonButton
              variant="outline"
              onClick={handleBack}
              disabled={state.isImporting}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              }
            >
              Back
            </NeonButton>
          )}

          {currentStep !== "import" && (
            <NeonButton
              variant="cyan"
              glow
              onClick={handleNext}
              disabled={!canGoNext() || state.isImporting}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              }
              iconPosition="right"
            >
              {currentStep === "preview" ? "Start Import" : "Next"}
            </NeonButton>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP INDICATOR - SciFi themed progress indicator
// ═══════════════════════════════════════════════════════════════════════════════

interface StepIndicatorProps {
  steps: typeof STEPS;
  currentStep: WizardStep;
}

function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="relative">
      {/* Background Line */}
      <div className="absolute top-6 left-0 right-0 h-0.5 bg-white/10" />

      {/* Progress Line */}
      <div
        className="absolute top-6 left-0 h-0.5 bg-gradient-to-r from-neon-cyan to-neon-purple transition-all duration-500"
        style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
      />

      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={step.id} className="flex flex-col items-center">
              {/* Step Circle */}
              <div
                className={cn(
                  "relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                  "bg-void-surface backdrop-blur-sm",
                  isCompleted && "border-neon-green bg-neon-green/10",
                  isCurrent && "border-neon-cyan bg-neon-cyan/20 shadow-neon-cyan",
                  isPending && "border-white/20"
                )}
              >
                {/* Step Number/Icon */}
                <span
                  className={cn(
                    "font-mono text-sm font-bold",
                    isCompleted && "text-neon-green",
                    isCurrent && "text-neon-cyan",
                    isPending && "text-white/30"
                  )}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.icon
                  )}
                </span>

                {/* Active Pulse */}
                {isCurrent && (
                  <div className="absolute inset-0 rounded-full border-2 border-neon-cyan animate-ping opacity-30" />
                )}

                {/* Corner Decorations */}
                <div className={cn(
                  "absolute -top-1 -left-1 w-2 h-2 border-l border-t",
                  isCompleted && "border-neon-green/50",
                  isCurrent && "border-neon-cyan",
                  isPending && "border-white/10"
                )} />
                <div className={cn(
                  "absolute -top-1 -right-1 w-2 h-2 border-r border-t",
                  isCompleted && "border-neon-green/50",
                  isCurrent && "border-neon-cyan",
                  isPending && "border-white/10"
                )} />
                <div className={cn(
                  "absolute -bottom-1 -left-1 w-2 h-2 border-l border-b",
                  isCompleted && "border-neon-green/50",
                  isCurrent && "border-neon-cyan",
                  isPending && "border-white/10"
                )} />
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-2 h-2 border-r border-b",
                  isCompleted && "border-neon-green/50",
                  isCurrent && "border-neon-cyan",
                  isPending && "border-white/10"
                )} />
              </div>

              {/* Step Label */}
              <div className="mt-3 text-center">
                <div
                  className={cn(
                    "text-xs font-display font-bold uppercase tracking-wider",
                    isCompleted && "text-neon-green",
                    isCurrent && "text-neon-cyan",
                    isPending && "text-white/30"
                  )}
                >
                  {step.label}
                </div>
                <div
                  className={cn(
                    "text-[10px] font-mono mt-0.5",
                    isCurrent ? "text-white/50" : "text-white/20"
                  )}
                >
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ImportWizard;
