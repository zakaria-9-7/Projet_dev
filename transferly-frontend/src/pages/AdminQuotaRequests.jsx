import AppLayout from '../components/AppLayout';

export default function AdminQuotaRequests() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-12 text-center text-slate-400 dark:text-slate-500">
        <p className="text-lg font-medium">Demandes de quota</p>
        <p className="text-sm mt-2">Aucune demande en attente.</p>
      </div>
    </AppLayout>
  );
}
