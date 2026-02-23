import type { Metadata } from "next";
import "../app/globals.css";
import { AuthProvider } from "@/shared/auth";

export const metadata: Metadata = {
  title: "EduGrid - System planowania siatki godzin",
  description: "System do budowania siatki godzin i rozkładów przedmiotów",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
