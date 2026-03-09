"use client";
import { useState, useCallback } from "react";

interface PinPadProps {
  onSubmit: (pin: string) => void;
  label?: string;
  error?: string | null;
  loading?: boolean;
}

export function PinPad({ onSubmit, label = "Enter PIN", error, loading }: PinPadProps) {
  const [pin, setPin] = useState("");

  const handleDigit = useCallback((digit: string) => {
    setPin((prev) => {
      const next = prev + digit;
      if (next.length === 6) {
        setTimeout(() => onSubmit(next), 150);
      }
      return next.length <= 6 ? next : prev;
    });
  }, [onSubmit]);

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => setPin(""), []);

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">{label}</h2>
        <div className="flex gap-3 justify-center">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                i < pin.length
                  ? "bg-blue-500 border-blue-500 scale-110"
                  : "border-gray-500 bg-transparent"
              }`}
            />
          ))}
        </div>
        {error && (
          <p className="text-red-400 text-sm mt-3 animate-shake">{error}</p>
        )}
        {loading && (
          <p className="text-blue-400 text-sm mt-3">Decrypting vault...</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-[280px]">
        {digits.map((d, i) => {
          if (d === "") return <div key={i} />;
          if (d === "⌫") {
            return (
              <button
                key={i}
                onClick={handleDelete}
                onDoubleClick={handleClear}
                className="w-20 h-16 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-white text-xl font-medium transition-all duration-150 active:scale-95"
              >
                ⌫
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handleDigit(d)}
              disabled={pin.length >= 6 || loading}
              className="w-20 h-16 rounded-2xl bg-white/10 hover:bg-white/15 active:bg-blue-500/50 text-white text-2xl font-medium transition-all duration-150 active:scale-95 disabled:opacity-50"
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
