import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DatePicker } from "../DatePicker";

describe("DatePicker date math", () => {
  it("displays a formatted date for a given ISO value without an off-by-one day shift", () => {
    // Regression guard: parsing "2026-03-15" via `new Date("2026-03-15")` would
    // be UTC midnight and can render as the 14th in negative-offset timezones —
    // the component must parse y/m/d components directly instead.
    render(<DatePicker value="2026-03-15" onChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: /2026|mar/i });
    expect(trigger.textContent).toMatch(/15/);
  });

  it("shows a placeholder when there is no value", () => {
    render(<DatePicker value="" onChange={vi.fn()} placeholder="Pick a date" />);
    expect(screen.getByText("Pick a date")).toBeInTheDocument();
  });

  it("opens the calendar and emits an ISO date on day click", () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-06-01" onChange={onChange} id="my-date" />);
    fireEvent.click(screen.getByRole("button", { name: /jun/i }));
    const dayButtons = screen.getAllByRole("button", { name: "15" });
    fireEvent.click(dayButtons[0]!);
    expect(onChange).toHaveBeenCalledWith("2026-06-15");
  });

  it("clears the value via the Clear button", () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-06-01" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /jun/i }));
    fireEvent.click(screen.getByText("Clear"));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("forwards the id prop to the focusable trigger for label association", () => {
    render(<DatePicker value="" onChange={vi.fn()} id="hire-date" />);
    expect(document.getElementById("hire-date")).toBeInTheDocument();
  });
});
