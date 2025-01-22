import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import TeamManagementPage from "../_components/team/TeamManagementPage";

export default async function TeamPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  return <TeamManagementPage user={session.user} />;
}
