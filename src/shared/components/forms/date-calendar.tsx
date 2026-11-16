"use client";
import { Calendar } from "@heroui/react";
import type { DateValue } from "@internationalized/date";
import { useState } from "react";

/** Shared day/year navigation for application date fields. Bounds belong to the field. */
export function DateCalendar({
  label,
  minValue,
  maxValue,
}: {
  label: string;
  minValue?: DateValue;
  maxValue?: DateValue;
}) {
  const [years, setYears] = useState(false);
  return (
    <Calendar
      aria-label={label}
      minValue={minValue}
      maxValue={maxValue}
      isYearPickerOpen={years}
      onYearPickerOpenChange={setYears}
    >
      <Calendar.Header>
        <Calendar.YearPickerTrigger>
          <Calendar.YearPickerTriggerHeading />
          <Calendar.YearPickerTriggerIndicator />
        </Calendar.YearPickerTrigger>
        <Calendar.NavButton slot="previous" />
        <Calendar.NavButton slot="next" />
      </Calendar.Header>
      <Calendar.Grid className={years ? "hidden" : undefined}>
        <Calendar.GridHeader>
          {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
        </Calendar.GridHeader>
        <Calendar.GridBody>
          {(date) => <Calendar.Cell date={date} />}
        </Calendar.GridBody>
      </Calendar.Grid>
      <Calendar.YearPickerGrid>
        <Calendar.YearPickerGridBody>
          {({ year }) => <Calendar.YearPickerCell year={year} />}
        </Calendar.YearPickerGridBody>
      </Calendar.YearPickerGrid>
    </Calendar>
  );
}
