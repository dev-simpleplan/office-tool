import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MultiSelect } from "../MultiSelect";

const options = [
  { id: "1", label: "Alice" },
  { id: "2", label: "Bob" },
  { id: "3", label: "Carol" },
];

describe("MultiSelect", () => {
  it("filters options by search query", () => {
    render(<MultiSelect options={options} selected={[]} onChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Search..."), { target: { value: "bo" } });
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("adds an id to the selection when an unchecked option is toggled", () => {
    const onChange = vi.fn();
    render(<MultiSelect options={options} selected={["1"]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Bob"));
    expect(onChange).toHaveBeenCalledWith(["1", "2"]);
  });

  it("removes an id from the selection when a checked option is toggled", () => {
    const onChange = vi.fn();
    render(<MultiSelect options={options} selected={["1", "2"]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Alice"));
    expect(onChange).toHaveBeenCalledWith(["2"]);
  });

  it("shows a selected count", () => {
    render(<MultiSelect options={options} selected={["1", "2"]} onChange={vi.fn()} />);
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });
});
