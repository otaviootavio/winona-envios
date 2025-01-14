import { CorreiosSecretForm } from '~/app/_components/correios/CorreiosSecretForm';

export default function CorreiosSettingsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Configurações Correios</h1>
        <CorreiosSecretForm />
      </div>
    </div>
  );
}
