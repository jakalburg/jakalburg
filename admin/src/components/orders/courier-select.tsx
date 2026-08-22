"use client";

import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COURIER_PROVIDERS } from "@/lib/tracking-utils";

interface CourierSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function CourierSelect({
  value,
  onValueChange,
  disabled,
}: CourierSelectProps) {
  const availableCouriers = COURIER_PROVIDERS;

  useEffect(() => {
    if (availableCouriers.length > 0 && !value) {
      onValueChange(availableCouriers[0].value);
    }
  }, [availableCouriers, value, onValueChange]);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full min-h-[40px]">
        <SelectValue placeholder="Select courier" />
      </SelectTrigger>
      <SelectContent>
        {availableCouriers.map((courier) => (
          <SelectItem key={courier.value} value={courier.value}>
            {courier.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
