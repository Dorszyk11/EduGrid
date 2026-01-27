'use client';

import Link from 'next/link';

interface Alert {
  typ: 'error' | 'warning' | 'info';
  kategoria: string;
  tytul: string;
  opis: string;
  link?: string;
  priorytet: number;
}

interface AlertyListaProps {
  alerty: Alert[];
  statystyki: {
    lacznie: number;
    bledy: number;
    ostrzezenia: number;
    informacje: number;
  };
}

export default function AlertyLista({ alerty, statystyki }: AlertyListaProps) {
  if (alerty.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-2xl mr-2">✅</span>
          <div>
            <h3 className="font-semibold text-green-800">Brak alertów</h3>
            <p className="text-sm text-green-700">Wszystko wygląda dobrze!</p>
          </div>
        </div>
      </div>
    );
  }

  const getIkona = (typ: string) => {
    switch (typ) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📌';
    }
  };

  const getKolor = (typ: string) => {
    switch (typ) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Statystyki */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold">{statystyki.lacznie}</div>
          <div className="text-sm text-gray-600">Łącznie</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{statystyki.bledy}</div>
          <div className="text-sm text-gray-600">Błędy</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{statystyki.ostrzezenia}</div>
          <div className="text-sm text-gray-600">Ostrzeżenia</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{statystyki.informacje}</div>
          <div className="text-sm text-gray-600">Informacje</div>
        </div>
      </div>

      {/* Lista alertów */}
      <div className="space-y-3">
        {alerty.map((alert, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 ${getKolor(alert.typ)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className="text-xl mr-2">{getIkona(alert.typ)}</span>
                  <h3 className="font-semibold">{alert.tytul}</h3>
                </div>
                <p className="text-sm mb-2">{alert.opis}</p>
                {alert.link && (
                  <Link
                    href={alert.link}
                    className="text-sm underline hover:no-underline"
                  >
                    Zobacz szczegóły →
                  </Link>
                )}
              </div>
              <span className="text-xs text-gray-500 ml-4">
                Priorytet: {alert.priorytet}/10
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
