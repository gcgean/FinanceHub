import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
              <span className="text-white text-sm font-bold">G</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900">Gestor Facil<span className="text-blue-600">.IA</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#solucoes" className="hover:text-blue-600 transition-colors">Soluções</a>
            <a href="#beneficios" className="hover:text-blue-600 transition-colors">Benefícios</a>
            <a href="#sobre" className="hover:text-blue-600 transition-colors">Sobre</a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5"
            >
              Entrar
            </button>
            <a
              href="https://wa.me/5500000000000?text=Quero+solicitar+um+diagnóstico+gratuito"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Falar com Especialista
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-6 bg-gradient-to-b from-blue-50 via-white to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider">
            GBPO • Consultoria • IA • Monitoramento
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Gestão de Processos +{" "}
            <span className="text-blue-600">IA</span> +{" "}
            Monitoramento{" "}
            <span className="text-blue-600">Inteligente</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-10">
            Automatizamos processos, organizamos operações e implementamos inteligência artificial
            para transformar a gestão da sua empresa com mais controle, eficiência e escalabilidade.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/5500000000000?text=Quero+solicitar+um+diagnóstico+gratuito"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg transition-all shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5"
            >
              Solicitar Diagnóstico Gratuito
            </a>
            <a
              href="#solucoes"
              className="px-8 py-4 border-2 border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-600 font-semibold rounded-xl text-lg transition-all"
            >
              Conhecer Soluções
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-500 italic">"Inteligência que transforma gestão."</p>
        </div>
      </section>

      {/* ── Subheadline / Diferenciais rápidos ───────────────────────────────── */}
      <section className="py-12 bg-blue-700">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
          {[
            { icon: "🤖", label: "IA Aplicada ao Negócio" },
            { icon: "⚙️", label: "Automação de Processos" },
            { icon: "📊", label: "Monitoramento em Tempo Real" },
            { icon: "🎯", label: "Estratégia Orientada a Dados" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-2">
              <span className="text-3xl">{item.icon}</span>
              <span className="text-sm font-medium text-blue-100">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Soluções ─────────────────────────────────────────────────────────── */}
      <section id="solucoes" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Soluções Inteligentes para Empresas Modernas
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A Gestor Facil.IA une consultoria estratégica, GBPO, automação inteligente e
              monitoramento empresarial em tempo real para modernizar operações, reduzir custos
              e acelerar resultados.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "⚙️",
                title: "Gestão de Processos (GBPO)",
                desc: "Mapeamento, organização e otimização de processos para aumentar produtividade e eficiência operacional.",
                color: "blue",
              },
              {
                icon: "🤖",
                title: "Automação com Inteligência Artificial",
                desc: "Implementação de IA para automatizar tarefas, reduzir falhas operacionais e melhorar fluxos de trabalho.",
                color: "indigo",
              },
              {
                icon: "📡",
                title: "Monitoramento Empresarial Inteligente",
                desc: "Acompanhamento em tempo real de indicadores, operações e desempenho da empresa com apoio de IA.",
                color: "violet",
              },
              {
                icon: "🎯",
                title: "Consultoria Estratégica",
                desc: "Análise de operações e desenvolvimento de estratégias para crescimento sustentável e escalável.",
                color: "sky",
              },
              {
                icon: "📊",
                title: "Business Intelligence",
                desc: "Dashboards, relatórios inteligentes e análise de dados para tomada de decisão mais rápida e eficiente.",
                color: "cyan",
              },
              {
                icon: "🚀",
                title: "Escalabilidade Garantida",
                desc: "Soluções que crescem com o seu negócio, garantindo eficiência mesmo com o aumento do volume de operações.",
                color: "teal",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 group-hover:bg-blue-100 transition-colors">
                  {card.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefícios ───────────────────────────────────────────────────────── */}
      <section id="beneficios" className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Por que escolher a Gestor Facil.IA?
            </h2>
            <p className="text-lg text-gray-600">
              Tecnologia aplicada ao negócio para gerar resultados reais.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Redução de custos operacionais",
              "Mais produtividade e eficiência",
              "Monitoramento inteligente em tempo real",
              "Processos organizados e automatizados",
              "Decisões estratégicas orientadas por dados",
              "Escalabilidade para crescimento empresarial",
              "Tecnologia aplicada ao negócio",
              "Relatórios automáticos com inteligência artificial",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 bg-white rounded-xl px-5 py-4 border border-gray-100 shadow-sm">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-700 text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Missão / Visão / Valores ──────────────────────────────────────────── */}
      <section id="sobre" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Quem Somos</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              A Gestor Facil.IA é uma empresa especializada em GBPO, consultoria estratégica e
              gestão inteligente de processos empresariais. Nosso foco é ajudar empresas a alcançarem
              maior eficiência operacional através da automação, inteligência artificial e monitoramento
              contínuo de indicadores e operações.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "🎯 Nossa Missão",
                desc: "Transformar empresas através da inteligência artificial, automação e gestão estratégica de processos, criando operações mais eficientes, inteligentes e escaláveis.",
              },
              {
                title: "🔭 Nossa Visão",
                desc: "Ser referência em gestão empresarial inteligente e soluções de automação com IA no Brasil.",
              },
              {
                title: "💎 Nossos Valores",
                desc: "Inovação • Transparência • Eficiência • Inteligência Estratégica • Evolução Contínua • Foco em Resultados",
              },
            ].map((card) => (
              <div key={card.title} className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">{card.title}</h3>
                <p className="text-gray-600 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-700 to-blue-900 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
            Sua empresa preparada para o futuro.
          </h2>
          <p className="text-blue-100 text-lg mb-10 leading-relaxed">
            Automatize processos, monitore operações e transforme sua gestão com inteligência artificial.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/5500000000000?text=Quero+solicitar+um+diagnóstico+gratuito"
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-4 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-lg transition-all shadow-xl hover:-translate-y-0.5"
            >
              Solicitar Diagnóstico
            </a>
            <a
              href="https://wa.me/5500000000000?text=Quero+falar+com+um+especialista"
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-4 bg-transparent border-2 border-white/60 hover:border-white text-white font-bold rounded-xl text-lg transition-all hover:-translate-y-0.5"
            >
              Falar com Especialista
            </a>
          </div>
          <p className="mt-8 text-blue-200 text-sm">
            "Dados inteligentes geram decisões inteligentes."
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 bg-gray-950 text-center text-gray-500 text-sm">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-semibold text-white">
            Gestor Facil<span className="text-blue-400">.IA</span>
          </span>
          <span>© {new Date().getFullYear()} Gestor Facil.IA — GBPO • Consultoria • Inteligência Artificial • Monitoramento Empresarial</span>
          <button
            onClick={() => navigate("/")}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Acessar Plataforma →
          </button>
        </div>
      </footer>
    </div>
  );
}
