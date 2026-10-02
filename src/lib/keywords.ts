// 区切りは半角・全角スペースと「,」「，」「、」。"Nunu Hara" のように引用符で囲んだ部分は、
// スペースを含んだまま 1 つの言葉にする（スマホが自動で変える “ ” も同じ扱い）。
// 閉じていない引用符は区切りとして読み飛ばす
const NAME_TOKEN = /["“”]([^"“”]*)["“”]|[^ \u3000,，、"“”]+/g;

// 大文字小文字と前後の空白を無視して重複を除く（最初に出たものを残す）
export function uniqueCaseless(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const lower = value.trim().toLowerCase();
    if (!lower || seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

// 今ある言葉の後ろに足す。X の検索は大文字小文字を区別しないので、「ABC」のあとの「abc」は同じ言葉として足さない
export function appendCaseless(values: string[], tokens: string[]): string[] {
  const next = [...values];
  for (const token of tokens) {
    if (!next.some((item) => item.toLowerCase() === token.toLowerCase())) next.push(token);
  }
  return next;
}

export function splitSearchNames(raw: string): string[] {
  const normalized = raw.normalize("NFC");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of normalized.matchAll(NAME_TOKEN)) {
    // 囲んだ中の空白は、半角スペース 1 つにそろえる
    const token = (match[1] ?? match[0]).trim().replace(/[ \u3000]+/g, " ");
    if (!token) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}
