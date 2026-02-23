import { Skeleton } from "@/shared/ui";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Panel główny</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Nauczyciele"
          description="Łączna liczba aktywnych nauczycieli"
          href="/nauczyciele"
        />
        <SummaryCard
          title="Klasy"
          description="Liczba klas w bieżącym roku szkolnym"
          href="/klasy"
        />
        <SummaryCard
          title="Przydział"
          description="Status przydziału godzin"
          href="/przydzial"
        />
        <SummaryCard
          title="Zgodność MEiN"
          description="Wskaźnik zgodności z planem ramowym"
          href="/raporty"
        />
      </div>

      {/* Quick access */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Szybki dostęp
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <QuickLink
            href="/przydzial"
            label="Przydział godzin"
            description="Zarządzaj godzinami do wyboru, dyrektorskimi i rozszerzeniami"
          />
          <QuickLink
            href="/nauczyciele"
            label="Nauczyciele"
            description="Przeglądaj i zarządzaj danymi nauczycieli"
          />
          <QuickLink
            href="/raporty"
            label="Raporty"
            description="Generuj raporty zgodności i obciążenia"
          />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
    >
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <Skeleton className="h-8 w-16 mt-2" />
      <p className="text-xs text-gray-400 mt-2">{description}</p>
    </a>
  );
}

function QuickLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors"
    >
      <div>
        <p className="font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </a>
  );
}
