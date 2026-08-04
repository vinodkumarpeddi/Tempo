import { redirect } from "next/navigation";
import { getSessionAccount } from "@/lib/session";
import AppShell from "@/components/AppShell";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const account = await getSessionAccount();
  if (!account) redirect("/login");

  return <AppShell account={{ name: account.name, email: account.email }}>{children}</AppShell>;
}
