// Radix の TabsTrigger がマウスを押した時点でタブを切り替えるかどうか（@radix-ui/react-tabs の onMouseDown と同じ条件）。
// 左ボタンで、ctrl を押していないときだけ切り替える（右クリックや Mac の ctrl + クリックはメニューを出すだけ）
export function switchesTabOnMouseDown(event: { button: number; ctrlKey: boolean }): boolean {
  return event.button === 0 && !event.ctrlKey;
}
