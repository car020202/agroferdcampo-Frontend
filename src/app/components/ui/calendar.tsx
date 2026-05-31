"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        caption: "flex justify-center pt-2 relative items-center w-full mb-2 h-10",
        caption_label: "text-sm font-medium capitalize", 
        caption_dropdowns: "flex justify-center items-center gap-2 font-semibold z-20",
        dropdown: "flex items-center",
        dropdown_month: "relative inline-flex items-center",
        dropdown_year: "relative inline-flex items-center",
        vhidden: "hidden",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-7 bg-transparent p-0 opacity-40 hover:opacity-100 transition-opacity",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex w-full",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-medium text-[0.7rem] flex-1 py-3 uppercase tracking-wider",
        row: "flex w-full mt-0.5",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-primary/10 [&:has([aria-selected].day-range-end)]:rounded-r-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 font-normal aria-selected:opacity-100 hover:bg-primary/10 hover:text-primary transition-colors",
        ),
        day_range_start:
          "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_range_end:
          "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-md shadow-primary/20",
        day_today: "bg-primary/10 text-primary font-bold border-b-2 border-primary",
        day_outside:
          "day-outside text-muted-foreground/50 aria-selected:text-muted-foreground/50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-primary/5 aria-selected:text-primary",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
        Dropdown: ({ value, onChange, children, ...props }: any) => {
          const options = React.Children.toArray(children) as React.ReactElement<
            React.ComponentProps<"option">
          >[];
          const selected = options.find((child) => child.props.value === value);
          const handleChange = (value: string) => {
            const changeEvent = {
              target: { value },
            } as React.ChangeEvent<HTMLSelectElement>;
            onChange?.(changeEvent);
          };
          return (
            <Select
              value={value?.toString()}
              onValueChange={(value) => {
                handleChange(value);
              }}
            >
              <SelectTrigger className="h-8 w-fit gap-1 border-none bg-transparent px-2 py-1 font-bold hover:bg-primary/10 focus:ring-0">
                <SelectValue>{selected?.props?.children}</SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-80">
                {options.map((option, id: number) => (
                  <SelectItem
                    key={`${option.props.value}-${id}`}
                    value={option.props.value?.toString() ?? ""}
                  >
                    {option.props.children}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      }}
      {...props}
    />
  );
}

export { Calendar };
