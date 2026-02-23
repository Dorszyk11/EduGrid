export default function RaportyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Raporty</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ReportCard
          title="Zgodność z MEiN"
          description="Porównanie przydziału godzin z planami ramowymi Ministerstwa"
          href="/raporty/mein"
        />
        <ReportCard
          title="Obciążenie nauczycieli"
          description="Analiza wykorzystania godzin etatu nauczycieli"
          href="/raporty/obciazenie"
        />
        <ReportCard
          title="Braki kadrowe"
          description="Przedmioty i klasy bez przypisanego nauczyciela"
          href="/raporty/braki"
        />
        <ReportCard
          title="Realizacja godzin"
          description="Porównanie planu z realizacją w bieżącym roku"
          href="/raporty/realizacja"
        />
        <ReportCard
          title="Wskaźnik ryzyka"
          description="Wielowymiarowa ocena ryzyka organizacyjnego"
          href="/raporty/ryzyko"
        />
        <ReportCard
          title="Eksport XLS"
          description="Pobierz dane do arkusza kalkulacyjnego"
          href="/raporty/eksport"
        />
      </div>
    </div>
  );
}

function ReportCard({
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
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </a>
  );
}
