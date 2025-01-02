export function Footer() {
    return (
      <footer className="w-full border-t bg-background">
        <div className="container flex h-14 items-center justify-between py-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Winona Envios. All rights reserved.
          </p>
        </div>
      </footer>
    );
  }