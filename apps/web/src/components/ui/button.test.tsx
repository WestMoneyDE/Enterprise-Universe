// =============================================================================
// Button Component Tests
// =============================================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/utils";
import { Button } from "./button";

describe("Button", () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  it("renders with default variant", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it("renders all variant styles correctly", () => {
    const variants = [
      "default",
      "destructive",
      "outline",
      "secondary",
      "ghost",
      "link",
      "cyan",
      "purple",
      "green",
    ] as const;

    variants.forEach((variant) => {
      const { unmount } = render(<Button variant={variant}>Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      unmount();
    });
  });

  it("renders all size variations", () => {
    const sizes = ["default", "sm", "lg", "icon"] as const;

    sizes.forEach((size) => {
      const { unmount } = render(<Button size={size}>Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      unmount();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTIVITY
  // ═══════════════════════════════════════════════════════════════════════════

  it("handles click events", async () => {
    const handleClick = vi.fn();
    const { user } = render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not trigger click when disabled", async () => {
    const handleClick = vi.fn();
    const { user } = render(
      <Button onClick={handleClick} disabled>
        Click me
      </Button>
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  it("shows loading state correctly", () => {
    render(<Button loading>Loading</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-loading", "true");
  });

  it("does not trigger click when loading", async () => {
    const handleClick = vi.fn();
    const { user } = render(
      <Button onClick={handleClick} loading>
        Loading
      </Button>
    );

    await user.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AS CHILD (SLOT)
  // ═══════════════════════════════════════════════════════════════════════════

  it("renders as child element when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );

    const link = screen.getByRole("link", { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESSIBILITY
  // ═══════════════════════════════════════════════════════════════════════════

  it("has correct role", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("supports aria-label", () => {
    render(<Button aria-label="Custom label">Icon</Button>);

    const button = screen.getByRole("button", { name: /custom label/i });
    expect(button).toBeInTheDocument();
  });

  it("supports aria-disabled when disabled", () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM CLASSES
  // ═══════════════════════════════════════════════════════════════════════════

  it("applies custom className", () => {
    render(<Button className="custom-class">Button</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });
});
