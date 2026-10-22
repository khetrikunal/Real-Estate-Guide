"use client"

import { useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAppReducedMotion } from "@app/motion"
import {
  AlertCircle,
  Download,
  Eye,
  FileCheck,
  FileText,
  ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import { estateApi } from "@app/api/estateApi"
import { useAuth } from "@app/auth/AuthContext"
import { SectionCard } from "@/components/shell/section-card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ApiRecord = Record<string, unknown>

type ProjectDocument = {
  id: string
  name: string
  type: string
  size: string
  uploadedAt: string
  url: string
}

const DOCUMENT_CATEGORIES = [
  "Brochure",
  "Floor Plan",
  "Approvals & RERA",
  "Layout / Master Plan",
  "Legal & Title",
  "Price Sheet",
  "Other",
]

const isRecord = (value: unknown): value is ApiRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const asArray = (value: unknown): ApiRecord[] => {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (isRecord(value)) {
    const nested = value.data ?? value.content ?? value.items ?? value.documents ?? value.records
    if (Array.isArray(nested)) return nested.filter(isRecord)
  }
  return []
}

const firstString = (record: ApiRecord, keys: string[], fallback: string) => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number") return String(value)
  }
  return fallback
}

const formatSize = (value: unknown) => {
  const bytes = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(bytes) || bytes <= 0) return "Size pending"
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatDate = (value: unknown) => {
  if (typeof value !== "string" || !value) return "Upload date pending"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

const isImageFile = (name: string, type: string) => {
  const lowerName = name.toLowerCase()
  const lowerType = type.toLowerCase()
  return (
    lowerType.includes("image") ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".webp")
  )
}

const mapDocument = (record: ApiRecord, index: number): ProjectDocument => ({
  id: firstString(record, ["id", "documentId", "_id"], `local-doc-${index}`),
  name: firstString(record, ["name", "fileName", "documentName", "originalFilename"], `Document ${index + 1}`),
  type: firstString(record, ["type", "documentType", "contentType", "mimeType"], "Project document"),
  size: formatSize(record.size ?? record.fileSize ?? record.bytes),
  uploadedAt: formatDate(record.uploadedAt ?? record.createdAt ?? record.createdDate),
  url: firstString(record, ["fileUrl", "downloadUrl", "url"], ""),
})

export function ProjectDocumentsPanel({
  projectId,
  projectName,
  configId,
}: {
  projectId: string
  projectName: string
  configId?: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const reduceMotion = useAppReducedMotion()
  const queryClient = useQueryClient()
  const { ready, token } = useAuth()

  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("Brochure")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [stagedFile, setStagedFile] = useState<File | null>(null)

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null)

  // Delete modal
  const [deleteDoc, setDeleteDoc] = useState<ProjectDocument | null>(null)

  const isConfigScope = Boolean(configId)
  const scopeId = configId ?? projectId
  const queryKey = isConfigScope ? ["v0", "config-documents", configId] : ["v0", "project-documents", projectId]

  const documentsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const response = isConfigScope
        ? await estateApi.documents.configDocs(String(configId))
        : await estateApi.documents.byProject(projectId)
      return asArray(response).map(mapDocument)
    },
    enabled: ready && Boolean(token) && Boolean(scopeId),
    staleTime: 0,
  })

  const uploadMutation = useMutation({
    mutationFn: async ({ file, category }: { file: File; category: string }) => {
      const formData = new FormData()
      formData.append("files", file)
      formData.append("documentType", category || (isConfigScope ? "CONFIGURATION" : "PROJECT"))
      if (isConfigScope) return estateApi.documents.uploadConfigDocs(String(configId), formData)
      return estateApi.documents.upload(projectId, formData)
    },
    onSuccess: () => {
      setUploadError(null)
      setStagedFile(null)
      setUploadDialogOpen(false)
      queryClient.invalidateQueries({ queryKey })
      if (fileInputRef.current) fileInputRef.current.value = ""
    },
    onError: (error) => setUploadError(error instanceof Error ? error.message : "Upload failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) =>
      isConfigScope ? estateApi.documents.deleteConfigDoc(String(configId), documentId) : estateApi.documents.remove(documentId),
    onSuccess: () => {
      setDeleteDoc(null)
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => alert(error instanceof Error ? error.message : "Delete failed"),
  })

  const documents = documentsQuery.data ?? []
  const isBusy = documentsQuery.isFetching || uploadMutation.isPending || deleteMutation.isPending

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 20MB limit check
    if (file.size > 20 * 1024 * 1024) {
      setUploadError("File is too large. Maximum allowed file size is 20MB.")
      return
    }

    setUploadError(null)
    setStagedFile(file)
    setUploadDialogOpen(true)
  }

  const handleConfirmUpload = () => {
    if (!stagedFile) return
    uploadMutation.mutate({ file: stagedFile, category: selectedCategory })
  }

  return (
    <SectionCard
      eyebrow={`${documents.length} Files`}
      title={isConfigScope ? "Configuration Documents" : "Project Documents & Media"}
      description={
        isConfigScope
          ? "Brochures, layouts, and specifications attached to this configuration."
          : "Brochures, floor plans, legal approvals, and RERA certificates for this building."
      }
      actions={
        <div>
          <input
            ref={fileInputRef}
            id={`document-upload-${scopeId}`}
            type="file"
            className="sr-only"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
            multiple={false}
            onChange={handleFileSelected}
          />
          <Button
            type="button"
            size="sm"
            className="glow-primary gap-1.5"
            disabled={uploadMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Upload Document
          </Button>
        </div>
      }
    >
      {uploadError && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {documents.length > 0 ? (
        <ul className="divide-border divide-y">
          {documents.map((doc, index) => {
            const isImg = isImageFile(doc.name, doc.type)
            const docUrl = doc.url || estateApi.documents.download(doc.id)

            return (
              <motion.li
                key={doc.id}
                className="flex items-center justify-between gap-3 py-3.5"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0.001 } : { duration: 0.18, delay: Math.min(index, 8) * 0.04 }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                    {isImg ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{doc.name}</div>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                        {doc.type}
                      </span>
                      <span>{doc.size}</span>
                      <span>·</span>
                      <span>Uploaded {doc.uploadedAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {isImg && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Preview Document"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title={`Download ${doc.name}`}
                    onClick={() => window.open(docUrl, "_blank", "noopener,noreferrer")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 h-8 w-8"
                    title={`Delete ${doc.name}`}
                    disabled={isBusy}
                    onClick={() => setDeleteDoc(doc)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.li>
            )
          })}
        </ul>
      ) : (
        <div className="border-border bg-muted/20 flex flex-col items-center justify-center rounded-2xl border py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Upload className="h-6 w-6" />
          </div>
          <div className="mt-3 text-sm font-bold text-foreground">No Documents Attached</div>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            Attach brochures, layout drawings, floor plans, and RERA approval certificates to this building.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-3.5 w-3.5" />
            Select File to Upload
          </Button>
        </div>
      )}

      {/* Upload Confirmation & Category Selection Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Select the category for this document before saving.
            </DialogDescription>
          </DialogHeader>

          {stagedFile && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-center gap-3">
                <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-foreground">{stagedFile.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {(stagedFile.size / 1024).toFixed(0)} KB · {stagedFile.type || "Document"}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Document Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setStagedFile(null)
                setUploadDialogOpen(false)
              }}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="glow-primary"
              onClick={handleConfirmUpload}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Uploading...
                </>
              ) : (
                "Confirm & Upload"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog
        open={Boolean(previewDoc)}
        onOpenChange={(open) => {
          if (!open) setPreviewDoc(null)
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden p-0">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold truncate">
              {previewDoc?.name}
            </DialogTitle>
          </div>
          <div className="p-4 flex items-center justify-center bg-black/5 dark:bg-black/40 max-h-[70vh] overflow-auto">
            {previewDoc && (
              <img
                src={previewDoc.url || estateApi.documents.download(previewDoc.id)}
                alt={previewDoc.name}
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-md"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Document Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteDoc)}
        onOpenChange={(open) => {
          if (!open) setDeleteDoc(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Document?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{deleteDoc?.name}</strong>? This file will be permanently
              deleted from object storage.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteDoc(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteDoc) deleteMutation.mutate(deleteDoc.id)
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Deleting...
                </>
              ) : (
                "Delete Document"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  )
}
