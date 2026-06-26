import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

export function DashboardLoadingSkeleton() {
  return (
    <div className="bg-background min-h-screen">
      <div className="border-border fixed inset-y-0 left-0 hidden w-[260px] border-r bg-white p-5 lg:block">
        <Skeleton className="h-10 w-36" />
        <div className="mt-10 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton className="h-10 w-full" key={index} />
          ))}
        </div>
      </div>
      <div className="lg:pl-[260px]">
        <div className="border-border h-[72px] border-b px-5 py-4">
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="mx-auto max-w-[1440px] p-5 lg:p-8">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="mt-3 h-10 w-full max-w-lg" />
          <Skeleton className="mt-3 h-5 w-full max-w-xl" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card className="p-5" key={index}>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-8 h-8 w-20" />
                <Skeleton className="mt-3 h-3 w-32" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
