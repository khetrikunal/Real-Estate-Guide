"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Search, ShoppingCart } from "lucide-react"

import { estateApi } from "@app/api/estateApi"
import { queryKeys } from "@app/api/queryKeys"
import type { Lead, Property } from "@/lib/data"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type ApiRecord = Record<string, unknown>
type Primitive = string | number

type SellUnitDialogProps = {
  open: boolean
  projectId: Primitive
  initialProject?: Property | null
  leads?: Lead[]
  onOpenChange: (open: boolean) => void
  onSold?: () => void
}

const isRecord = (value: unknown): value is ApiRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const asRecord = (value: unknown): ApiRecord | null => {
  if (!isRecord(value)) return null
  const nested = value.data ?? value.project ?? value.item
  if (isRecord(nested)) return nested
  return value
}

const asRecords = (value: unknown): ApiRecord[] => {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (isRecord(value)) {
    const nested = value.data ?? value.content ?? value.items ?? value.results ?? value.records
    if (Array.isArray(nested)) return nested.filter(isRecord)
  }
  return []
}

const firstString = (record: ApiRecord | null | undefined, keys: string[], fallback = "") => {
  if (!record) return fallback
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return fallback
}

const firstNumber = (record: ApiRecord | null | undefined, keys: string[], fallback = 0) => {
  if (!record) return fallback
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^\d.-]/g, ""))
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return fallback
}

const firstPrimitive = (record: ApiRecord | null | undefined, keys: string[]): Primitive | undefined => {
  if (!record) return undefined
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number" && Number.isFinite(value)) return value
  }
  return undefined
}

const numberOrString = (value: Primitive) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && String(value).trim() ? parsed : value
}

const sameText = (left: unknown, right: unknown) =>
  typeof left === "string" &&
  typeof right === "string" &&
  left.trim().length > 0 &&
  left.trim().toLowerCase() === right.trim().toLowerCase()

const titleCase = (value: string) =>
  value
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase())

const formatInr = (value: number) =>
  value > 0 ? `INR ${new Intl.NumberFormat("en-IN").format(value)}` : "Price pending"

const configId = (config: ApiRecord) => firstPrimitive(config, ["id", "configId", "configurationId"])
const configType = (config: ApiRecord) => firstString(config, ["propertyType", "configType"], "Config")
const configPrice = (config: ApiRecord) => firstNumber(config, ["price", "finalPrice", "configPrice", "basePrice", "amount"])

const configLabel = (config: ApiRecord) => {
  const type = configType(config)
  const label = firstString(config, ["configLabel", "flatType", "type", "unitType", "configuration"], "")
  const unit = firstString(config, ["floorNo", "shopNo", "houseNumber", "bungalowNo"], "")
  const parts = [type, label, unit].filter(Boolean)
  return parts.length ? parts.join(" / ") : "Configuration"
}

const unitId = (unit: ApiRecord) => firstPrimitive(unit, ["id", "unitId"])

const unitLabel = (unit: ApiRecord) =>
  firstString(unit, ["unitLabel", "unitNo", "unitNumber", "flatNo", "shopNo"], "") ||
  (unitId(unit) ? `Unit ${unitId(unit)}` : "Unit")

const isAvailableUnit = (unit: ApiRecord) => {
  const status = firstString(unit, ["status", "state"], "").toUpperCase()
  if (status) return status === "AVAILABLE"
  return unit.sold !== true && unit.saleId == null
}

const availableUnits = (config: ApiRecord) => asRecords(config.unitInventory).filter(isAvailableUnit)

const projectConfigs = (project: ApiRecord | null) => asRecords(project?.configs)

const availableConfigs = (project: ApiRecord | null) =>
  projectConfigs(project).filter((config) => configId(config) != null && availableUnits(config).some((unit) => unitId(unit) != null))

const leadSearchText = (lead: Lead) =>
  [lead.customer, lead.customerName, lead.phone, lead.email, lead.projectName, lead.propertyInterest, lead.projectInterest]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

export function SellUnitDialog({
  open,
  projectId,
  initialProject,
  leads = [],
  onOpenChange,
  onSold,
}: SellUnitDialogProps) {
  const queryClient = useQueryClient()
  const [selectedType, setSelectedType] = useState("")
  const [selectedConfigId, setSelectedConfigId] = useState("")
  const [selectedUnitId, setSelectedUnitId] = useState("")
  const [buyerMode, setBuyerMode] = useState<"manual" | "lead">("manual")
  const [leadSearch, setLeadSearch] = useState("")
  const [selectedLeadId, setSelectedLeadId] = useState("")
  const [buyerName, setBuyerName] = useState("")
  const [buyerPhone, setBuyerPhone] = useState("")
  const [buyerEmail, setBuyerEmail] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")

  const projectQuery = useQuery({
    queryKey: ["v0", "sell-project-detail", String(projectId)],
    queryFn: () => estateApi.projects.detail(projectId),
    enabled: open && Boolean(projectId),
    staleTime: 0,
  })

  const project = useMemo(() => {
    const detail = asRecord(projectQuery.data)
    if (detail) return detail
    return asRecord(initialProject?.raw) ?? null
  }, [initialProject?.raw, projectQuery.data])

  const configs = useMemo(() => availableConfigs(project), [project])
  const configTypes = useMemo(
    () =>
      Array.from(new Set(configs.map(configType).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [configs],
  )
  const configsForType = useMemo(
    () => configs.filter((config) => !selectedType || sameText(configType(config), selectedType)),
    [configs, selectedType],
  )
  const selectedConfig = useMemo(
    () => configs.find((config) => String(configId(config)) === selectedConfigId) ?? null,
    [configs, selectedConfigId],
  )
  const units = useMemo(() => (selectedConfig ? availableUnits(selectedConfig) : []), [selectedConfig])
  const selectedUnit = useMemo(
    () => units.find((unit) => String(unitId(unit)) === selectedUnitId) ?? null,
    [selectedUnitId, units],
  )
  const selectedConfigPrice = useMemo(() => (selectedConfig ? configPrice(selectedConfig) : 0), [selectedConfig])
  const selectedLead = useMemo(
    () => leads.find((lead) => String(lead.id) === selectedLeadId) ?? null,
    [leads, selectedLeadId],
  )
  const projectName =
    firstString(project, ["projectName", "name", "propertyName"], initialProject?.name ?? "Selected project")

  const visibleLeads = useMemo(() => {
    const needle = leadSearch.trim().toLowerCase()
    return [...leads]
      .filter((lead) => !needle || leadSearchText(lead).includes(needle))
      .sort((left, right) => {
        const leftProject = String(left.projectId ?? "") === String(projectId) ? 0 : 1
        const rightProject = String(right.projectId ?? "") === String(projectId) ? 0 : 1
        if (leftProject !== rightProject) return leftProject - rightProject
        const leftConfig = selectedConfigId && String(left.configId ?? "") === selectedConfigId ? 0 : 1
        const rightConfig = selectedConfigId && String(right.configId ?? "") === selectedConfigId ? 0 : 1
        if (leftConfig !== rightConfig) return leftConfig - rightConfig
        return left.customer.localeCompare(right.customer)
      })
      .slice(0, 40)
  }, [leadSearch, leads, projectId, selectedConfigId])

  useEffect(() => {
    if (!open) return
    setError("")
  }, [open])

  useEffect(() => {
    if (!open || configTypes.length === 0) return
    if (!selectedType || !configTypes.some((type) => sameText(type, selectedType))) {
      setSelectedType(configTypes[0])
    }
  }, [configTypes, open, selectedType])

  useEffect(() => {
    if (!open) return
    const currentIsValid = configsForType.some((config) => String(configId(config)) === selectedConfigId)
    if (!currentIsValid) {
      setSelectedConfigId(configsForType[0] ? String(configId(configsForType[0])) : "")
    }
  }, [configsForType, open, selectedConfigId])

  useEffect(() => {
    if (!open) return
    const currentIsValid = units.some((unit) => String(unitId(unit)) === selectedUnitId)
    if (!currentIsValid) {
      setSelectedUnitId(units[0] ? String(unitId(units[0])) : "")
    }
  }, [open, selectedUnitId, units])

  useEffect(() => {
    if (buyerMode !== "lead" || !selectedLead) return
    setBuyerName(selectedLead.customerName || selectedLead.customer)
    setBuyerPhone(selectedLead.phone === "-" ? "" : selectedLead.phone)
    setBuyerEmail(selectedLead.email === "-" ? "" : selectedLead.email)
  }, [buyerMode, selectedLead])

  const sellMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConfig || !selectedUnit) throw new Error("Select an available config and unit.")
      if (!buyerName.trim() || !buyerPhone.trim()) throw new Error("Buyer name and phone number are required.")

      const payload: Record<string, unknown> = {
        configurationId: numberOrString(configId(selectedConfig) as Primitive),
        unitId: numberOrString(unitId(selectedUnit) as Primitive),
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        amount: selectedConfigPrice,
      }
      if (buyerEmail.trim()) payload.buyerEmail = buyerEmail.trim()
      const traceNotes = [
        notes.trim(),
        selectedLead ? `CRM lead ${selectedLead.id}: ${selectedLead.customerName || selectedLead.customer}` : "",
      ].filter(Boolean)
      if (traceNotes.length) payload.notes = traceNotes.join(" | ")

      return estateApi.projects.sell(projectId, payload)
    },
    onSuccess: async () => {
      if (buyerMode === "lead" && selectedLead) {
        await estateApi.leads.updateStatus({ leadId: numberOrString(selectedLead.id), status: "CLOSED" }).catch(() => undefined)
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["v0", "projects"] }),
        queryClient.invalidateQueries({ queryKey: ["v0", "sales"] }),
        queryClient.invalidateQueries({ queryKey: ["v0", "project-detail", String(projectId)] }),
        queryClient.invalidateQueries({ queryKey: ["v0", "sell-project-detail", String(projectId)] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sales.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.all }),
      ])
      onSold?.()
      onOpenChange(false)
    },
    onError: (cause) => {
      setError(cause instanceof Error ? cause.message : "Sale could not be recorded.")
    },
  })

  const canSubmit =
    Boolean(selectedConfig && selectedUnit && buyerName.trim() && buyerPhone.trim()) && !sellMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Sell unit</DialogTitle>
          <DialogDescription>
            Record a sale for {projectName}. Only available child config units are shown.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault()
            sellMutation.mutate()
          }}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Config type">
              <Select value={selectedType} onValueChange={setSelectedType} disabled={configTypes.length === 0}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select config type" />
                </SelectTrigger>
                <SelectContent>
                  {configTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {titleCase(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Config">
              <Select value={selectedConfigId} onValueChange={setSelectedConfigId} disabled={configsForType.length === 0}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select config" />
                </SelectTrigger>
                <SelectContent>
                  {configsForType.map((config) => {
                    const id = String(configId(config))
                    return (
                      <SelectItem key={id} value={id}>
                        {configLabel(config)} / {availableUnits(config).length} available / {formatInr(configPrice(config))}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Unit">
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId} disabled={units.length === 0}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => {
                    const id = String(unitId(unit))
                    return (
                      <SelectItem key={id} value={id}>
                        {unitLabel(unit)}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {projectQuery.isFetching ? (
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Refreshing available inventory
            </div>
          ) : null}

          {!projectQuery.isFetching && configs.length === 0 ? (
            <div className="border-border bg-muted/30 rounded-lg border p-4 text-sm text-muted-foreground">
              No available config units were returned for this project.
            </div>
          ) : null}

          <div className="border-border/70 rounded-xl border bg-muted/20 p-3">
            <div className="mb-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={buyerMode === "manual" ? "secondary" : "ghost"}
                onClick={() => setBuyerMode("manual")}
              >
                Manual buyer
              </Button>
              <Button
                type="button"
                size="sm"
                variant={buyerMode === "lead" ? "secondary" : "ghost"}
                onClick={() => setBuyerMode("lead")}
              >
                Existing CRM lead
              </Button>
            </div>

            {buyerMode === "lead" ? (
              <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr]">
                <div className="relative">
                  <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <Input
                    value={leadSearch}
                    onChange={(event) => setLeadSearch(event.target.value)}
                    className="h-10 pl-9"
                    placeholder="Search leads by name, phone, email, or project"
                  />
                </div>
                <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleLeads.map((lead) => (
                      <SelectItem key={lead.id} value={String(lead.id)}>
                        {(lead.customerName || lead.customer)} / {lead.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Buyer name">
                <Input value={buyerName} onChange={(event) => setBuyerName(event.target.value)} className="h-10" />
              </Field>
              <Field label="Phone number">
                <Input value={buyerPhone} onChange={(event) => setBuyerPhone(event.target.value)} className="h-10" />
              </Field>
              <Field label="Email optional">
                <Input value={buyerEmail} onChange={(event) => setBuyerEmail(event.target.value)} className="h-10" />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr]">
            <Field label="Final price">
              <Input value={formatInr(selectedConfigPrice)} readOnly className="h-10" />
            </Field>
            <Field label="Notes optional">
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-10" />
            </Field>
          </div>

          {error ? <div className="text-destructive text-sm font-medium">{error}</div> : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="glow-primary gap-1.5" disabled={!canSubmit}>
              {sellMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Sell selected unit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">{label}</Label>
      {children}
    </div>
  )
}
