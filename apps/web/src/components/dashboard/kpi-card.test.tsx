// =============================================================================
// KPI Card Component Tests
// =============================================================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/utils";
import { KPICard, KPIGrid } from "./kpi-card";
import { TrendingUp, TrendingDown } from "lucide-react";

describe("KPICard", () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  it("renders title and value correctly", () => {
    render(
      <KPICard
        title="Revenue"
        value="$50,000"
        icon={TrendingUp}
      />
    );

    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("$50,000")).toBeInTheDocument();
  });

  it("renders with subtitle", () => {
    render(
      <KPICard
        title="Revenue"
        value="$50,000"
        subtitle="Monthly total"
        icon={TrendingUp}
      />
    );

    expect(screen.getByText("Monthly total")).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANGE INDICATOR
  // ═══════════════════════════════════════════════════════════════════════════

  it("shows positive change correctly", () => {
    render(
      <KPICard
        title="Revenue"
        value="$50,000"
        change={12.5}
        changeType="positive"
        icon={TrendingUp}
      />
    );

    expect(screen.getByText("+12.5%")).toBeInTheDocument();
  });

  it("shows negative change correctly", () => {
    render(
      <KPICard
        title="Revenue"
        value="$50,000"
        change={-8.3}
        changeType="negative"
        icon={TrendingDown}
      />
    );

    expect(screen.getByText("-8.3%")).toBeInTheDocument();
  });

  it("shows neutral change correctly", () => {
    render(
      <KPICard
        title="Revenue"
        value="$50,000"
        change={0}
        changeType="neutral"
        icon={TrendingUp}
      />
    );

    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPARKLINE
  // ═══════════════════════════════════════════════════════════════════════════

  it("renders sparkline when data is provided", () => {
    const sparklineData = [
      { value: 100 },
      { value: 120 },
      { value: 115 },
      { value: 140 },
      { value: 135 },
    ];

    const { container } = render(
      <KPICard
        title="Revenue"
        value="$50,000"
        icon={TrendingUp}
        sparklineData={sparklineData}
      />
    );

    // Recharts renders SVG elements
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIANTS
  // ═══════════════════════════════════════════════════════════════════════════

  it("renders different accent colors", () => {
    const colors = ["cyan", "purple", "green", "gold", "red"] as const;

    colors.forEach((color) => {
      const { unmount } = render(
        <KPICard
          title="Test"
          value="100"
          icon={TrendingUp}
          accentColor={color}
        />
      );

      expect(screen.getByText("Test")).toBeInTheDocument();
      unmount();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  it("renders loading state", () => {
    render(
      <KPICard
        title="Revenue"
        value="$50,000"
        icon={TrendingUp}
        loading
      />
    );

    // Should show skeleton instead of value
    expect(screen.queryByText("$50,000")).not.toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM CLASS
  // ═══════════════════════════════════════════════════════════════════════════

  it("applies custom className", () => {
    const { container } = render(
      <KPICard
        title="Test"
        value="100"
        icon={TrendingUp}
        className="custom-class"
      />
    );

    const card = container.firstChild;
    expect(card).toHaveClass("custom-class");
  });
});

describe("KPIGrid", () => {
  it("renders children in a grid layout", () => {
    const { container } = render(
      <KPIGrid>
        <KPICard title="KPI 1" value="100" icon={TrendingUp} />
        <KPICard title="KPI 2" value="200" icon={TrendingUp} />
        <KPICard title="KPI 3" value="300" icon={TrendingUp} />
      </KPIGrid>
    );

    expect(screen.getByText("KPI 1")).toBeInTheDocument();
    expect(screen.getByText("KPI 2")).toBeInTheDocument();
    expect(screen.getByText("KPI 3")).toBeInTheDocument();

    // Check grid layout
    const grid = container.firstChild;
    expect(grid).toHaveClass("grid");
  });

  it("renders correct number of columns", () => {
    const { container } = render(
      <KPIGrid cols={3}>
        <KPICard title="KPI 1" value="100" icon={TrendingUp} />
        <KPICard title="KPI 2" value="200" icon={TrendingUp} />
        <KPICard title="KPI 3" value="300" icon={TrendingUp} />
      </KPIGrid>
    );

    const grid = container.firstChild;
    expect(grid).toHaveClass("lg:grid-cols-3");
  });
});
