import type { Metadata } from "next";
import { PersonalShell } from "@/components/personal/shell";

export const metadata: Metadata = { title: "Personal" };

export default function PersonalLayout({ children }: { children: React.ReactNode }) {
  return <PersonalShell>{children}</PersonalShell>;
}
