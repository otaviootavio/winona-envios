import Link from "next/link";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";
import { RainbowButton } from "~/components/ui/rainbow-button";
import { InteractiveGridPattern } from "~/components/ui/interactive-grid-pattern";
import { cn } from "~/lib/utils";
import { FlickeringGrid } from "~/components/ui/flickering-grid";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <div className="relative flex h-full grow flex-col items-center justify-center rounded-lg border shadow-md">
        <div className="h- z-10 m-10 flex flex-col items-center justify-center gap-2 max-w-md">
          <p className="whitespace-pre-wrap text-center text-7xl font-medium tracking-tighter text-black dark:text-white">
            Batch Track
            Your Orders
          </p>
          <p className="flex flex-row text-center text-xl">
            We help e-commerce to track their orders and shipments with ease.
          </p>
          <div className="flex flex-row justify-center">
            {!session ? (
              <RainbowButton className="w-full sm:w-auto">
                <Link href="/api/auth/signin">Start Free Trial</Link>
              </RainbowButton>
            ) : (
              <RainbowButton className="w-full sm:w-auto">
                <Link href="/dashboard">Go to Dashboard</Link>
              </RainbowButton>
            )}
          </div>
        </div>
        <FlickeringGrid
          className="absolute inset-0 z-0 size-full"
          squareSize={4}
          gridGap={10}
          color="#6B7280"
          maxOpacity={0.2}
          flickerChance={0.4}
        />
      </div>
    </HydrateClient>
  );
}
