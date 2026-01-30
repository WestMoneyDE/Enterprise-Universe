"use client";

import * as React from "react";
import {
  useForm,
  UseFormReturn,
  FieldValues,
  SubmitHandler,
  UseFormProps,
  Path,
  Controller,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZodSchema } from "zod";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@radix-ui/react-label";

// ═══════════════════════════════════════════════════════════════════════════════
// FORM SYSTEM - React Hook Form + Zod integration
// ═══════════════════════════════════════════════════════════════════════════════

// Form Context
type FormContextValue<T extends FieldValues> = UseFormReturn<T>;

const FormContext = React.createContext<FormContextValue<FieldValues> | null>(null);

function useFormContext<T extends FieldValues>() {
  const context = React.useContext(FormContext) as FormContextValue<T> | null;
  if (!context) {
    throw new Error("useFormContext must be used within a Form");
  }
  return context;
}

// Form Root
interface FormProps<T extends FieldValues>
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "children"> {
  schema: ZodSchema<T>;
  onSubmit: SubmitHandler<T>;
  defaultValues?: UseFormProps<T>["defaultValues"];
  children: React.ReactNode | ((form: UseFormReturn<T>) => React.ReactNode);
}

function Form<T extends FieldValues>({
  schema,
  onSubmit,
  defaultValues,
  children,
  className,
  ...props
}: FormProps<T>) {
  const form = useForm<T>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues,
  });

  return (
    <FormContext.Provider value={form as unknown as FormContextValue<FieldValues>}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("space-y-6", className)}
        {...props}
      >
        {typeof children === "function" ? children(form) : children}
      </form>
    </FormContext.Provider>
  );
}

// Form Field
interface FormFieldProps<T extends FieldValues> {
  name: Path<T>;
  label?: string;
  description?: string;
  children: React.ReactNode | ((field: { value: T[Path<T>]; onChange: (value: T[Path<T>]) => void; error?: string }) => React.ReactNode);
}

function FormField<T extends FieldValues>({
  name,
  label,
  description,
  children,
}: FormFieldProps<T>) {
  const form = useFormContext<T>();
  const error = form.formState.errors[name]?.message as string | undefined;

  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field }) => (
        <div className="space-y-2">
          {label && (
            <Label
              htmlFor={name}
              className="text-sm font-medium text-gray-200"
            >
              {label}
            </Label>
          )}
          {typeof children === "function"
            ? children({ value: field.value, onChange: field.onChange, error })
            : children}
          {description && !error && (
            <p className="text-xs text-gray-500">{description}</p>
          )}
          {error && <p className="text-xs text-neon-red">{error}</p>}
        </div>
      )}
    />
  );
}

// Form Input (simplified)
interface FormInputProps<T extends FieldValues> {
  name: Path<T>;
  label?: string;
  description?: string;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  variant?: "default" | "cyber";
}

function FormInput<T extends FieldValues>({
  name,
  label,
  description,
  placeholder,
  type = "text",
  variant = "cyber",
}: FormInputProps<T>) {
  const form = useFormContext<T>();
  const { register, formState } = form;
  const error = formState.errors[name]?.message as string | undefined;

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={name} className="text-sm font-medium text-gray-200">
          {label}
        </Label>
      )}
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        variant={variant}
        error={error}
        {...register(name)}
      />
      {description && !error && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}

// Form Textarea
interface FormTextareaProps<T extends FieldValues> {
  name: Path<T>;
  label?: string;
  description?: string;
  placeholder?: string;
  rows?: number;
}

function FormTextarea<T extends FieldValues>({
  name,
  label,
  description,
  placeholder,
  rows = 4,
}: FormTextareaProps<T>) {
  const form = useFormContext<T>();
  const { register, formState } = form;
  const error = formState.errors[name]?.message as string | undefined;

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={name} className="text-sm font-medium text-gray-200">
          {label}
        </Label>
      )}
      <textarea
        id={name}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm transition-colors",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-neon-red text-neon-red focus-visible:ring-neon-red"
            : "border-neon-cyan/50 bg-void-surface/50 text-neon-cyan focus-visible:ring-neon-cyan focus-visible:border-neon-cyan placeholder:text-neon-cyan/30"
        )}
        {...register(name)}
      />
      {description && !error && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
      {error && <p className="text-xs text-neon-red">{error}</p>}
    </div>
  );
}

// Form Submit
interface FormSubmitProps {
  children?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  variant?: "default" | "cyan" | "purple" | "green";
}

function FormSubmit({
  children = "Speichern",
  loading,
  disabled,
  variant = "cyan",
}: FormSubmitProps) {
  const form = useFormContext();
  const { formState } = form;

  return (
    <Button
      type="submit"
      variant={variant}
      loading={loading || formState.isSubmitting}
      disabled={disabled || formState.isSubmitting}
    >
      {children}
    </Button>
  );
}

// Form Actions (footer with buttons)
interface FormActionsProps {
  children: React.ReactNode;
  align?: "left" | "right" | "center" | "between";
}

function FormActions({ children, align = "right" }: FormActionsProps) {
  const alignmentClasses = {
    left: "justify-start",
    right: "justify-end",
    center: "justify-center",
    between: "justify-between",
  };

  return (
    <div className={cn("flex items-center gap-3 pt-4", alignmentClasses[align])}>
      {children}
    </div>
  );
}

export {
  Form,
  FormField,
  FormInput,
  FormTextarea,
  FormSubmit,
  FormActions,
  useFormContext,
};
