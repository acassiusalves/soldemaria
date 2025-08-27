import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 16.2A2.4 2.4 0 0 1 4.4 14h15.2a2.4 2.4 0 0 1 2.4 2.2c0 1.7-1.4 3.3-3.1 3.8-1.7.5-3.3.1-4.6-.9-.4-.3-1.2-1.2-1.2-1.2H8.5s-.8 1-1.2 1.2c-1.3 1-3 .9-4.7.4-1.7-.5-3.1-2-3.1-3.7 0-.7.3-1.4.8-1.8" />
      <path d="M16 14V3.5a1.5 1.5 0 0 0-1.5-1.5h-9A1.5 1.5 0 0 0 4 3.5V14" />
      <path d="M11 14V8" />
      <path d="M11 8H6.5" />
    </svg>
  );
}
