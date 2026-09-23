"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseHandleList, uniqueHandles } from "@/lib/handle";

type ChipInputProps = {
  id: string;
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  addLabel: string;
  savedToast: string;
  mode?: "text" | "handle";
  tokenize?: (raw: string) => string[];
  invalidMessage?: string;
  testId?: string;
};

export function ChipInput({
  id,
  label,
  placeholder,
  values,
  onChange,
  addLabel,
  savedToast,
  mode = "text",
  tokenize,
  invalidMessage,
  testId,
}: ChipInputProps) {
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const items = mode === "handle" ? uniqueHandles(values) : values;

  function add() {
    if (mode === "handle") {
      const next = parseHandleList(draft);
      if (next.length === 0) {
        setInvalid(draft.trim().length > 0);
        return;
      }
      setInvalid(false);
      onChange(uniqueHandles([...items, ...next]));
      setDraft("");
      toast.success(savedToast);
      return;
    }
    const tokens = tokenize ? tokenize(draft) : [draft.trim()].filter(Boolean);
    if (tokens.length === 0) return;
    const next = [...items];
    for (const token of tokens) {
      if (!next.includes(token)) next.push(token);
    }
    onChange(next);
    setDraft("");
    toast.success(savedToast);
  }

  return (
    <div className="space-y-3">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          className="h-10 text-base md:text-sm"
          autoComplete="off"
          spellCheck={false}
          data-testid={testId ? `${testId}-input` : undefined}
          onChange={(event) => {
            setDraft(event.target.value);
            if (invalid) setInvalid(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" className="h-10 shrink-0" onClick={add}>
          {addLabel}
        </Button>
      </div>
      {invalid && invalidMessage ? (
        <p className="text-sm text-destructive" data-testid={testId ? `${testId}-invalid` : undefined}>
          {invalidMessage}
        </p>
      ) : null}
      {items.length === 0 ? null : (
        <ul className="flex flex-wrap gap-2" data-testid={testId ? `${testId}-list` : undefined}>
          {items.map((item) => {
            const shown = mode === "handle" ? `@${item}` : item;
            return (
              <li key={item.toLowerCase()}>
                <Badge variant="secondary" className="h-7 gap-1 pr-1 text-sm">
                  <span className="max-w-48 truncate">{shown}</span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-foreground/10"
                    aria-label={`${shown}`}
                    data-testid={testId ? `remove-${testId}` : undefined}
                    onClick={() =>
                      onChange(
                        items.filter((entry) =>
                          mode === "handle"
                            ? entry.toLowerCase() !== item.toLowerCase()
                            : entry !== item,
                        ),
                      )
                    }
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
