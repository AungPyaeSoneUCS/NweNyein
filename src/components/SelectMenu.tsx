"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export default function SelectMenu({
  label,
  value,
  options,
  onChange,
  icon: Icon,
  className = "",
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  icon: LucideIcon;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(true);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const estimated = Math.min(options.length * 44 + 12, 240);
      setOpenUp(
        rect.top > estimated && rect.top > window.innerHeight - rect.bottom
      );
    }
    setOpen((current) => !current);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={`${label}: ${selected?.label || "Off"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-left transition hover:border-amber-200/40 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-saffron/50"
      >
        <Icon size={16} className="flex-none text-saffron-light" />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-ivory/55">
            {label}
          </span>
          <span className="block truncate text-xs font-semibold text-white">
            {selected?.label || "Off"}
          </span>
        </span>
        <ChevronDown
          size={15}
          className={`flex-none text-ivory/60 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className={`absolute left-0 z-[60] w-full min-w-[11rem] overflow-hidden rounded-2xl border border-white/15 bg-maroon/95 p-1.5 shadow-2xl backdrop-blur-xl ${
            openUp ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <div className="max-h-56 overflow-y-auto">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex min-h-[40px] w-full items-center gap-2 rounded-xl px-3 text-left text-xs transition ${
                    active
                      ? "bg-saffron/20 font-semibold text-saffron-light"
                      : "text-ivory/85 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {active && <Check size={14} className="flex-none" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
