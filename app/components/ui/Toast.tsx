"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Same behaviour as toast() in the static main.js. */
export function useToast() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const show = useCallback((text: string) => {
    setMessage(text);
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 3200);
  }, []);

  const node = (
    <div className={`toast${visible ? " show" : ""}`} role="status">
      <span key={message}>{message}</span>
    </div>
  );

  return [show, node] as const;
}
