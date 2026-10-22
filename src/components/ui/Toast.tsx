'use client';
export default function Toast({ message, visible }: { message: string; visible: boolean }) {
  return <div id="toast" className={visible ? 'show' : ''}>{message}</div>;
}
