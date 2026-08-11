import { redirect } from "next/navigation";
import { getSessionAccount } from "@/lib/session";
import AppShell from "@/components/AppShell";
import ServiceDown from "@/components/ServiceDown";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  let account: Awaited<ReturnType<typeof getSessionAccount>>;
  try {
    account = await getSessionAccount();
  } catch {
    // An unreachable database must not render as a blank platform-level 500.
    return <ServiceDown />;
  }
  if (!account) redirect("/login");

  return <AppShell account={{ name: account.name, email: account.email }}>{children}</AppShell>;
}
