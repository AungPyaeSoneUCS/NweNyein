"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { extractDriveId } from "@/lib/driveUrls";
import { cn } from "@/lib/utils";
import DriveImagePicker from "./DriveImagePicker";

interface DriveCoverFieldProps {
  label?: string;
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Cover image field used by every admin form: choose a pre-uploaded Drive
 * photo, or (advanced) paste a Drive file id / share link.
 */
export default function DriveCoverField({
  label = "Cover Image",
  value,
  onChange,
  className,
}: DriveCoverFieldProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);

  return (
    <div className={cn("space-y-2", className)}>
      <DriveImagePicker label={label} value={extractDriveId(value)} onChange={onChange} />

      <button
        type="button"
        onClick={() => setShowLinkInput((open) => !open)}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-maroon"
      >
        <Link2 size={12} />
        {showLinkInput ? "Hide Drive link input" : "Or paste a Drive link"}
      </button>

      {showLinkInput && (
        <input
          className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
          placeholder="https://drive.google.com/file/d/FILE_ID/view"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => onChange(extractDriveId(value))}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (text) {
              event.preventDefault();
              onChange(extractDriveId(text));
            }
          }}
        />
      )}
    </div>
  );
}
