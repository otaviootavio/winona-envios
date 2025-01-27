import { Navigation } from "../_components/team/Navigation";

export default function TeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <Navigation />
        {children}
      </div>
    </div>
  );
}
