"use client";

import { useState } from "react";
import Link from "next/link";

const competitors = [
  {
    name: "Wild Apricot",
    pricing: "$60–$320/mo",
    members: "Up to 50K",
    ai: false,
    openSource: false,
    selfHosted: false,
    customBranding: true,
    events: true,
    documents: true,
    elections: false,
    workflows: "Basic",
    analytics: "Basic",
    api: true,
    multiTenant: false,
    emailCampaigns: true,
    sms: false,
  },
  {
    name: "MemberPlanet",
    pricing: "$99–$299/mo",
    members: "Up to 25K",
    ai: false,
    openSource: false,
    selfHosted: false,
    customBranding: true,
    events: true,
    documents: false,
    elections: false,
    workflows: "Basic",
    analytics: "Basic",
    api: "Limited",
    multiTenant: false,
    emailCampaigns: true,
    sms: true,
  },
  {
    name: "Neon CRM",
    pricing: "$99–$399/mo",
    members: "Unlimited",
    ai: false,
    openSource: false,
    selfHosted: false,
    customBranding: true,
    events: true,
    documents: false,
    elections: false,
    workflows: true,
    analytics: true,
    api: true,
    multiTenant: false,
    emailCampaigns: true,
    sms: false,
  },
  {
    name: "Personify360",
    pricing: "Custom",
    members: "Unlimited",
    ai: false,
    openSource: false,
    selfHosted: false,
    customBranding: true,
    events: true,
    documents: true,
    elections: "Add-on",
    workflows: true,
    analytics: true,
    api: true,
    multiTenant: false,
    emailCampaigns: true,
    sms: true,
  },
  {
    name: "AssocHub ✨",
    pricing: "Free / Self-hosted",
    members: "Unlimited",
    ai: true,
    openSource: true,
    selfHosted: true,
    customBranding: true,
    events: true,
    documents: true,
    elections: true,
    workflows: true,
    analytics: "Advanced",
    api: true,
    multiTenant: true,
    emailCampaigns: true,
    sms: false,
  },
];

const features = [
  { category: "Core", items: [
    { name: "Member Management", icon: "👥", wild: true, neon: true, personify: true, assoc: true },
    { name: "Multi-tenancy", icon: "🏢", wild: false, neon: false, personify: false, assoc: true },
    { name: "Role-based Access", icon: "🔐", wild: true, neon: true, personify: true, assoc: true },
    { name: "Bulk Operations", icon: "⚡", wild: "Partial", neon: true, personify: true, assoc: true },
    { name: "CSV Import/Export", icon: "📊", wild: true, neon: true, personify: true, assoc: true },
  ]},
  { category: "Finance", items: [
    { name: "Invoicing", icon: "🧾", wild: true, neon: true, personify: true, assoc: true },
    { name: "Expense Tracking", icon: "💸", wild: false, neon: true, personify: true, assoc: true },
    { name: "Budget Management", icon: "📈", wild: false, neon: false, personify: "Partial", assoc: true },
    { name: "Dues & Subscriptions", icon: "💳", wild: true, neon: true, personify: true, assoc: true },
    { name: "Stripe Integration", icon: "💰", wild: true, neon: true, personify: true, assoc: true },
  ]},
  { category: "Events", items: [
    { name: "Event Creation", icon: "📅", wild: true, neon: true, personify: true, assoc: true },
    { name: "Registration & Check-in", icon: "✅", wild: true, neon: true, personify: true, assoc: true },
    { name: "Speakers & Sessions", icon: "🎤", wild: false, neon: false, personify: "Partial", assoc: true },
    { name: "Attendee Feedback", icon: "⭐", wild: false, neon: false, personify: false, assoc: true },
    { name: "Ticketing", icon: "🎫", wild: true, neon: false, personify: true, assoc: true },
  ]},
  { category: "Governance", items: [
    { name: "Elections", icon: "🗳️", wild: false, neon: false, personify: "Add-on", assoc: true },
    { name: "Nominations", icon: "📋", wild: false, neon: false, personify: false, assoc: true },
    { name: "Voting", icon: "✅", wild: false, neon: false, personify: false, assoc: true },
    { name: "Workflow Automation", icon: "⚙️", wild: "Basic", neon: true, personify: true, assoc: true },
  ]},
  { category: "Documents", items: [
    { name: "Document Storage", icon: "📄", wild: true, neon: false, personify: true, assoc: true },
    { name: "Version Control", icon: "🔄", wild: false, neon: false, personify: false, assoc: true },
    { name: "Comments & Sharing", icon: "💬", wild: false, neon: false, personify: false, assoc: true },
    { name: "Categories & Tags", icon: "🏷️", wild: false, neon: false, personify: false, assoc: true },
  ]},
  { category: "AI & Analytics", items: [
    { name: "AI Chat Assistant", icon: "🤖", wild: false, neon: false, personify: false, assoc: true },
    { name: "AI Document Generation", icon: "✨", wild: false, neon: false, personify: false, assoc: true },
    { name: "Churn Prediction", icon: "📉", wild: false, neon: false, personify: false, assoc: true },
    { name: "Anomaly Detection", icon: "🔍", wild: false, neon: false, personify: false, assoc: true },
    { name: "Interactive Dashboards", icon: "📊", wild: "Basic", neon: true, personify: true, assoc: true },
    { name: "Custom Reports & Export", icon: "📋", wild: false, neon: true, personify: true, assoc: true },
  ]},
  { category: "Communication", items: [
    { name: "Email Campaigns", icon: "📧", wild: true, neon: true, personify: true, assoc: true },
    { name: "Announcements", icon: "📢", wild: true, neon: true, personify: true, assoc: true },
    { name: "Surveys", icon: "📝", wild: false, neon: true, personify: true, assoc: true },
    { name: "Email Logs & Tracking", icon: "📬", wild: false, neon: false, personify: "Partial", assoc: true },
  ]},
  { category: "Platform", items: [
    { name: "Open Source", icon: "🔓", wild: false, neon: false, personify: false, assoc: true },
    { name: "Self-hosted Option", icon: "🏠", wild: false, neon: false, personify: false, assoc: true },
    { name: "REST API", icon: "🔗", wild: true, neon: true, personify: true, assoc: true },
    { name: "Webhook Integrations", icon: "🪝", wild: true, neon: true, personify: true, assoc: true },
    { name: "Jinja2 Email Templates", icon: "🎨", wild: false, neon: false, personify: false, assoc: true },
  ]},
];

const stats = [
  { label: "API Endpoints", value: "199+", icon: "🔗" },
  { label: "Backend Modules", value: "10", icon: "📦" },
  { label: "Frontend Pages", value: "14", icon: "🖥️" },
  { label: "AI Models", value: "Groq LLM", icon: "🤖" },
  { label: "Email Templates", value: "9", icon: "📧" },
  { label: "Test Pass Rate", value: "85/85", icon: "✅" },
];

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "comparison" | "features" | "pricing">("overview");

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#065f46] via-[#0d9488] to-[#064e3b] text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Live at <a href="https://ams.14.jugaar.ai" className="font-semibold underline">ams.14.jugaar.ai</a>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              The Open-Source AMS<br />
              <span className="text-emerald-300">with AI Built In</span>
            </h1>
            <p className="text-xl md:text-2xl text-emerald-100 max-w-3xl mx-auto mb-10">
              AssocHub is a modern, self-hosted Association Management System that replaces expensive SaaS platforms.
              Members, finances, events, documents, elections, workflows — and an AI assistant that knows your data.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://ams.14.jugaar.ai" className="bg-white text-[#065f46] px-8 py-4 rounded-xl font-bold text-lg hover:bg-emerald-50 transition shadow-lg">
                🚀 Try Live Demo
              </a>
              <a href="https://github.com/tahiralatif/Association-Management-System" className="bg-white/10 backdrop-blur border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition">
                ⭐ View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-[#f8fafb] border-b border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-2xl font-bold text-[#0d9488]">{stat.value}</div>
                <div className="text-sm text-[#64748b]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="max-w-7xl mx-auto px-6 pt-10">
        <div className="flex gap-1 bg-[#f1f5f9] p-1 rounded-xl mb-10 overflow-x-auto">
          {[
            { id: "overview" as const, label: "Why AssocHub?", icon: "💡" },
            { id: "comparison" as const, label: "vs Competitors", icon: "⚔️" },
            { id: "features" as const, label: "Full Feature List", icon: "📋" },
            { id: "pricing" as const, label: "Pricing Comparison", icon: "💰" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-white text-[#0d9488] shadow-sm"
                  : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-12">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold text-[#0f172a] mb-4">Why Build Your Own AMS?</h2>
              <p className="text-lg text-[#64748b]">
                Most association management platforms lock you into expensive subscriptions, limit your data access,
                and charge extra for every feature. AssocHub gives you everything — owned and controlled by you.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: "💰", title: "Zero Subscription Fees", desc: "Commercial AMS platforms cost $1,200–$4,800/year. AssocHub is free and self-hosted.", color: "#059669" },
                { icon: "🔓", title: "Full Data Ownership", desc: "Your member data stays on your server. No vendor lock-in, no data selling.", color: "#0d9488" },
                { icon: "🤖", title: "AI-Powered Assistant", desc: "Ask questions about your members, revenue, events — get instant answers from your live database.", color: "#7c3aed" },
                { icon: "🏗️", title: "Self-Hosted & Customizable", desc: "Deploy on your own infrastructure. Modify the code. Add features. You own it.", color: "#d97706" },
                { icon: "📊", title: "Advanced Analytics", desc: "Interactive charts, custom dashboards, report exports — no extra charges.", color: "#e11d48" },
                { icon: "🗳️", title: "Built-in Elections", desc: "Positions, nominations, voting, results — other platforms charge extra or don't offer this.", color: "#0891b2" },
              ].map((item) => (
                <div key={item.title} className="bg-white border border-[#e2e8f0] rounded-2xl p-6 hover:shadow-lg transition">
                  <div className="text-4xl mb-3">{item.icon}</div>
                  <h3 className="text-xl font-bold text-[#0f172a] mb-2">{item.title}</h3>
                  <p className="text-[#64748b]">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Cost Comparison */}
            <div className="bg-gradient-to-br from-[#065f46] to-[#0d9488] rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-6 text-center">5-Year Cost Comparison</h3>
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { name: "Wild Apricot", cost: "$9,600–$19,200", color: "text-emerald-200" },
                  { name: "Personify360", cost: "$18,000–$36,000+", color: "text-emerald-200" },
                  { name: "Neon CRM", cost: "$6,000–$24,000", color: "text-emerald-200" },
                  { name: "AssocHub", cost: "$0*", color: "text-white font-bold text-2xl" },
                ].map((p) => (
                  <div key={p.name} className="bg-white/10 backdrop-blur rounded-xl p-5 text-center">
                    <div className={`text-sm ${p.color} mb-1`}>{p.name}</div>
                    <div className={`text-xl font-bold ${p.color}`}>{p.cost}</div>
                    <div className="text-xs text-emerald-300 mt-1">over 5 years</div>
                  </div>
                ))}
              </div>
              <p className="text-center text-emerald-300 text-sm mt-4">* Server hosting ~$5–20/month on a VPS. One-time setup.</p>
            </div>
          </div>
        )}

        {/* Comparison Tab */}
        {activeTab === "comparison" && (
          <div className="space-y-10">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold text-[#0f172a] mb-4">AssocHub vs. The Competition</h2>
              <p className="text-lg text-[#64748b]">
                Feature-by-feature comparison with the most popular association management platforms.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded-2xl overflow-hidden shadow-sm border border-[#e2e8f0]">
                <thead>
                  <tr className="bg-[#065f46] text-white">
                    <th className="text-left px-6 py-4 font-semibold">Feature</th>
                    <th className="text-center px-4 py-4 font-semibold">Wild Apricot</th>
                    <th className="text-center px-4 py-4 font-semibold">Neon CRM</th>
                    <th className="text-center px-4 py-4 font-semibold">Personify360</th>
                    <th className="text-center px-6 py-4 font-bold bg-emerald-700">AssocHub ✨</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.slice(0, -1).map((comp, i) => null)}
                  {[
                    { feature: "Pricing", wa: "$60–320/mo", nc: "$99–399/mo", p360: "Custom", ah: "Free / Self-hosted" },
                    { feature: "AI Chat Assistant", wa: "❌", nc: "❌", p360: "❌", ah: "✅ Groq LLM" },
                    { feature: "AI Document Generation", wa: "❌", nc: "❌", p360: "❌", ah: "✅" },
                    { feature: "Elections & Voting", wa: "❌", nc: "❌", p360: "Add-on", ah: "✅ Built-in" },
                    { feature: "Workflow Automation", wa: "Basic", nc: "✅", p360: "✅", ah: "✅ Visual Editor" },
                    { feature: "Budget Management", wa: "❌", nc: "❌", p360: "Partial", ah: "✅" },
                    { feature: "Expense Tracking", wa: "❌", nc: "✅", p360: "✅", ah: "✅" },
                    { feature: "Document Versioning", wa: "❌", nc: "❌", p360: "❌", ah: "✅" },
                    { feature: "Multi-tenancy", wa: "❌", nc: "❌", p360: "❌", ah: "✅" },
                    { feature: "Open Source", wa: "❌", nc: "❌", p360: "❌", ah: "✅" },
                    { feature: "Self-hosted", wa: "❌", nc: "❌", p360: "❌", ah: "✅" },
                    { feature: "Interactive Analytics", wa: "Basic", nc: "✅", p360: "✅", ah: "✅ Recharts" },
                    { feature: "Churn Prediction", wa: "❌", nc: "❌", p360: "❌", ah: "✅ AI-powered" },
                    { feature: "REST API", wa: "✅", nc: "✅", p360: "✅", ah: "199+ endpoints" },
                    { feature: "Surveys", wa: "❌", nc: "✅", p360: "✅", ah: "✅" },
                  ].map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? "bg-[#f8fafb]" : "bg-white"}>
                      <td className="px-6 py-3 font-medium text-[#0f172a]">{row.feature}</td>
                      <td className="px-4 py-3 text-center text-sm">{row.wa}</td>
                      <td className="px-4 py-3 text-center text-sm">{row.nc}</td>
                      <td className="px-4 py-3 text-center text-sm">{row.p360}</td>
                      <td className="px-6 py-3 text-center text-sm font-semibold text-[#0d9488] bg-emerald-50">{row.ah}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Features Tab */}
        {activeTab === "features" && (
          <div className="space-y-10">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold text-[#0f172a] mb-4">Complete Feature Breakdown</h2>
              <p className="text-lg text-[#64748b]">
                Every module, every capability — AssocHub covers it all.
              </p>
            </div>

            {features.map((group) => (
              <div key={group.category}>
                <h3 className="text-xl font-bold text-[#0f172a] mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-[#0d9488] text-white rounded-lg flex items-center justify-center text-sm">
                    {group.category[0]}
                  </span>
                  {group.category}
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.items.map((item) => (
                    <div key={item.name} className="flex items-center gap-3 bg-[#f8fafb] border border-[#e2e8f0] rounded-xl px-4 py-3">
                      <span className="text-xl">{item.icon}</span>
                      <span className="font-medium text-[#0f172a] text-sm">{item.name}</span>
                      <span className="ml-auto text-[#0d9488] font-bold">✓</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === "pricing" && (
          <div className="space-y-10">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold text-[#0f172a] mb-4">Pricing Comparison</h2>
              <p className="text-lg text-[#64748b]">
                See how much you save with AssocHub over 1, 3, and 5 years.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: "Wild Apricot", monthly: 160, annual: 1920, features: "Basic AMS, 5K members", color: "#94a3b8" },
                { name: "MemberPlanet", monthly: 199, annual: 2388, features: "AMS + SMS, 10K members", color: "#94a3b8" },
                { name: "Neon CRM", monthly: 249, annual: 2988, features: "CRM + Events, unlimited", color: "#94a3b8" },
                { name: "Personify360", monthly: 500, annual: 6000, features: "Enterprise, all features", color: "#94a3b8" },
              ].map((plan) => (
                <div key={plan.name} className="bg-white border border-[#e2e8f0] rounded-2xl p-6 text-center">
                  <div className="text-sm text-[#64748b] mb-1">{plan.name}</div>
                  <div className="text-3xl font-bold text-[#0f172a]">${plan.monthly}<span className="text-base font-normal">/mo</span></div>
                  <div className="text-sm text-[#64748b] mt-1">${plan.annual.toLocaleString()}/year</div>
                  <div className="text-xs text-[#94a3b8] mt-2">{plan.features}</div>
                  <div className="mt-4 text-sm font-medium text-[#e11d48]">
                    5-year cost: ${(plan.annual * 5).toLocaleString()}
                  </div>
                </div>
              ))}

              {/* AssocHub Card */}
              <div className="bg-gradient-to-br from-[#065f46] to-[#0d9488] rounded-2xl p-6 text-center text-white relative overflow-hidden">
                <div className="absolute top-3 right-3 bg-emerald-400 text-[#065f46] text-xs font-bold px-3 py-1 rounded-full">BEST VALUE</div>
                <div className="text-sm text-emerald-200 mb-1">AssocHub ✨</div>
                <div className="text-3xl font-bold">$0<span className="text-base font-normal">/mo</span></div>
                <div className="text-sm text-emerald-200 mt-1">Self-hosted</div>
                <div className="text-xs text-emerald-300 mt-2">All features, unlimited members</div>
                <div className="mt-4 text-sm font-bold">
                  5-year cost: $300–1,200
                </div>
                <div className="text-xs text-emerald-300 mt-1">(just VPS hosting)</div>
              </div>
            </div>

            {/* Savings Callout */}
            <div className="bg-[#f0fdf4] border-2 border-[#059669] rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-[#065f46] mb-2">💰 Save $9,000–$29,000 over 5 years</h3>
              <p className="text-[#065f46]/70 max-w-2xl mx-auto">
                AssocHub includes AI features, elections, advanced analytics, and document management that
                competitors either don&apos;t offer or charge extra for — all at zero subscription cost.
              </p>
            </div>

            {/* Tech Stack */}
            <div className="bg-[#f8fafb] border border-[#e2e8f0] rounded-2xl p-8">
              <h3 className="text-xl font-bold text-[#0f172a] mb-4 text-center">Tech Stack</h3>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { name: "FastAPI", color: "#009688" },
                  { name: "Next.js 16", color: "#000000" },
                  { name: "React 19", color: "#61DAFB" },
                  { name: "TypeScript", color: "#3178C6" },
                  { name: "PostgreSQL", color: "#4169E1" },
                  { name: "Tailwind CSS", color: "#06B6D4" },
                  { name: "Groq LLM", color: "#F55036" },
                  { name: "Recharts", color: "#FF6384" },
                  { name: "SQLAlchemy", color: "#D71F00" },
                  { name: "Celery", color: "#A9CC54" },
                ].map((tech) => (
                  <span key={tech.name} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: tech.color }}>
                    {tech.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-[#065f46] text-white mt-16">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Try AssocHub?</h2>
          <p className="text-emerald-200 text-lg mb-8">
            Experience the full system — 64 members, invoices, events, AI assistant, and more — all pre-loaded.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://ams.14.jugaar.ai" className="bg-white text-[#065f46] px-8 py-4 rounded-xl font-bold text-lg hover:bg-emerald-50 transition">
              🚀 Launch Demo
            </a>
            <a href="https://github.com/tahiralatif/Association-Management-System" className="border border-white/30 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition">
              ⭐ Star on GitHub
            </a>
          </div>
          <div className="mt-8 text-emerald-300 text-sm">
            Login: daniel.harris@example.com &nbsp;|&nbsp; Password: demo1234 &nbsp;|&nbsp; Tenant: demo-association
          </div>
        </div>
      </section>
    </div>
  );
}
