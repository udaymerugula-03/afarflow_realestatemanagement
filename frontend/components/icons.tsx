import type { CSSProperties } from "react";

type IconName = "arrow" | "search" | "location" | "home" | "building" | "land" | "office" | "bed" | "bath" | "area" | "shield" | "message" | "check" | "key" | "chevron";
const paths: Record<IconName, React.ReactNode> = {
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
  location: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  home: <><path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8" /></>,
  building: <><path d="M5 21V3h14v18M3 21h18M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1M10 21v-3h4v3" /></>,
  land: <><path d="m3 17 9-5 9 5-9 5-9-5Zm0-5 9-5 9 5M3 7l9-5 9 5" /></>,
  office: <><path d="M3 21h18M5 21V7l7-4v18M12 9h7v12M8 9v1m0 4v1m7-2h1m-1 4h1" /></>,
  bed: <><path d="M3 18V7m18 11V9M3 15h18M3 11h18v7M6 11V7h5v4m2 0V7h5v4" /></>,
  bath: <><path d="M3 12h18M5 12V5a2 2 0 0 1 4 0v1M3 12l1 5a4 4 0 0 0 4 3h8a4 4 0 0 0 4-3l1-5M7 20v2m10-2v2" /></>,
  area: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m8 16 8-8M8 12v4h4m0-8h4v4" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" /><path d="m8 12 3 3 5-6" /></>,
  message: <><path d="M21 11a8 8 0 0 1-8 8H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v4Z" /><path d="M7 8h10M7 12h7" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  key: <><circle cx="8" cy="8" r="5" /><path d="m12 12 9 9m-3-3 3-3m-6 0 3-3" /></>,
  chevron: <path d="m9 5 7 7-7 7" />,
};

export function Icon({ name, size = 20, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className} style={style}>{paths[name]}</svg>;
}
