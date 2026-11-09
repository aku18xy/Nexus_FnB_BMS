"use client";

import * as React from "react";
import Link from "next/link";
import { Header } from "@/components/common/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  HalalCertificationRecord,
  HalalCertBody,
  HalalEscalationStatus,
} from "@/types/halal";
import {
  evaluateHalalStatus,
  computeHalalSummary,
  filterHalalRecords,
  getSampleHalalRecords,
} from "@/lib/halal/halal-tracker";
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  Download,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Users,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

export default function HalalRegistryPage() {
  const [records, setRecords] = React.useState<HalalCertificationRecord[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | HalalEscalationStatus>("ALL");
  const [bodyFilter, setBodyFilter] = React.useState<"ALL" | string>("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState<"ALL" | string>("ALL");
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [notificationMessage, setNotificationMessage] = React.useState<string | null>(null);

  // New Record Form State
  const [newRecord, setNewRecord] = React.useState<Partial<HalalCertificationRecord>>({
    ingredientName: "",
    ingredientSku: "",
    category: "Poultry & Meat",
    supplierName: "",
    supplierContact: "",
    certifyingBody: "JAKIM",
    certNumber: "",
    issueDate: new Date().toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
    isHalalCertified: true,
    notes: "",
  });

  // Initialize sample data on client mount
  React.useEffect(() => {
    setRecords(getSampleHalalRecords());
  }, []);

  const summary = React.useMemo(() => computeHalalSummary(records), [records]);

  const filteredRecords = React.useMemo(() => {
    return filterHalalRecords(records, {
      searchQuery,
      status: statusFilter,
      certifyingBody: bodyFilter,
      category: categoryFilter,
    });
  }, [records, searchQuery, statusFilter, bodyFilter, categoryFilter]);

  // Unique lists for filter dropdowns
  const availableBodies = React.useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => set.add(r.certifyingBody));
    return Array.from(set);
  }, [records]);

  const availableCategories = React.useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => set.add(r.category));
    return Array.from(set);
  }, [records]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.ingredientName || !newRecord.ingredientSku || !newRecord.certNumber) {
      alert("Please fill in Ingredient Name, SKU, and Certificate Number.");
      return;
    }

    const created: HalalCertificationRecord = {
      id: `hal-${Date.now()}`,
      ingredientSku: newRecord.ingredientSku.trim().toUpperCase(),
      ingredientName: newRecord.ingredientName.trim(),
      category: newRecord.category || "Poultry & Meat",
      supplierName: newRecord.supplierName || "Direct Supplier",
      supplierContact: newRecord.supplierContact || "",
      certifyingBody: newRecord.certifyingBody || "JAKIM",
      certNumber: newRecord.certNumber.trim(),
      issueDate: newRecord.issueDate || new Date().toISOString().split("T")[0],
      expiryDate: newRecord.expiryDate || new Date().toISOString().split("T")[0],
      isHalalCertified: true,
      notes: newRecord.notes || "",
    };

    setRecords((prev) => [created, ...prev]);
    setIsAddModalOpen(false);
    setNewRecord({
      ingredientName: "",
      ingredientSku: "",
      category: "Poultry & Meat",
      supplierName: "",
      supplierContact: "",
      certifyingBody: "JAKIM",
      certNumber: "",
      issueDate: new Date().toISOString().split("T")[0],
      expiryDate: new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
      isHalalCertified: true,
      notes: "",
    });

    setNotificationMessage(`Successfully added ${created.ingredientName} to Halal Registry.`);
    setTimeout(() => setNotificationMessage(null), 4000);
  };

  const handleExportCsv = () => {
    const headers = [
      "SKU",
      "Ingredient Name",
      "Category",
      "Supplier",
      "Cert Body",
      "Cert Number",
      "Expiry Date",
      "Status",
      "Days Remaining",
    ];
    const rows = filteredRecords.map((r) => {
      const evalResult = evaluateHalalStatus(r.expiryDate, r.isHalalCertified);
      return [
        `"${r.ingredientSku}"`,
        `"${r.ingredientName}"`,
        `"${r.category}"`,
        `"${r.supplierName}"`,
        `"${r.certifyingBody}"`,
        `"${r.certNumber}"`,
        `"${r.expiryDate}"`,
        `"${evalResult.status}"`,
        evalResult.daysRemaining,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `JAKIM_Halal_Audit_Registry_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTriggerRenewalAlert = (record: HalalCertificationRecord) => {
    const evalResult = evaluateHalalStatus(record.expiryDate, record.isHalalCertified);
    setNotificationMessage(
      `Triggered renewal alert to ${record.supplierName} (${record.certNumber}). Status: ${evalResult.label}`
    );
    setTimeout(() => setNotificationMessage(null), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <Header />

      <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Navigation Breadcrumb & Quick Switch */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Link href="/" className="hover:text-emerald-400 transition-colors">
              FOH POS
            </Link>
            <span>/</span>
            <span className="text-white font-medium">Compliance & Operations</span>
            <span>/</span>
            <span className="text-emerald-400 font-semibold">JAKIM Halal Registry</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/staff-health"
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              Staff Health Registry
              <ArrowRight className="w-3 h-3 text-slate-500" />
            </Link>
          </div>
        </div>

        {/* Hero Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              TSK-HAL-01 Statutory Supply Traceability
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              JAKIM Halal Certification Registry & Expiry Escalation
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Real-time audit registry for raw food ingredients, certified suppliers, and Islamic
              certifying bodies (JAKIM, MUIS, CICOT, BPJPH, IFANCA). Enforces automated 60-day &amp;
              30-day renewal escalation triggers.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 px-4 shadow-lg shadow-emerald-900/30 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Certificate
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCsv}
              className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs h-9 px-4 flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Export Audit CSV
            </Button>
          </div>
        </div>

        {/* Notification Toast */}
        {notificationMessage && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{notificationMessage}</span>
            </div>
            <button
              onClick={() => setNotificationMessage(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="border-slate-800 bg-slate-900/70">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">Total Monitored</span>
                <Building2 className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-black text-white mt-1">{summary.totalCount}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Ingredients &amp; Raw Stock</div>
            </CardContent>
          </Card>

          <Card className="border-emerald-900/40 bg-emerald-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-emerald-400">Valid Certs</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-300 mt-1">{summary.validCount}</div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5">&gt; 60 Days Validity</div>
            </CardContent>
          </Card>

          <Card className="border-amber-900/40 bg-amber-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-amber-400">Expiring (60d)</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-300 mt-1">
                {summary.expiring60dCount}
              </div>
              <div className="text-[10px] text-amber-400/80 mt-0.5">Notice Triggered</div>
            </CardContent>
          </Card>

          <Card className="border-rose-900/40 bg-rose-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-rose-400">Urgent (30d)</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-300 mt-1">
                {summary.expiring30dCount}
              </div>
              <div className="text-[10px] text-rose-400/80 mt-0.5">Renewal Escalation</div>
            </CardContent>
          </Card>

          <Card className="border-rose-900/60 bg-rose-950/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-rose-400">Expired</span>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-black text-rose-400 mt-1">{summary.expiredCount}</div>
              <div className="text-[10px] text-rose-400/80 mt-0.5">Halt Purchase Orders</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search Toolbar */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search ingredient name, SKU, supplier, cert number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Certifying Body Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={bodyFilter}
                  onChange={(e) => setBodyFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Certifying Bodies</option>
                  {availableBodies.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>

                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Categories</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Filter Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400 mr-2">Filter Status:</span>
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === "ALL"
                    ? "bg-slate-700 text-white font-semibold"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                All ({summary.totalCount})
              </button>
              <button
                onClick={() => setStatusFilter("VALID")}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === "VALID"
                    ? "bg-emerald-600 text-white font-semibold"
                    : "bg-slate-900 text-emerald-400 hover:bg-slate-800 border border-emerald-900/40"
                }`}
              >
                Valid ({summary.validCount})
              </button>
              <button
                onClick={() => setStatusFilter("EXPIRING_SOON_60D")}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === "EXPIRING_SOON_60D"
                    ? "bg-amber-600 text-white font-semibold"
                    : "bg-slate-900 text-amber-400 hover:bg-slate-800 border border-amber-900/40"
                }`}
              >
                Expiring 60d ({summary.expiring60dCount})
              </button>
              <button
                onClick={() => setStatusFilter("EXPIRING_URGENT_30D")}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === "EXPIRING_URGENT_30D"
                    ? "bg-rose-700 text-white font-semibold"
                    : "bg-slate-900 text-rose-400 hover:bg-slate-800 border border-rose-900/40"
                }`}
              >
                Urgent 30d ({summary.expiring30dCount})
              </button>
              <button
                onClick={() => setStatusFilter("EXPIRED")}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === "EXPIRED"
                    ? "bg-rose-800 text-white font-semibold"
                    : "bg-slate-900 text-rose-500 hover:bg-slate-800 border border-rose-900/60"
                }`}
              >
                Expired ({summary.expiredCount})
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Master Registry Table */}
        <Card className="border-slate-800 bg-slate-900/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4">Status &amp; Urgency</th>
                  <th className="py-3 px-4">Ingredient &amp; SKU</th>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Islamic Body</th>
                  <th className="py-3 px-4">Certificate Serial</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No Halal certification records matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => {
                    const evalResult = evaluateHalalStatus(record.expiryDate, record.isHalalCertified);
                    const isExpanded = expandedRowId === record.id;

                    return (
                      <React.Fragment key={record.id}>
                        <tr
                          className={`hover:bg-slate-800/40 transition-colors ${
                            evalResult.status === "EXPIRED"
                              ? "bg-rose-950/10"
                              : evalResult.status === "EXPIRING_URGENT_30D"
                              ? "bg-rose-950/5"
                              : ""
                          }`}
                        >
                          {/* Status Badge */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              <Badge variant={evalResult.badgeVariant}>
                                {evalResult.label}
                              </Badge>
                              {evalResult.daysRemaining > 0 && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {evalResult.daysRemaining} days remaining
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Ingredient & SKU */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{record.ingredientName}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-800/30">
                                {record.ingredientSku}
                              </span>
                              <span className="text-[10px] text-slate-400">{record.category}</span>
                            </div>
                          </td>

                          {/* Supplier */}
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-200">{record.supplierName}</div>
                            {record.supplierContact && (
                              <div className="text-[10px] text-slate-400">{record.supplierContact}</div>
                            )}
                          </td>

                          {/* Certifying Body */}
                          <td className="py-3 px-4">
                            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700">
                              {record.certifyingBody}
                            </span>
                            {record.certifyingBody !== "JAKIM" &&
                              record.certifyingBody !== "JAIS" &&
                              record.certifyingBody !== "JAWI" && (
                                <span className="block text-[9px] text-emerald-400 mt-0.5">
                                  JAKIM Recognized FHCB
                                </span>
                              )}
                          </td>

                          {/* Cert Number */}
                          <td className="py-3 px-4 font-mono text-slate-300 text-[11px]">
                            {record.certNumber}
                          </td>

                          {/* Expiry Date */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 font-mono text-slate-200">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {record.expiryDate}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {evalResult.requiresAction && (
                                <button
                                  onClick={() => handleTriggerRenewalAlert(record)}
                                  className="text-[10px] font-semibold px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                                  title="Trigger Supplier Renewal Alert"
                                >
                                  Alert
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  setExpandedRowId(isExpanded ? null : record.id)
                                }
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Audit Detail Row */}
                        {isExpanded && (
                          <tr className="bg-slate-950/60 border-b border-slate-800">
                            <td colSpan={7} className="p-4">
                              <div className="bg-slate-900/90 rounded-lg p-4 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                <div>
                                  <span className="text-slate-400 font-medium block">
                                    Statutory Framework &amp; Standards:
                                  </span>
                                  <p className="text-slate-200 mt-1">
                                    MS 1500:2009 Halal Food Guidelines / Manual Pengesahan Halal Malaysia
                                    (MPPHM 2020)
                                  </p>
                                  <span className="text-slate-400 font-medium block mt-2">
                                    Issue Date:
                                  </span>
                                  <p className="text-slate-200 font-mono">
                                    {record.issueDate || "Not recorded"}
                                  </p>
                                </div>

                                <div>
                                  <span className="text-slate-400 font-medium block">
                                    Escalation Tier:
                                  </span>
                                  <p className="text-slate-200 font-mono mt-1">
                                    {evalResult.escalationTier}
                                  </p>
                                  <span className="text-slate-400 font-medium block mt-2">
                                    Audit Compliance Status:
                                  </span>
                                  <p
                                    className={`font-semibold ${
                                      evalResult.isAuditBreach
                                        ? "text-rose-400"
                                        : "text-emerald-400"
                                    }`}
                                  >
                                    {evalResult.isAuditBreach
                                      ? "AUDIT BREACH: Expired Certificate - PO Blocked"
                                      : "Audit Pass: Compliant for Food Prep"}
                                  </p>
                                </div>

                                <div>
                                  <span className="text-slate-400 font-medium block">
                                    Internal Audit Notes:
                                  </span>
                                  <p className="text-slate-300 mt-1 italic">
                                    {record.notes || "No additional audit notes logged."}
                                  </p>
                                  <div className="mt-3 flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleTriggerRenewalAlert(record)}
                                      className="text-xs h-7 border-slate-700 text-slate-300 hover:text-white"
                                    >
                                      Send Renewal Email
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal: Add Halal Certificate */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">Add Halal Ingredient Certificate</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4 pt-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Ingredient Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cap Sauh Flour"
                      value={newRecord.ingredientName || ""}
                      onChange={(e) =>
                        setNewRecord({ ...newRecord, ingredientName: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Ingredient SKU *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ING-FLR-02"
                      value={newRecord.ingredientSku || ""}
                      onChange={(e) =>
                        setNewRecord({ ...newRecord, ingredientSku: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Category</label>
                    <select
                      value={newRecord.category || "Poultry & Meat"}
                      onChange={(e) => setNewRecord({ ...newRecord, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Poultry & Meat">Poultry &amp; Meat</option>
                      <option value="Dairy & Beverage">Dairy &amp; Beverage</option>
                      <option value="Grains & Baking">Grains &amp; Baking</option>
                      <option value="Oils & Fats">Oils &amp; Fats</option>
                      <option value="Beverage Ingredients">Beverage Ingredients</option>
                      <option value="Seasoning & Spices">Seasoning &amp; Spices</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Certifying Islamic Body *
                    </label>
                    <select
                      value={newRecord.certifyingBody || "JAKIM"}
                      onChange={(e) =>
                        setNewRecord({
                          ...newRecord,
                          certifyingBody: e.target.value as HalalCertBody,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="JAKIM">JAKIM (Malaysia)</option>
                      <option value="JAIS">JAIS (Selangor)</option>
                      <option value="JAWI">JAWI (Kuala Lumpur)</option>
                      <option value="MUIS">MUIS (Singapore - Recognized FHCB)</option>
                      <option value="CICOT">CICOT (Thailand - Recognized FHCB)</option>
                      <option value="BPJPH">BPJPH (Indonesia - Recognized FHCB)</option>
                      <option value="IFANCA">IFANCA (USA - Recognized FHCB)</option>
                      <option value="OTHER">Other Recognized Body</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Certificate Serial Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. JAKIM.MS1500:2009-1099-01"
                      value={newRecord.certNumber || ""}
                      onChange={(e) => setNewRecord({ ...newRecord, certNumber: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Supplier Name</label>
                    <input
                      type="text"
                      placeholder="e.g. FFM Berhad"
                      value={newRecord.supplierName || ""}
                      onChange={(e) =>
                        setNewRecord({ ...newRecord, supplierName: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Issue Date</label>
                    <input
                      type="date"
                      value={newRecord.issueDate || ""}
                      onChange={(e) => setNewRecord({ ...newRecord, issueDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Expiry Date *</label>
                    <input
                      type="date"
                      required
                      value={newRecord.expiryDate || ""}
                      onChange={(e) => setNewRecord({ ...newRecord, expiryDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Audit Notes / Supplier Contact
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter supplier contact number, warehouse location, or renewal reminders..."
                    value={newRecord.notes || ""}
                    onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddModalOpen(false)}
                    className="border-slate-800 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                    Save Certificate
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
