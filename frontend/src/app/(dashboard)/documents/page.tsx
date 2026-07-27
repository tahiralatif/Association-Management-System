"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch, type PaginatedResponse, type DocumentItem, type DocumentCategory, type DocumentVersion, type DocumentComment, type DocumentShare } from "@/lib/api";
import { PageHeader, StatusBadge, DataTable, Pagination, SearchInput, StatCard, Modal, ConfirmDialog, FormField, Input, Select, Textarea, Tabs, EmptyState, LoadingSpinner } from "@/components/ui/shared";
import { useToast } from "@/components/ui/toast";

// ── Documents Page ───────────────────────────────────────────

export default function DocumentsPage() {
  const toast = useToast();
  // ── List State ──
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [hasFileOnly, setHasFileOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Create Modal ──
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Detail State ──
  const [selected, setSelected] = useState<DocumentItem | null>(null);
  const [detailTab, setDetailTab] = useState("details");
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [shares, setShares] = useState<DocumentShare[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Categories ──
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [catCreating, setCatCreating] = useState(false);

  // ── Stats ──
  const [stats, setStats] = useState<{ total_documents?: number; total_categories?: number } | null>(null);

  // ── Version form ──
  const [versionNotes, setVersionNotes] = useState("");
  const [versionLoading, setVersionLoading] = useState(false);

  // ── Comment form ──
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // ── Share form ──
  const [shareUserId, setShareUserId] = useState("");
  const [sharePermission, setSharePermission] = useState("view");
  const [shareLoading, setShareLoading] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  // ── Upload State ──
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDragOver, setUploadDragOver] = useState(false);

  // ── Create form ──
  const [form, setForm] = useState({
    title: "",
    description: "",
    document_type: "other",
    category_id: "",
    access_level: "members",
    tags: "",
  });

  // ── Cat form ──
  const [catForm, setCatForm] = useState({ name: "", description: "", icon: "", color: "" });

  const perPage = 10;

  // ── Load Documents ──
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (search) params.set("search", search);
      if (tab !== "all") params.set("document_type", tab);
      const result = await apiFetch<PaginatedResponse<DocumentItem>>(`/api/v1/documents/?${params}`);
      setDocuments(result.items || []);
      setTotal(result.total || 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load documents";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search, tab]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  // ── Filtered display list ──
  const displayDocuments = hasFileOnly
    ? documents.filter((d) => d.storage_path || d.file_url)
    : documents;

  // ── Load Stats ──
  useEffect(() => {
    apiFetch<{ total_documents: number; total_categories: number }>("/api/v1/documents/stats")
      .then(setStats)
      .catch(() => {});
  }, []);

  // ── Load Categories ──
  useEffect(() => {
    apiFetch<PaginatedResponse<DocumentCategory>>("/api/v1/documents/categories")
      .then((res) => setCategories(res.items || []))
      .catch(() => {});
  }, []);

  // ── Upload File ──
  async function handleUpload() {
    if (!uploadFile) return;
    try {
      setUploading(true);
      const formData = new URLSearchParams();
      if (uploadTitle.trim()) formData.set("title", uploadTitle.trim());
      const params = formData.toString() ? `?${formData.toString()}` : "";

      // Use native fetch for multipart upload (apiFetch doesn't support FormData)
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/v1/documents/upload${params}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: (() => { const fd = new FormData(); fd.append("file", uploadFile); return fd; })(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail || "Upload failed");
      }
      toast.success(`"${uploadFile.name}" uploaded successfully`);
      setShowUpload(false);
      setUploadFile(null);
      setUploadTitle("");
      loadDocuments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // ── Download helper ──
  function getDownloadUrl(doc: DocumentItem): string {
    if (doc.storage_path) {
      const parts = doc.storage_path.split("/");
      const tenantId = parts[0];
      const filePath = parts.slice(1).join("/");
      return `/api/v1/documents/file/${tenantId}/${filePath}?download=true`;
    }
    return doc.file_url || "#";
  }

  function getPreviewUrl(doc: DocumentItem): string {
    if (doc.storage_path) {
      const parts = doc.storage_path.split("/");
      const tenantId = parts[0];
      const filePath = parts.slice(1).join("/");
      return `/api/v1/documents/file/${tenantId}/${filePath}`;
    }
    return doc.file_url || "#";
  }

  // ── Create Document ──
  async function handleCreate() {
    if (!form.title.trim()) {
      setFormError("Title is required");
      return;
    }
    try {
      setCreating(true);
      setFormError(null);
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        document_type: form.document_type,
        access_level: form.access_level,
      };
      if (form.category_id) body.category_id = form.category_id;
      if (form.tags.trim()) body.tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      await apiFetch("/api/v1/documents/", { method: "POST", body: JSON.stringify(body) });
      toast.success("Document created");
      setShowCreate(false);
      setForm({ title: "", description: "", document_type: "other", category_id: "", access_level: "members", tags: "" });
      loadDocuments();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create document";
      toast.error(msg);
      setFormError(msg);
    } finally {
      setCreating(false);
    }
  }

  // ── Load Detail ──
  useEffect(() => {
    if (!selected) return;
    setDetailLoading(true);
    Promise.allSettled([
      apiFetch<DocumentVersion[]>(`/api/v1/documents/${selected.id}/versions`),
      apiFetch<DocumentComment[]>(`/api/v1/documents/${selected.id}/comments`),
      apiFetch<DocumentShare[]>(`/api/v1/documents/${selected.id}/shares`),
    ]).then(([v, c, s]) => {
      if (v.status === "fulfilled") setVersions(v.value || []);
      if (c.status === "fulfilled") setComments(c.value || []);
      if (s.status === "fulfilled") setShares(s.value || []);
    }).finally(() => setDetailLoading(false));
  }, [selected]);

  // ── Add Version ──
  async function handleAddVersion() {
    if (!selected || !versionNotes.trim()) return;
    try {
      setVersionLoading(true);
      await apiFetch(`/api/v1/documents/${selected.id}/versions`, {
        method: "POST",
        body: JSON.stringify({ change_notes: versionNotes.trim() }),
      });
      toast.success("Version added");
      setVersionNotes("");
      const res = await apiFetch<DocumentVersion[]>(`/api/v1/documents/${selected.id}/versions`);
      setVersions(res || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add version");
    } finally {
      setVersionLoading(false);
    }
  }

  // ── Add Comment ──
  async function handleAddComment() {
    if (!selected || !commentText.trim()) return;
    try {
      setCommentLoading(true);
      await apiFetch(`/api/v1/documents/${selected.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: commentText.trim() }),
      });
      toast.success("Comment added");
      setCommentText("");
      const res = await apiFetch<DocumentComment[]>(`/api/v1/documents/${selected.id}/comments`);
      setComments(res || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  }

  // ── Add Share ──
  async function handleAddShare() {
    if (!selected || !shareUserId.trim()) return;
    try {
      setShareLoading(true);
      await apiFetch(`/api/v1/documents/${selected.id}/share`, {
        method: "POST",
        body: JSON.stringify({ user_id: shareUserId.trim(), permission: sharePermission }),
      });
      toast.success("Document shared");
      setShareUserId("");
      setSharePermission("view");
      const res = await apiFetch<DocumentShare[]>(`/api/v1/documents/${selected.id}/shares`);
      setShares(res || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to share");
    } finally {
      setShareLoading(false);
    }
  }

  // ── Revoke Share ──
  async function handleRevoke() {
    if (!selected || !revokeId) return;
    try {
      await apiFetch(`/api/v1/documents/${selected.id}/shares/${revokeId}`, { method: "DELETE" });
      toast.success("Share revoked");
      setShares((prev) => prev.filter((s) => s.id !== revokeId));
      setRevokeId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke share");
    }
  }

  // ── Create Category ──
  async function handleCreateCategory() {
    if (!catForm.name.trim()) return;
    try {
      setCatCreating(true);
      await apiFetch("/api/v1/documents/categories", {
        method: "POST",
        body: JSON.stringify({
          name: catForm.name.trim(),
          description: catForm.description.trim() || undefined,
          icon: catForm.icon.trim() || undefined,
          color: catForm.color.trim() || undefined,
        }),
      });
      toast.success("Category created");
      setShowCatModal(false);
      setCatForm({ name: "", description: "", icon: "", color: "" });
      const res = await apiFetch<PaginatedResponse<DocumentCategory>>("/api/v1/documents/categories");
      setCategories(res.items || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setCatCreating(false);
    }
  }

  const typeTabs = [
    { key: "all", label: "All" },
    { key: "policy", label: "Policies" },
    { key: "bylaws", label: "Bylaws" },
    { key: "report", label: "Reports" },
    { key: "form", label: "Forms" },
    { key: "other", label: "Other" },
  ];

  const columns = [
    {
      key: "title",
      header: "Title",
      render: (row: Record<string, unknown>) => <span className="font-medium">{row.title as string}</span>,
    },
    {
      key: "document_type",
      header: "Type",
      render: (row: Record<string, unknown>) => <StatusBadge status={row.document_type as string} />,
    },
    { key: "status", header: "Status", render: (row: Record<string, unknown>) => <StatusBadge status={(row.status as string) || "draft"} /> },
    { key: "category_name", header: "Category", render: (row: Record<string, unknown>) => (row.category_name as string) || "—" },
    {
      key: "file_size",
      header: "Size",
      render: (row: Record<string, unknown>) => row.file_size ? `${((row.file_size as number) / 1024).toFixed(1)} KB` : "—",
    },
    { key: "created_by_name", header: "Created By", render: (row: Record<string, unknown>) => (row.created_by_name as string) || "—" },
    {
      key: "has_file",
      header: "File",
      render: (row: Record<string, unknown>) => {
        const doc = row as unknown as DocumentItem;
        const hasFile = !!(doc.storage_path || doc.file_url);
        return hasFile ? (
          <span className="inline-flex items-center gap-1 text-sm" title={doc.file_name || "File attached"}>
            📎 <span className="text-xs text-muted-foreground truncate max-w-[100px]">{doc.file_name || "file"}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: Record<string, unknown>) => {
        const doc = row as unknown as DocumentItem;
        const hasFile = !!(doc.storage_path || doc.file_url);
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setSelected(doc); }}
              className="text-sm text-primary hover:underline"
            >
              View
            </button>
            {hasFile && (
              <a
                href={getDownloadUrl(doc)}
                download
                onClick={(e) => e.stopPropagation()}
                className="text-sm text-slate-500 hover:text-slate-700"
                title="Download file"
              >
                ⬇
              </a>
            )}
          </div>
        );
      },
    },
  ];

  // ── Detail View ──
  if (selected) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelected(null)} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Documents
        </button>
        <PageHeader title={selected.title} description={selected.description} />

        {/* Info Card */}
        <div className="rounded-lg border p-4 bg-muted/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">Type:</span> <StatusBadge status={selected.document_type} /></div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selected.status || "draft"} /></div>
            <div><span className="text-muted-foreground">Category:</span> {selected.category_name || "—"}</div>
            <div><span className="text-muted-foreground">Access:</span> {selected.access_level || "—"}</div>
            <div><span className="text-muted-foreground">Created:</span> {selected.created_at ? new Date(selected.created_at).toLocaleDateString() : "—"}</div>
            <div><span className="text-muted-foreground">By:</span> {selected.created_by_name || "—"}</div>
            <div><span className="text-muted-foreground">Version:</span> {selected.version_number || 1}</div>
            <div><span className="text-muted-foreground">Size:</span> {selected.file_size ? `${(selected.file_size / 1024).toFixed(1)} KB` : "—"}</div>
          </div>
        </div>

        {/* Detail Tabs */}
        <Tabs
          tabs={[
            { key: "details", label: "Details" },
            { key: "versions", label: "Versions", count: versions.length },
            { key: "comments", label: "Comments", count: comments.length },
            { key: "sharing", label: "Sharing", count: shares.length },
          ]}
          activeTab={detailTab}
          onChange={setDetailTab}
        />

        {detailLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Details Tab */}
            {detailTab === "details" && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-sm text-slate-600">{selected.description || "No description"}</p>
                </div>

                {/* Download / Preview Buttons */}
                {(selected.file_url || selected.storage_path) && (
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium mb-3">File</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-600">{selected.file_name || "file"}</span>
                      {selected.file_size && (
                        <span className="text-xs text-slate-400">({(selected.file_size / 1024).toFixed(1)} KB)</span>
                      )}
                      <div className="flex gap-2 ml-auto">
                        <a
                          href={getPreviewUrl(selected)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50 text-slate-700"
                        >
                          👁 Preview
                        </a>
                        <a
                          href={getDownloadUrl(selected)}
                          download
                          className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800"
                        >
                          ⬇ Download
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {selected.tags && selected.tags.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {selected.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Versions Tab */}
            {detailTab === "versions" && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium mb-3">Add New Version</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Change notes..."
                      value={versionNotes}
                      onChange={(e) => setVersionNotes(e.target.value)}
                    />
                    <button
                      onClick={handleAddVersion}
                      disabled={versionLoading || !versionNotes.trim()}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                    >
                      {versionLoading ? "Adding..." : "Add Version"}
                    </button>
                  </div>
                </div>
                {versions.length === 0 ? (
                  <EmptyState icon="📄" title="No versions yet" description="Upload or add a version to track changes." />
                ) : (
                  <div className="space-y-2">
                    {versions.map((v) => (
                      <div key={v.id} className="rounded-lg border p-3 flex items-center justify-between">
                        <div>
                          <span className="font-medium">Version {v.version_number}</span>
                          <span className="text-sm text-muted-foreground ml-2">{v.file_name}</span>
                          <p className="text-sm text-muted-foreground mt-1">{v.change_notes || "No notes"}</p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div>{v.uploaded_by || "—"}</div>
                          <div>{v.created_at ? new Date(v.created_at).toLocaleDateString() : "—"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Comments Tab */}
            {detailTab === "comments" && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium mb-3">Add Comment</h3>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={commentLoading || !commentText.trim()}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
                    >
                      {commentLoading ? "Posting..." : "Post Comment"}
                    </button>
                  </div>
                </div>
                {comments.length === 0 ? (
                  <EmptyState icon="💬" title="No comments yet" description="Be the first to comment." />
                ) : (
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{c.author_name || "Anonymous"}</span>
                          <span className="text-xs text-muted-foreground">{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{c.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sharing Tab */}
            {detailTab === "sharing" && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium mb-3">Share Document</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="User ID"
                      value={shareUserId}
                      onChange={(e) => setShareUserId(e.target.value)}
                      className="max-w-xs"
                    />
                    <Select
                      value={sharePermission}
                      onChange={setSharePermission}
                      options={[
                        { value: "view", label: "View" },
                        { value: "edit", label: "Edit" },
                        { value: "admin", label: "Admin" },
                      ]}
                      className="w-32"
                    />
                    <button
                      onClick={handleAddShare}
                      disabled={shareLoading || !shareUserId.trim()}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                    >
                      {shareLoading ? "Sharing..." : "Share"}
                    </button>
                  </div>
                </div>
                {shares.length === 0 ? (
                  <EmptyState icon="🔗" title="No shares" description="This document is not shared with anyone." />
                ) : (
                  <div className="space-y-2">
                    {shares.map((s) => (
                      <div key={s.id} className="rounded-lg border p-3 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{s.user_name || s.user_id}</span>
                          <span className="ml-2"><StatusBadge status={s.permission} /></span>
                          <span className="text-xs text-muted-foreground ml-2">{s.shared_at ? new Date(s.shared_at).toLocaleDateString() : "—"}</span>
                        </div>
                        <button
                          onClick={() => setRevokeId(s.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <ConfirmDialog
          open={!!revokeId}
          onOpenChange={(v) => { if (!v) setRevokeId(null); }}
          title="Revoke Share"
          description="Are you sure you want to revoke this share? The user will lose access."
          confirmText="Revoke"
          variant="destructive"
          onConfirm={handleRevoke}
        />
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Manage association documents, policies, and files"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 border border-slate-200 rounded-md text-sm font-medium hover:bg-slate-50 text-slate-700"
            >
              📤 Upload File
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800"
            >
              + New Document
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Documents" value={stats?.total_documents ?? documents.length} icon="📄" />
        <StatCard label="Total Categories" value={stats?.total_categories ?? categories.length} icon="📁" />
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <Tabs tabs={typeTabs} activeTab={tab} onChange={(k) => { setTab(k); setPage(1); }} />
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasFileOnly}
              onChange={(e) => { setHasFileOnly(e.target.checked); setPage(1); }}
              className="rounded border-slate-300"
            />
            📎 With files only
          </label>
        </div>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search documents..." />
      </div>

      {/* Table */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : (
        <DataTable
          columns={columns}
          data={displayDocuments as unknown as Record<string, unknown>[]}
          loading={loading}
          emptyMessage="No documents found"
          onRowClick={(row) => setSelected(row as unknown as DocumentItem)}
        />
      )}

      <Pagination page={page} total={hasFileOnly ? displayDocuments.length : total} perPage={perPage} onChange={setPage} />

      {/* Categories Section */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Categories</h3>
          <button
            onClick={() => setShowCatModal(true)}
            className="text-sm text-primary hover:underline"
          >
            + Add Category
          </button>
        </div>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories yet</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {categories.map((cat) => (
              <div key={cat.id} className="rounded border p-2 text-sm">
                <div className="flex items-center gap-2">
                  {cat.icon && <span>{cat.icon}</span>}
                  <span className="font-medium">{cat.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{cat.document_count} docs</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onOpenChange={setShowCreate} title="Create Document">
        <div className="space-y-4">
          {formError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{formError}</div>
          )}
          <FormField label="Title" required>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Document title"
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description"
              rows={3}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type">
              <Select
                value={form.document_type}
                onChange={(v) => setForm({ ...form, document_type: v })}
                options={[
                  { value: "policy", label: "Policy" },
                  { value: "bylaws", label: "Bylaws" },
                  { value: "minutes", label: "Minutes" },
                  { value: "resolution", label: "Resolution" },
                  { value: "report", label: "Report" },
                  { value: "form", label: "Form" },
                  { value: "file", label: "File" },
                  { value: "other", label: "Other" },
                ]}
              />
            </FormField>
            <FormField label="Category">
              <Select
                value={form.category_id}
                onChange={(v) => setForm({ ...form, category_id: v })}
                placeholder="Select category"
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
            </FormField>
          </div>
          <FormField label="Access Level">
            <Select
              value={form.access_level}
              onChange={(v) => setForm({ ...form, access_level: v })}
              options={[
                { value: "public", label: "Public" },
                { value: "members", label: "Members" },
                { value: "staff", label: "Staff" },
                { value: "admin", label: "Admin" },
              ]}
            />
          </FormField>
          <FormField label="Tags">
            <Input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="Comma-separated tags"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !form.title.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Document"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal open={showCatModal} onOpenChange={setShowCatModal} title="Create Category">
        <div className="space-y-4">
          <FormField label="Name" required>
            <Input
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              placeholder="Category name"
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={catForm.description}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              placeholder="Optional description"
              rows={2}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Icon">
              <Input
                value={catForm.icon}
                onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                placeholder="Emoji or icon name"
              />
            </FormField>
            <FormField label="Color">
              <Input
                value={catForm.color}
                onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                placeholder="#hex or color name"
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowCatModal(false)}
              className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted"
              disabled={catCreating}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCategory}
              disabled={catCreating || !catForm.name.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
            >
              {catCreating ? "Creating..." : "Create Category"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Upload Modal */}
      <Modal open={showUpload} onOpenChange={setShowUpload} title="Upload File">
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const dropped = e.dataTransfer.files[0];
              if (dropped) {
                setUploadFile(dropped);
                if (!uploadTitle.trim()) setUploadTitle(dropped.name.replace(/\.[^.]+$/, ""));
              }
            }}
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-teal-400 hover:bg-teal-50/50 transition-colors cursor-pointer"
          >
            {uploadFile ? (
              <div className="space-y-2">
                <p className="text-2xl">📄</p>
                <p className="text-sm font-medium text-slate-700">{uploadFile.name}</p>
                <p className="text-xs text-slate-500">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                <button
                  onClick={() => { setUploadFile(null); setUploadTitle(""); }}
                  className="text-xs text-red-500 hover:text-red-700 underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-2xl">📁</p>
                <p className="text-sm text-slate-600">Drag & drop a file here, or</p>
                <label className="inline-block px-4 py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 cursor-pointer transition-colors">
                  Browse Files
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setUploadFile(f);
                        if (!uploadTitle.trim()) setUploadTitle(f.name.replace(/\.[^.]+$/, ""));
                      }
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          <FormField label="Title">
            <Input
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="Document title (optional)"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => { setShowUpload(false); setUploadFile(null); setUploadTitle(""); }}
              className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="px-4 py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
