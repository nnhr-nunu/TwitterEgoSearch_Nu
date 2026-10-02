"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseHandleList, uniqueHandles } from "@/lib/handle";
import { appendCaseless } from "@/lib/keywords";

type ChipInputProps = {
  id: string;
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  addLabel: string;
  mode?: "text" | "handle";
  tokenize?: (raw: string) => string[];
  invalidMessage?: string;
  // 消すボタンの読み上げ（例:「{item} を削除」）。{item} が入れた言葉に置き換わる
  removeLabel?: string;
  testId?: string;
  // 打ちかけの文字が変わったとき（打った・追加して空になった・欄が外された）に呼ぶ
  onDraftChange?: (draft: string) => void;
};

export function ChipInput({
  id,
  label,
  placeholder,
  values,
  onChange,
  addLabel,
  mode = "text",
  tokenize,
  invalidMessage,
  removeLabel = "{item}",
  testId,
  onDraftChange,
}: ChipInputProps) {
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const items = mode === "handle" ? uniqueHandles(values) : values;

  // 欄が外されたとき（YouTube タブへ移ったときなど）に打ちかけが無くなったと伝えるので、最新の関数を持っておく
  const draftListener = useRef(onDraftChange);
  useEffect(() => {
    draftListener.current = onDraftChange;
  }, [onDraftChange]);
  useEffect(() => () => draftListener.current?.(""), []);

  function changeDraft(next: string) {
    setDraft(next);
    onDraftChange?.(next);
  }

  function add(raw = draft) {
    if (mode === "handle") {
      const next = parseHandleList(raw);
      if (next.length === 0) {
        setInvalid(raw.trim().length > 0);
        return;
      }
      setInvalid(false);
      onChange(uniqueHandles([...items, ...next]));
      changeDraft("");
      return;
    }
    const tokens = tokenize ? tokenize(raw) : [raw.trim()].filter(Boolean);
    if (tokens.length === 0) return;
    onChange(appendCaseless(items, tokens));
    changeDraft("");
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
            changeDraft(event.target.value);
            if (invalid) setInvalid(false);
          }}
          onKeyDown={(event) => {
            // 日本語入力の変換を確定する Enter では追加しない（Safari は isComposing が false で keyCode 229 になる）
            if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return;
            event.preventDefault();
            add();
          }}
          onBlur={(event) => {
            // 打っただけで「追加」を押さずに検索ボタンへ進んでも探せるよう、欄を離れたら追加する。
            // 別のタブやアプリへ移っただけのとき（書きかけ）は追加しない
            if (document.hasFocus()) add(event.currentTarget.value);
          }}
        />
        {/* 「＋」だけで足すと分かるので文字は出さず、入力欄の幅を広く取る（読み上げとツールチップには残す） */}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-10 shrink-0"
          aria-label={addLabel}
          title={addLabel}
          onClick={() => add()}
        >
          <PlusIcon className="size-5" />
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
              <li key={mode === "handle" ? item.toLowerCase() : item}>
                <Badge variant="secondary" className="h-7 gap-1 pr-1 text-sm">
                  <span className="max-w-48 truncate">{shown}</span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-foreground/10"
                    aria-label={removeLabel.replace("{item}", shown)}
                    title={removeLabel.replace("{item}", shown)}
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
