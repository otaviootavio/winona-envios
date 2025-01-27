import PersonalTeamCard from "~/app/_components/team/PersonalTeamCard";
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";

export default async function PersonalTeamPage() {
  const session = await auth();

  // Redirect if not authenticated
  if (!session?.user) {
    redirect("/signin?callbackUrl=/teams/personal");
  }

  // Correct server component query
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Personal Team</h1>
      <PersonalTeamCard />
    </div>
  );
}
