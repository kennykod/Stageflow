import type { Metadata } from "next";
import { ControlShell } from "@/components/control/shell";

export const metadata: Metadata = { title: "Control" };

export default function ControlLayout({ children }: { children: React.ReactNode }) {
  return <ControlShell>{children}</ControlShell>;
}
