"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch, API_BASE } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/shared";
import { PageHeader, StatusBadge } from "@/components/ui/shared";
import {
  Globe, Plus, Trash2, Eye, EyeOff, GripVertical, Save,
  Palette, Layout, Type, Image, MousePointerClick, Calendar,
  Users, Code, ChevronDown, ChevronUp, ExternalLink, Settings,
  ArrowUp, ArrowDown, Copy, Check
} from "lucide-react";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
interface Component {
  id: string;
  component_type: string;
  title?: string;
  content?: string;
  image_url?: string;
  settings?: Record<string, any>;
  sort_order: number;
  is_visible: boolean;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  description?: string;
  is_published: boolean;
  is_homepage: boolean;
  sort_order: number;
  meta_title?: string;
  meta_description?: string;
  components: Component[];
  created_at: string;
  updated_at: string;
}

interface Theme {
  id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  font_family: string;
  logo_url?: string;
  favicon_url?: string;
  header_html?: string;
  footer_html?: string;
  custom_css?: string;
}

const COMPONENT_TYPES = [
  { type: "hero", label: "Hero Banner", icon: Layout, description: "Full-width hero with title, subtitle, and optional image" },
  { type: "text", label: "Text Block", icon: Type, description: "Rich text content section" },
  { type: "image", label: "Image", icon: Image, description: "Single image with optional caption" },
  { type: "gallery", label: "Image Gallery", icon: Image, description: "Grid of images" },
  { type: "cta", label: "Call to Action", icon: MousePointerClick, description: "Button with heading and description" },
  { type: "events", label: "Upcoming Events", icon: Calendar, description: "Auto-shows upcoming events" },
  { type: "members", label: "Member Spotlight", icon: Users, description: "Featured member profiles" },
  { type: "custom_html", label: "Custom HTML", icon: Code, description: "Raw HTML/Embed code" },
];

const FONTS = ["Inter", "Roboto", "Open Sans", "Lato", "Poppins", "Montserrat", "Source Sans Pro", "Nunito"];

/* ═══════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════ */
export default function WebsiteBuilderPage() {
  const { toast } = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pages" | "theme">("pages");
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);
  const [showNewPage, setShowNewPage] = useState(false);
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [saving, setSaving] = useState(false);

  // New page form
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [newPageDesc, setNewPageDesc] = useState("");

  // Component form
  const [compType, setCompType] = useState("hero");
  const [compTitle, setCompTitle] = useState("");
  const [compContent, setCompContent] = useState("");
  const [compImageUrl, setCompImageUrl] = useState("");
  const [compHtml, setCompHtml] = useState("");

  // Theme form
  const [themeForm, setThemeForm] = useState({
    primary_color: "#0d9488",
    secondary_color: "#1e293b",
    accent_color: "#f59e0b",
    background_color: "#ffffff",
    text_color: "#1e293b",
    font_family: "Inter",
    logo_url: "",
    custom_css: "",
  });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [pagesRes, themeRes] = await Promise.allSettled([
        apiFetch<{ pages: Page[]; total: number }>("/api/v1/website/pages"),
        apiFetch<Theme>("/api/v1/website/theme"),
      ]);
      if (pagesRes.status === "fulfilled") setPages(pagesRes.value.pages || []);
      if (themeRes.status === "fulfilled") {
        setTheme(themeRes.value);
        setThemeForm({
          primary_color: themeRes.value.primary_color || "#0d9488",
          secondary_color: themeRes.value.secondary_color || "#1e293b",
          accent_color: themeRes.value.accent_color || "#f59e0b",
          background_color: themeRes.value.background_color || "#ffffff",
          text_color: themeRes.value.text_color || "#1e293b",
          font_family: themeRes.value.font_family || "Inter",
          logo_url: themeRes.value.logo_url || "",
          custom_css: themeRes.value.custom_css || "",
        });
      }
    } catch {
      toast("error", "Failed to load website data");
    } finally {
      setLoading(false);
    }
  }

  /* ─── Page CRUD ─── */
  async function createPage() {
    if (!newPageTitle.trim()) { toast("error", "Title required"); return; }
    const slug = newPageSlug.trim() || newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    try {
      const page = await apiFetch<Page>("/api/v1/website/pages", {
        method: "POST",
        body: JSON.stringify({ title: newPageTitle, slug, description: newPageDesc || null }),
      });
      setPages([...pages, page]);
      setShowNewPage(false);
      setNewPageTitle(""); setNewPageSlug(""); setNewPageDesc("");
      toast("success", "Page created");
    } catch (e: any) {
      toast("error", e.message || "Failed to create page");
    }
  }

  async function togglePublish(page: Page) {
    try {
      const updated = await apiFetch<Page>(`/api/v1/website/pages/${page.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_published: !page.is_published }),
      });
      setPages(pages.map(p => p.id === page.id ? updated : p));
      if (selectedPage?.id === page.id) setSelectedPage(updated);
      toast("success", updated.is_published ? "Page published" : "Page unpublished");
    } catch (e: any) {
      toast("error", e.message || "Failed to update page");
    }
  }

  async function deletePage(page: Page) {
    if (!confirm(`Delete "${page.title}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/api/v1/website/pages/${page.id}`, { method: "DELETE" });
      setPages(pages.filter(p => p.id !== page.id));
      if (selectedPage?.id === page.id) setSelectedPage(null);
      toast("success", "Page deleted");
    } catch (e: any) {
      toast("error", e.message || "Failed to delete page");
    }
  }

  /* ─── Component CRUD ─── */
  async function addComponent() {
    if (!selectedPage) return;
    try {
      const settings: Record<string, any> = {};
      if (compType === "custom_html") settings.html = compHtml;
      if (compType === "cta") { settings.button_text = "Learn More"; settings.button_url = "#"; }
      if (compType === "hero") { settings.style = "gradient"; settings.alignment = "center"; }

      const comp = await apiFetch<Component>(`/api/v1/website/pages/${selectedPage.id}/components`, {
        method: "POST",
        body: JSON.stringify({
          component_type: compType,
          title: compTitle || null,
          content: compContent || null,
          image_url: compImageUrl || null,
          settings,
          sort_order: selectedPage.components.length,
        }),
      });
      const updated = { ...selectedPage, components: [...selectedPage.components, comp] };
      setSelectedPage(updated);
      setPages(pages.map(p => p.id === updated.id ? updated : p));
      setShowAddComponent(false);
      setCompTitle(""); setCompContent(""); setCompImageUrl(""); setCompHtml("");
      toast("success", "Component added");
    } catch (e: any) {
      toast("error", e.message || "Failed to add component");
    }
  }

  async function updateComponent(comp: Component, updates: Partial<Component>) {
    if (!selectedPage) return;
    try {
      const updated = await apiFetch<Component>(`/api/v1/website/components/${comp.id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      const newComps = selectedPage.components.map(c => c.id === comp.id ? updated : c);
      const newPage = { ...selectedPage, components: newComps };
      setSelectedPage(newPage);
      setPages(pages.map(p => p.id === newPage.id ? newPage : p));
    } catch (e: any) {
      toast("error", e.message || "Failed to update component");
    }
  }

  async function deleteComponent(comp: Component) {
    if (!selectedPage) return;
    try {
      await apiFetch(`/api/v1/website/components/${comp.id}`, { method: "DELETE" });
      const newComps = selectedPage.components.filter(c => c.id !== comp.id);
      const newPage = { ...selectedPage, components: newComps };
      setSelectedPage(newPage);
      setPages(pages.map(p => p.id === newPage.id ? newPage : p));
      toast("success", "Component removed");
    } catch (e: any) {
      toast("error", e.message || "Failed to delete component");
    }
  }

  async function moveComponent(comp: Component, direction: "up" | "down") {
    if (!selectedPage) return;
    const idx = selectedPage.components.findIndex(c => c.id === comp.id);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= selectedPage.components.length) return;
    const newComps = [...selectedPage.components];
    [newComps[idx], newComps[newIdx]] = [newComps[newIdx], newComps[idx]];
    // Update sort_order
    const ordered = newComps.map((c, i) => ({ ...c, sort_order: i }));
    const newPage = { ...selectedPage, components: ordered };
    setSelectedPage(newPage);
    // Persist order
    await apiFetch(`/api/v1/website/pages/${selectedPage.id}/reorder`, {
      method: "POST",
      body: JSON.stringify(ordered.map(c => c.id)),
    });
  }

  /* ─── Theme ─── */
  async function saveTheme() {
    setSaving(true);
    try {
      const updated = await apiFetch<Theme>("/api/v1/website/theme", {
        method: "PATCH",
        body: JSON.stringify(themeForm),
      });
      setTheme(updated);
      toast("success", "Theme saved");
    } catch (e: any) {
      toast("error", e.message || "Failed to save theme");
    } finally {
      setSaving(false);
    }
  }

  /* ═══════════════════════════════════════════
     Render
     ═══════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  const compIcon = (type: string) => {
    const ct = COMPONENT_TYPES.find(c => c.type === type);
    const Icon = ct?.icon || Layout;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website Builder"
        description="Build and customize your association's public website"
        actions={
          <Button
            onClick={() => window.open(`/org/demo-association`, "_blank")}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
          >
            <ExternalLink className="h-4 w-4 mr-2" /> Preview Site
          </Button>
        }
      />

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("pages")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "pages" ? "bg-white text-teal-700 shadow-sm" : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <Layout className="h-4 w-4 mr-1.5 inline" /> Pages ({pages.length})
        </button>
        <button
          onClick={() => setActiveTab("theme")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "theme" ? "bg-white text-teal-700 shadow-sm" : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <Palette className="h-4 w-4 mr-1.5 inline" /> Theme
        </button>
      </div>

      {/* ═══ PAGES TAB ═══ */}
      {activeTab === "pages" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Page List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Pages</h3>
              <Button size="sm" onClick={() => setShowNewPage(true)} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-3.5 w-3.5 mr-1" /> New
              </Button>
            </div>

            {showNewPage && (
              <Card className="border-teal-200">
                <CardContent className="p-4 space-y-3">
                  <Input placeholder="Page title" value={newPageTitle} onChange={e => setNewPageTitle(e.target.value)} />
                  <Input placeholder="URL slug (auto-generated)" value={newPageSlug} onChange={e => setNewPageSlug(e.target.value)} />
                  <Input placeholder="Description (optional)" value={newPageDesc} onChange={e => setNewPageDesc(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={createPage} className="bg-teal-600 hover:bg-teal-700">Create</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowNewPage(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {pages.map(page => (
              <div
                key={page.id}
                onClick={() => setSelectedPage(page)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedPage?.id === page.id
                    ? "border-teal-400 bg-teal-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{page.title}</span>
                      {page.is_homepage && (
                        <span className="text-[10px] font-medium bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">HOME</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">/{page.slug}</p>
                  </div>
                  <StatusBadge status={page.is_published ? "published" : "draft"} />
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                  <span>{page.components.length} components</span>
                  <span>•</span>
                  <button
                    onClick={e => { e.stopPropagation(); togglePublish(page); }}
                    className="text-teal-600 hover:underline"
                  >
                    {page.is_published ? "Unpublish" : "Publish"}
                  </button>
                  <span>•</span>
                  <button
                    onClick={e => { e.stopPropagation(); deletePage(page); }}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {pages.length === 0 && !showNewPage && (
              <div className="text-center py-8 text-slate-400 text-sm">
                <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No pages yet. Create your first page!
              </div>
            )}
          </div>

          {/* Page Editor */}
          <div className="lg:col-span-2">
            {selectedPage ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{selectedPage.title}</CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => window.open(`/org/demo-association/${selectedPage.slug}`, "_blank")}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                      </Button>
                      <Button size="sm" onClick={() => setShowAddComponent(true)} className="bg-teal-600 hover:bg-teal-700">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Block
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Component Form */}
                  {showAddComponent && (
                    <div className="p-4 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/50 space-y-3">
                      <Label className="font-medium">Add Component</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {COMPONENT_TYPES.map(ct => (
                          <button
                            key={ct.type}
                            onClick={() => setCompType(ct.type)}
                            className={`p-2 rounded-lg border text-left text-xs transition-all ${
                              compType === ct.type
                                ? "border-teal-400 bg-teal-100 text-teal-800"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <ct.icon className="h-4 w-4 mb-1" />
                            <div className="font-medium">{ct.label}</div>
                          </button>
                        ))}
                      </div>
                      <Input placeholder="Title (optional)" value={compTitle} onChange={e => setCompTitle(e.target.value)} />
                      {compType === "custom_html" ? (
                        <Textarea placeholder="HTML code..." value={compHtml} onChange={e => setCompHtml(e.target.value)} rows={4} className="font-mono text-sm" />
                      ) : (
                        <Textarea placeholder="Content..." value={compContent} onChange={e => setCompContent(e.target.value)} rows={3} />
                      )}
                      {(compType === "image" || compType === "hero") && (
                        <Input placeholder="Image URL (optional)" value={compImageUrl} onChange={e => setCompImageUrl(e.target.value)} />
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={addComponent} className="bg-teal-600 hover:bg-teal-700">Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowAddComponent(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {/* Component List */}
                  {selectedPage.components.length === 0 && !showAddComponent ? (
                    <div className="text-center py-12 text-slate-400">
                      <Layout className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No components yet. Add your first content block!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedPage.components.map((comp, idx) => (
                        <div
                          key={comp.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            editingComponent?.id === comp.id
                              ? "border-teal-400 bg-teal-50"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          } ${!comp.is_visible ? "opacity-50" : ""}`}
                        >
                          <div className="text-slate-400 cursor-grab">
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <div className="flex-shrink-0">
                            {compIcon(comp.component_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{comp.title || comp.component_type}</span>
                              <span className="text-[10px] text-slate-400 uppercase">{comp.component_type}</span>
                              {!comp.is_visible && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">HIDDEN</span>}
                            </div>
                            {comp.content && (
                              <p className="text-xs text-slate-500 truncate mt-0.5">{comp.content.slice(0, 80)}...</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => moveComponent(comp, "up")} disabled={idx === 0} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30">
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => moveComponent(comp, "down")} disabled={idx === selectedPage.components.length - 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30">
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => updateComponent(comp, { is_visible: !comp.is_visible })}
                              className="p-1 rounded hover:bg-slate-100"
                            >
                              {comp.is_visible ? <Eye className="h-3.5 w-3.5 text-slate-500" /> : <EyeOff className="h-3.5 w-3.5 text-slate-400" />}
                            </button>
                            <button
                              onClick={() => deleteComponent(comp)}
                              className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-16 text-center text-slate-400">
                  <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium text-slate-500">Select a page to edit</p>
                  <p className="text-sm mt-1">Or create a new one to get started</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ═══ THEME TAB ═══ */}
      {activeTab === "theme" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" /> Colors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "primary_color", label: "Primary Color" },
                { key: "secondary_color", label: "Secondary Color" },
                { key: "accent_color", label: "Accent Color" },
                { key: "background_color", label: "Background Color" },
                { key: "text_color", label: "Text Color" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <input
                    type="color"
                    value={(themeForm as any)[key]}
                    onChange={e => setThemeForm({ ...themeForm, [key]: e.target.value })}
                    className="h-10 w-10 rounded-lg border cursor-pointer"
                  />
                  <div className="flex-1">
                    <Label className="text-sm">{label}</Label>
                    <Input
                      value={(themeForm as any)[key]}
                      onChange={e => setThemeForm({ ...themeForm, [key]: e.target.value })}
                      className="font-mono text-sm h-8"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" /> Typography & Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Font Family</Label>
                <select
                  value={themeForm.font_family}
                  onChange={e => setThemeForm({ ...themeForm, font_family: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border bg-white text-sm"
                >
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input value={themeForm.logo_url} onChange={e => setThemeForm({ ...themeForm, logo_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Custom CSS</Label>
                <Textarea
                  value={themeForm.custom_css}
                  onChange={e => setThemeForm({ ...themeForm, custom_css: e.target.value })}
                  rows={5}
                  className="font-mono text-xs"
                  placeholder=".my-class { color: red; }"
                />
              </div>
              <Button onClick={saveTheme} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
                <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Theme"}
              </Button>
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="rounded-xl border overflow-hidden"
                style={{
                  backgroundColor: themeForm.background_color,
                  color: themeForm.text_color,
                  fontFamily: themeForm.font_family,
                }}
              >
                <div
                  className="p-6 text-center text-white"
                  style={{ backgroundColor: themeForm.primary_color }}
                >
                  <h2 className="text-2xl font-bold">Your Association Name</h2>
                  <p className="mt-1 opacity-90">Welcome to our community</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-4 rounded-lg border" style={{ borderColor: themeForm.primary_color + "30" }}>
                        <div className="h-3 w-16 rounded mb-2" style={{ backgroundColor: themeForm.accent_color }} />
                        <div className="h-2 w-full rounded bg-slate-200 mb-1" />
                        <div className="h-2 w-2/3 rounded bg-slate-200" />
                      </div>
                    ))}
                  </div>
                  <button
                    className="px-6 py-2 rounded-lg text-white text-sm font-medium"
                    style={{ backgroundColor: themeForm.secondary_color }}
                  >
                    Call to Action
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
