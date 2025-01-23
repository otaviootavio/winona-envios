import { auth } from "~/server/auth";
import { TeamManagementContent } from "../_components/team/TeamManagementPage";

export default async function TeamManagementPage() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return <TeamManagementContent session={session} />;
}
