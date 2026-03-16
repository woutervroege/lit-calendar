import type { Meta, StoryObj } from "@storybook/web-components-vite";
import "./Dropdown.js";
import type { DropdownOption } from "./Dropdown.js";

const defaultOptions: DropdownOption[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

const meta: Meta = {
  title: "Shared/Dropdown",
  component: "lc-dropdown",
  tags: ["autodocs"],
  argTypes: {
    options: { control: "object" },
    value: { control: "text" },
    name: { control: "text" },
    placeholder: { control: "text" },
    disabled: { control: "boolean" },
  },
  args: {
    options: defaultOptions,
    value: defaultOptions[2].value,
    placeholder: "Select a range",
    disabled: false,
  },
  render: (args) => {
    const el = document.createElement("lc-dropdown") as HTMLElement & {
      options: DropdownOption[];
      value: string;
      name: string;
      placeholder: string;
      disabled: boolean;
    };

    el.options = args.options ?? defaultOptions;
    el.value = args.value ?? "";
    el.name = args.name ?? "";
    el.placeholder = args.placeholder ?? "Select an option";
    el.disabled = args.disabled ?? false;
    return el;
  },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};

export const Placeholder: Story = {
  args: {
    value: "",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
