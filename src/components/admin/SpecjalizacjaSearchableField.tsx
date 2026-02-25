"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useConfig, useField } from "@payloadcms/ui";
import * as qs from "qs-esm";
import type { RelationshipFieldClientComponent } from "payload";
import { FieldDescription, FieldLabel } from "@payloadcms/ui";

type Przedmiot = { id: number | string; nazwa: string };

export const SpecjalizacjaSearchableField: RelationshipFieldClientComponent = (
  props
) => {
  const { path, admin } = props;
  const { value, setValue, showError } = useField<number[] | { value: number }[]>({
    path: path || "przedmioty",
  });
  const { config } = useConfig();
  const { api } = config.routes;

  const [search, setSearch] = useState("");
  const [przedmioty, setPrzedmioty] = useState<Przedmiot[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedIds = Array.isArray(value)
    ? value.map((v) => (typeof v === "object" && v && "value" in v ? v.value : v))
    : [];

  const fetchPrzedmioty = useCallback(
    async (searchTerm: string) => {
      setLoading(true);
      try {
        const where: Record<string, unknown> = {
          aktywny: { equals: true },
        };
        if (searchTerm.trim()) {
          where.nazwa = { like: `%${searchTerm.trim()}%` };
        }
        const query = qs.stringify({
          where,
          limit: 100,
          sort: "nazwa",
          depth: 0,
          draft: "true",
          select: { nazwa: true },
        });
        const url = `${api}/przedmioty?${query}`;
        const res = await fetch(url, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setPrzedmioty(data.docs || []);
        }
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  useEffect(() => {
    const t = setTimeout(() => fetchPrzedmioty(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchPrzedmioty]);

  const togglePrzedmiot = (id: number | string) => {
    const ids = new Set(selectedIds.map(Number));
    const numId = Number(id);
    if (ids.has(numId)) {
      ids.delete(numId);
    } else {
      ids.add(numId);
    }
    setValue(Array.from(ids));
  };

  return (
    <div className="field-type relationship">
      <FieldLabel field={props} />
      {admin?.description && (
        <FieldDescription description={admin.description} />
      )}
      <div
        className="relationship__wrap"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginTop: "8px",
        }}
      >
        <input
          type="text"
          placeholder="Szukaj przedmiotu (np. Matematyka, Polski)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "4px",
            border: "1px solid var(--theme-elevation-250, #ccc)",
            fontSize: "14px",
            maxWidth: "400px",
          }}
        />
        <div
          style={{
            maxHeight: "240px",
            overflowY: "auto",
            border: "1px solid var(--theme-elevation-250, #ddd)",
            borderRadius: "4px",
            padding: "8px",
            background: "var(--theme-elevation-50, #f9f9f9)",
          }}
        >
          {loading ? (
            <div style={{ padding: "12px", color: "var(--theme-elevation-500)" }}>
              Ładowanie…
            </div>
          ) : przedmioty.length === 0 ? (
            <div style={{ padding: "12px", color: "var(--theme-elevation-500)" }}>
              {search ? "Brak wyników" : "Wpisz, aby wyszukać przedmioty"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {przedmioty.map((p) => (
                <label
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    padding: "4px 0",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(Number(p.id))}
                    onChange={() => togglePrzedmiot(p.id)}
                  />
                  <span>{p.nazwa}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {selectedIds.length > 0 && (
          <small style={{ color: "var(--theme-elevation-500)" }}>
            Wybrano: {selectedIds.length} przedmiot(ów)
          </small>
        )}
      </div>
      {showError && (
        <div className="field-error" style={{ color: "var(--theme-error-500)" }}>
          {showError}
        </div>
      )}
    </div>
  );
};
