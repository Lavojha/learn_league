export function Avatar({ name, src }: { name: string; src?: string | null }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
  return src ? <img src={src} alt={name} className="h-10 w-10 rounded-full object-cover" /> : <div aria-label={name} className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold text-violet-300">{initials}</div>;
}
