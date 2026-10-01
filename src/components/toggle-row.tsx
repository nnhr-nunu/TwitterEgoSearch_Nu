"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// 文言を左、スイッチを右に置く 1 行のオン・オフ
export function ToggleRow({
  id,
  label,
  checked,
  onCheckedChange,
  testId,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        data-testid={testId}
      />
    </div>
  );
}
