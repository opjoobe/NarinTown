'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessagePayload } from '@narintown/shared/events';

interface Props {
  messages: ChatMessagePayload[];
  onSend: (text: string) => void;
  connected: boolean;
}

function timeOf(t: number): string {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ChatPanel({ messages, onSend, connected }: Props) {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !connected) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <aside className="flex h-[640px] w-full flex-col overflow-hidden rounded-xl border border-narin-ink/10 bg-white shadow-sm lg:w-80">
      <header className="flex items-center justify-between border-b border-narin-ink/10 bg-narin-paper px-3 py-2">
        <span className="text-xs font-semibold opacity-70">💬 채팅</span>
        <span
          className={`text-xs ${connected ? 'text-narin-green' : 'text-narin-ink/40'}`}
          title={connected ? 'connected' : 'disconnected'}
        >
          ● {connected ? 'live' : 'offline'}
        </span>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 text-sm">
        {messages.length === 0 ? (
          <p className="text-xs opacity-40">아직 메시지가 없습니다. 인사해보세요 👋</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {messages.map((m, i) => (
              <li key={`${m.t}-${m.from}-${i}`} className="leading-snug">
                <span className="mr-1 text-[10px] opacity-40">{timeOf(m.t)}</span>
                <span className="font-semibold">{m.fromNickname}</span>
                <span className="opacity-50"> · </span>
                <span>{m.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={submit}
        className="flex gap-2 border-t border-narin-ink/10 bg-narin-paper p-2"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="모두에게 보내기"
          maxLength={200}
          className="flex-1 rounded-md border border-narin-ink/20 bg-white px-2 py-1 text-sm"
          disabled={!connected}
        />
        <button
          type="submit"
          disabled={!connected || !text.trim()}
          className="rounded-md bg-narin-green px-3 py-1 text-sm font-semibold text-white disabled:opacity-40"
        >
          전송
        </button>
      </form>
    </aside>
  );
}
