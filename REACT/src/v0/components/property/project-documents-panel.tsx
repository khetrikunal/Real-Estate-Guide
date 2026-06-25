"use client"

import { useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAppReducedMotion } from "@app/motion"
import { Download, FileText, Loader2, Plus, Trash2, Upload } from "lucide-react"

import { estateApi } from "@app/api/estateApi"
import { useAuth } from "@app/auth/AuthContext"
import { SectionCard } from "@/components/shell/section-card"
import { Button } from "@/components/ui/button"

type ApiRecord = Record<string, unknown>

type ProjectDocument = {
  id: string
  name: string
  type: string
  size: string
  uploadedAt: string
  url: string
}

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
  const inputRef = useRef<HTMLInputElement>(null)
  const reduceMotion = useAppReducedMotion()
  const queryClient = useQueryClient()
  const { ready, token } = useAuth()
  const [uploadError, setUploadError] = useState<string | null>(null)
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
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("files", file)
      formData.append("documentType", isConfigScope ? "CONFIGURATION" : "PROJECT")
      if (isConfigScope) return estateApi.documents.uploadConfigDocs(String(configId), formData)
      return estateApi.documents.upload(projectId, formData)
    },
    onSuccess: () => {
      setUploadError(null)
      queryClient.invalidateQueries({ queryKey })
      if (inputRef.current) inputRef.current.value = ""
    },
    onError: (error) => setUploadError(error instanceof Error ? error.message : "Upload failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) =>
      isConfigScope ? estateApi.documents.deleteConfigDoc(String(configId), documentId) : estateApi.documents.remove(documentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const documents = documentsQuery.data ?? []
  const isBusy = documentsQuery.isFetching || uploadMutation.isPending || deleteMutation.isPending

  return (
    <SectionCard
      eyebrow={`${documents.length} files`}
      title={isConfigScope ? "Configuration documents" : "Project documents"}
      description={
        isConfigScope
          ? "Upload, download, and remove documents attached to this configuration."
          : "Upload, download, and remove project documents used by all role views."
      }
      actions={
        <div>
          <input
            ref={inputRef}
            id={`document-upload-${scopeId}`}
            type="file"
            className="sr-only"
            multiple={false}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) uploadMutation.mutate(file)
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-1.5"
            disabled={uploadMutation.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {uploadMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Upload document
          </Button>
        </div>
      }
    >
      {uploadError ? (
        <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {uploadError}
        </div>
      ) : null}
      <ul className="divide-border divide-y">
        {documents.map((doc, index) => (
          <motion.li
            key={doc.id}
            className="flex items-center justify-between gap-3 py-3"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0.001 } : { duration: 0.18, delay: Math.min(index, 8) * 0.04 }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{doc.name}</div>
                <div className="text-muted-foreground text-xs">
                  {doc.type} · {doc.size} · {doc.uploadedAt}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`Download ${doc.name}`}
                onClick={() => window.open(doc.url || estateApi.documents.download(doc.id), "_blank", "noopener,noreferrer")}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive h-8 w-8"
                aria-label={`Delete ${doc.name}`}
                disabled={isBusy}
                onClick={() => {
                  if (window.confirm(`Delete ${doc.name}?`)) deleteMutation.mutate(doc.id)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.li>
        ))}
      </ul>
      {documents.length === 0 ? (
        <div className="border-border bg-muted/20 flex flex-col items-center justify-center rounded-xl border py-10 text-center">
          <Upload className="text-muted-foreground h-5 w-5" />
          <div className="mt-2 text-sm font-semibold">No documents uploaded</div>
          <div className="text-muted-foreground text-xs">Use upload document to attach approvals, layouts, and brochures.</div>
        </div>
      ) : null}
    </SectionCard>
  )
}
