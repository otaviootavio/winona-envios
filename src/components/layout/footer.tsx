export function Footer() {
    return (
      <footer className="w-full border-t bg-background flex flex-col items-center">
        <div className="flex h-14 items-center justify-between">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Winona Envios. All rights reserved.
          </p>
        </div>
      </footer>
    );
  }