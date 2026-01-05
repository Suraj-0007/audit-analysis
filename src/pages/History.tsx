import { AppLayout } from '@/components/layout/AppLayout';
import { ComingSoonHistory } from '@/components/ComingSoonHistory';

export default function History() {
  return (
    <AppLayout>
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Audit History</h1>
            <p className="text-muted-foreground mt-1">
              Track and compare your past audits
            </p>
          </div>

          <ComingSoonHistory />
        </div>
      </div>
    </AppLayout>
  );
}
