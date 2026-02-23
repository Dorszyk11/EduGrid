"use client";

import { useState, useEffect } from "react";
import { DataTable, Badge, Button } from "@/shared/ui";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employmentType: string;
  maxHours: number;
  qualifications: string[];
}

export default function NauczycielePage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/teachers")
      .then((r) => r.json())
      .then((data: Teacher[]) => setTeachers(data))
      .catch(() => setTeachers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Nauczyciele</h1>
        <Button variant="primary" onClick={() => {}}>
          Dodaj nauczyciela
        </Button>
      </div>

      <DataTable
        columns={[
          {
            key: "name",
            header: "Imię i nazwisko",
            render: (t: Teacher) => `${t.firstName} ${t.lastName}`,
          },
          { key: "email", header: "Email", render: (t: Teacher) => t.email },
          {
            key: "employmentType",
            header: "Etat",
            render: (t: Teacher) => (
              <Badge variant="info">{t.employmentType}</Badge>
            ),
          },
          {
            key: "maxHours",
            header: "Maks. godziny",
            render: (t: Teacher) => String(t.maxHours),
          },
          {
            key: "qualifications",
            header: "Kwalifikacje",
            render: (t: Teacher) => (
              <div className="flex flex-wrap gap-1">
                {t.qualifications.slice(0, 3).map((q, i) => (
                  <Badge key={i} variant="default">
                    {q}
                  </Badge>
                ))}
                {t.qualifications.length > 3 && (
                  <Badge variant="default">
                    +{t.qualifications.length - 3}
                  </Badge>
                )}
              </div>
            ),
          },
        ]}
        data={teachers}
        keyExtractor={(t: Teacher) => t.id}
        loading={loading}
        emptyMessage="Brak nauczycieli w systemie."
      />
    </div>
  );
}
