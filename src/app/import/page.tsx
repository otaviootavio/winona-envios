import { auth } from "~/server/auth";
import { CSVImportFlow } from '~/app/_components/csv-import/CSVImportFlow';

export default async function ImportPage() {
  await auth();

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Import Orders</h1>
        <p className="text-muted-foreground">
          Upload and validate your orders data
        </p>
      </div>
      
      <CSVImportFlow />
    </main>
  );
}