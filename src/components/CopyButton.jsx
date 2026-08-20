"use client";

import { useState } from "react";

export default function CopyButton({ value, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  const getCopyValue = () => {
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value, null, 2);
    }

    return String(value ?? "");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getCopyValue());
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1200);
    } catch (error) {
      console.error("Copy failed:", error);
      alert("Copy failed. Please copy manually.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
    >
      {copied ? "Copied" : label}
    </button>
  );
}