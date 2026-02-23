"use client";

import { useState, useEffect } from "react";
import { DataTable, Badge, Button } from "@/shared/ui";

interface SchoolClass {
  id: string;
  name: string;
  schoolYear: string;
  schoolTypeName: string;
  professionName?: string;
}

export default function KlasyPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/classes")
      .then((r) => r.json())
      .then((data: SchoolClass[]) => setClasses(data))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Klasy</h1>
        <Button variant="primary" onClick={() => {}}>
          Dodaj klasę
        </Button>
      </div>

      <DataTable
        columns={[
          { key: "name", header: "Nazwa", render: (c: SchoolClass) => c.name },
          {
            key: "schoolYear",
            header: "Rok szkolny",
            render: (c: SchoolClass) => c.schoolYear,
          },
          {
            key: "schoolType",
            header: "Typ szkoły",
            render: (c: SchoolClass) => (
              <Badge variant="info">{c.schoolTypeName}</Badge>
            ),
          },
          {
            key: "profession",
            header: "Zawód",
            render: (c: SchoolClass) => c.professionName ?? "–",
          },
        ]}
        data={classes}
        keyExtractor={(c: SchoolClass) => c.id}
        loading={loading}
        emptyMessage="Brak klas w systemie."
      />
    </div>
  );
}
