
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, DropdownOptions } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants, Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"
import { ScrollArea } from "./scroll-area"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  presets?: {
    label: string
    range: { from: Date; to?: Date }
  }[]
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  onSelect,
  selected,
  presets,
  ...props
}: CalendarProps) {
  const handleSelect = (range: any, selectedDay: Date, activeModifiers: any, e: any) => {
    if (onSelect) {
      onSelect(range, selectedDay, activeModifiers, e)
    }
  }

  const handlePresetSelect = (presetRange: { from: Date; to?: Date }) => {
    if (onSelect) {
      // The `onSelect` for range mode expects a specific signature.
      // We pass `undefined` for other arguments as they are not relevant for preset selection.
      onSelect(presetRange, undefined as any, {} as any, undefined as any)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row">
      {presets && (
        <div className="flex flex-col items-start border-r border-border pr-4 mr-4 mb-4 sm:mb-0">
          <p className="text-sm font-medium text-muted-foreground px-2 py-1.5">Usados recentemente</p>
          {presets.map(({ label, range }) => (
            <Button
              key={label}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handlePresetSelect(range)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-3", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          caption_dropdowns: "flex justify-center gap-1",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        onSelect={handleSelect}
        selected={selected}
        components={{
          IconLeft: ({ className, ...props }) => (
            <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
          ),
          IconRight: ({ className, ...props }) => (
            <ChevronRight className={cn("h-4 w-4", className)} {...props} />
          ),
          Dropdown: (options: DropdownOptions) => {
            const { fromDate, toDate, fromMonth, toMonth, fromYear, toYear } = options;
            const { name, value } = options.props;

            const selectItems =
              name === "months"
                ? Array.from({ length: 12 }, (_, i) => ({
                    value: i.toString(),
                    label:
                      options.props.locale?.localize?.month(i, {
                        width: "long",
                      }) || "",
                  }))
                : Array.from(
                    { length: toYear - fromYear + 1 },
                    (_, i) => ({
                      value: (fromYear + i).toString(),
                      label: (fromYear + i).toString(),
                    })
                  );

            return (
              <Select
                onValueChange={(newValue) => {
                  const newDate = new Date(options.currentMonth);
                  if (name === "months") {
                    newDate.setMonth(parseInt(newValue));
                  } else {
                    newDate.setFullYear(parseInt(newValue));
                  }
                  options.onChange?.(newDate);
                }}
                value={String(value)}
              >
                <SelectTrigger className="w-[50%] h-auto p-0 border-none shadow-none focus:ring-0 text-sm font-medium">
                  <SelectValue>{
                    name === "months"
                      ? options.props.locale?.localize?.month(value as number, {
                          width: "long",
                        })
                      : value
                  }</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className={name === 'years' ? 'h-80' : ''}>
                    {selectItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            );
          },
        }}
        {...props}
      />
    </div>
  );
}
Calendar.displayName = "Calendar"

export { Calendar }

    
