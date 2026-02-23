export default function PlanyMeinPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Plany ramowe MEiN</h1>
      <p className="text-gray-500">
        Przeglądaj plany ramowe Ministerstwa Edukacji i Nauki. Tabele pokazują
        wymagane godziny dla każdego typu szkoły i cyklu.
      </p>
      {/* TODO: Read-only MeinPlanTable for each school type */}
    </div>
  );
}
