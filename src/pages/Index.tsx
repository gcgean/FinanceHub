import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import Dashboard from "@/pages/Dashboard";
import AIInsights from "@/pages/AIInsights";
import Imports from "@/pages/Imports";
import Transactions from "@/pages/Transactions";
import Pendencies from "@/pages/Pendencies";
import Reports from "@/pages/Reports";
import Companies from "@/pages/Companies";
import Users from "@/pages/Users";
import Settings from "@/pages/Settings";

const pageInfo: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Visão geral financeira" },
  aiInsights: { title: "Inteligência Artificial", subtitle: "Insights preditivos e análise de mercado" },
  transactions: { title: "Transações", subtitle: "Gerenciar movimentações" },
  pendencies: { title: "Pendências", subtitle: "Itens aguardando resolução" },
  reports: { title: "Relatórios", subtitle: "DRE, Fluxo de Caixa e mais" },
  imports: { title: "Importações", subtitle: "Upload de extratos" },
  companies: { title: "Empresas", subtitle: "Gerenciar clientes" },
  users: { title: "Usuários", subtitle: "Gerenciar acessos" },
  settings: { title: "Configurações", subtitle: "Preferências do sistema" },
};

const Index = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "aiInsights":
        return <AIInsights />;
      case "imports":
        return <Imports />;
      case "transactions":
        return <Transactions />;
      case "pendencies":
        return <Pendencies />;
      case "reports":
        return <Reports />;
      case "companies":
        return <Companies />;
      case "users":
        return <Users />;
      case "settings":
        return <Settings />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                {pageInfo[currentPage]?.title || "Página"}
              </h2>
              <p className="text-muted-foreground">
                Em desenvolvimento...
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={pageInfo[currentPage]?.title || "FinanceHub"} 
          subtitle={pageInfo[currentPage]?.subtitle}
        />
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default Index;