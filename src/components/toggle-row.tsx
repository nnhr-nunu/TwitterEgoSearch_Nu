"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// 文言を左、スイッチを右に置く 1 行のオン・オフ。help があれば文言の下に小さく添える
export function ToggleRow({
  id,
  label,
  help,
  checked,
  onCheckedChange,
  testId,
}: {
  id: string;
  label: string;
  help?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  testId: string;
}) {
  const helpId = help ? `${id}-help` : undefined;
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0 space-y-1">
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {label}
        </Label>
        {help ? (
          <p id={helpId} className="text-xs text-muted-foreground">
            {help}
          </p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        aria-describedby={helpId}
        data-testid={testId}
      />
    </div>
  );
}
