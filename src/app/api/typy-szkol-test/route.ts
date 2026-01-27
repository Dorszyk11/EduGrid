import { NextResponse } from 'next/server';

// Testowy endpoint - zwraca przykładowe dane bez połączenia z bazą
export async function GET() {
  return NextResponse.json([
    { id: '1', nazwa: 'Liceum ogólnokształcące', liczba_lat: 4, kod_mein: 'LO' },
    { id: '2', nazwa: 'Technikum', liczba_lat: 5, kod_mein: 'T' },
    { id: '3', nazwa: 'Szkoła branżowa I stopnia', liczba_lat: 3, kod_mein: 'BS1' },
  ]);
}
