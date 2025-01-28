import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex grow flex-col items-center">
      <div>
        <h2 className="text-xl font-bold">Error 404</h2>
        <p>Could not find the page you are looking for.</p>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
