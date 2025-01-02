import Link from "next/link";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";
import { Button } from "~/components/ui/button";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col bg-background">
        {/* Hero Section */}
        <div className="relative bg-primary">
          <div className="container mx-auto px-4 py-12 md:py-16 lg:py-20">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-3xl font-bold text-primary-foreground md:text-4xl lg:text-6xl">
                Accurate Order Tracking Management
              </h1>
              <p className="mt-4 max-w-2xl text-base text-primary-foreground/90 md:mt-6 md:text-lg lg:text-xl">
                Stop losing time with manual shipping status verification. Automatically sync and validate your Nuvemshop orders with real-time tracking data.
              </p>
              <div className="mt-6 flex flex-col gap-4 sm:flex-row md:mt-8">
                {!session ? (
                  <Button
                    asChild
                    variant="secondary"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <Link href="/api/auth/signin">
                      Start Free Trial
                    </Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    variant="secondary"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <Link href="/dashboard">
                      Go to Dashboard
                    </Link>
                  </Button>
                )}
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full border-secondary bg-transparent text-secondary hover:bg-secondary/10 sm:w-auto"
                >
                  <Link href="#features">
                    Learn More
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="container mx-auto px-4 py-12 md:py-16 lg:py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Why Choose Our Platform?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Streamline your order management and save time with our powerful features
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:mt-12 md:gap-8 lg:grid-cols-3">
            {/* Feature cards would go here */}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-primary">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-2xl font-bold text-primary-foreground md:text-3xl">
                Ready to streamline your order management?
              </h2>
              <p className="mt-4 text-base text-primary-foreground/90 md:text-lg">
                Join hundreds of e-commerce businesses saving time with our platform
              </p>
              {!session ? (
                <Button
                  asChild
                  variant="secondary"
                  size="lg"
                  className="mt-6 w-full sm:w-auto md:mt-8"
                >
                  <Link href="/api/auth/signin">
                    Start Free Trial
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  variant="secondary"
                  size="lg"
                  className="mt-6 w-full sm:w-auto md:mt-8"
                >
                  <Link href="/dashboard">
                    Go to Dashboard
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}