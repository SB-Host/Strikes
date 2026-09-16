import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { SettingsForm } from "@/components/settings-form";
import { SectionTitle } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.must_change_pin) redirect("/me/pin");
  if (user.role !== "OWNER") redirect("/me");

  const settings = await getSettings();

  return (
    <Shell user={user} groupName={settings.group_name} active="admin">
      <SectionTitle note="only you can change these">How the board works</SectionTitle>
      <SettingsForm settings={settings} />
    </Shell>
  );
}
