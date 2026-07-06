import { useEffect, useRef } from 'react';

/**
 * ダイアログをブラウザの「戻る」操作で閉じられるようにするフック。
 * 開いたときに履歴エントリを1つ積み、戻る（popstate）で onClose を呼ぶ。
 * バツボタン等の戻る以外の操作で閉じた場合は、積んだ履歴を
 * history.back() で消費して履歴の整合を保つ。
 */
export function useDialogHistory(open: boolean, onClose: () => void) {
  // onClose の参照が変わるたびに effect が再実行されないよう ref 経由で呼ぶ
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    let closedByPopState = false;
    window.history.pushState({ dialog: true }, '');

    const handlePopState = () => {
      closedByPopState = true;
      onCloseRef.current();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (!closedByPopState) {
        window.history.back();
      }
    };
  }, [open]);
}
