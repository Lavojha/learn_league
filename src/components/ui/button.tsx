import type { ButtonHTMLAttributes } from "react";

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`rounded-xl bg-violet-500 px-4 py-2.5 font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />;
}
