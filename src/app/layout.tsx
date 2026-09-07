import type { Metadata } from "next";
import AppSidebar from "@/components/AppSidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vivemed CRM",
  description: "Gestão comercial e relacionamento com clientes",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
      <html lang="pt-BR">
      <body>
        <AppSidebar />
        {children}
      </body>
      </html>
  );
}
