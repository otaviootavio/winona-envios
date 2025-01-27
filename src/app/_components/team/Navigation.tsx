"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";
import { buttonVariants } from "~/components/ui/button";

export function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: "/teams/personal", label: "Personal Team" },
    { href: "/teams/managed", label: "Managed Teams" },
    { href: "/teams/memberships", label: "Memberships" },
  ];

  return (
    <nav className="flex space-x-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            pathname === link.href
              ? "bg-muted hover:bg-muted"
              : "hover:bg-transparent hover:underline",
            "justify-start",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
