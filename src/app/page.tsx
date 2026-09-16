import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { isLeader } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.must_change_pin) redirect("/me/pin");
  redirect(isLeader(user.role) ? "/board" : "/me");
}
