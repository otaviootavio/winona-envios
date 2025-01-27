import Link from "next/link";
import { auth } from "~/server/auth";
import { Button } from "~/components/ui/button";

export async function Header() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between p-10">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">Winona Envios</span>
        </Link>

        <div className="flex items-center gap-4">
          {session ? (
            <>
              <Button asChild variant="ghost">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/teams/personal">Teams</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/api/auth/signout">Sign out</Link>
              </Button>
            </>
          ) : (
            <Button asChild variant="secondary">
              <Link href="/api/auth/signin">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
