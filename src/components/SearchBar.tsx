"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
};

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-amber-100 px-0.5 text-maroon">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function SearchBar({
  value,
  onChange,
  suggestions = [],
  placeholder = "Search...",
  ariaLabel = "Search",
  className = "",
}: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const items = useMemo(() => {
    const pool = Array.from(new Set(suggestions.map((s) => s.trim()).filter(Boolean)));
    const q = value.trim().toLowerCase();
    if (!q) return pool.slice(0, 8);
    return pool.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [suggestions, value]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const select = (item: string) => {
    onChange(item);
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((i) => (items.length ? (i + 1) % items.length : -1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (open) setActive((i) => (items.length ? (i - 1 + items.length) % items.length : -1));
      return;
    }
    if (e.key === "Enter" && open && active >= 0 && items[active]) {
      e.preventDefault();
      select(items[active]);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="text"
        inputMode="search"
        autoComplete="off"
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open && items.length > 0}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        className="input pl-10 pr-10"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            setActive(-1);
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}

      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-amber-900/10 bg-white/95 py-1 shadow-xl backdrop-blur-xl"
        >
          {items.map((item, i) => (
            <li key={item} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(item);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors ${
                  i === active ? "bg-amber-50 text-maroon" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Search size={14} className="flex-none text-slate-400" />
                <span className="truncate">
                  <Highlight text={item} query={value} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
