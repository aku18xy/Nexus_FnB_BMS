"use client";

import * as React from "react";
import Link from "next/link";
import { Header } from "@/components/common/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  StaffHealthRecord,
  TyphoidComplianceStatus,
  TrainingComplianceStatus,
} from "@/types/staff-health";
import {
  computeTyphoidExpiry,
  evaluateStaffHealthStatus,
  calculateCouncilInspectionSummary,
  filterStaffHealthRecords,
  getSampleStaffHealthRecords,
} from "@/lib/compliance/staff-health";
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Plus,
  Download,
  Calendar,
  Syringe,
  GraduationCap,
  Building,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

export default function StaffHealthRegistryPage() {
  const [records, setRecords] = React.useState<StaffHealthRecord[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typhoidFilter, setTyphoidFilter] = React.useState<"ALL" | TyphoidComplianceStatus>("ALL");
  const [trainingFilter, setTrainingFilter] = React.useState<"ALL" | TrainingComplianceStatus>("ALL");
  const [roleFilter, setRoleFilter] = React.useState<"ALL" | string>("ALL");
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [boosterTargetStaff, setBoosterTargetStaff] = React.useState<StaffHealthRecord | null>(null);
  const [notificationMessage, setNotificationMessage] = React.useState<string | null>(null);

  // New Staff Record Form State
  const [newStaff, setNewStaff] = React.useState<Partial<StaffHealthRecord>>({
    fullName: "",
    employeeCode: "",
    icNumber: "",
    role: "Line Cook",
    outletId: "out-01",
    outletName: "Nexus Signature Pavilion (KL)",
    isFoodHandler: true,
    typhoidInjectionDate: new Date().toISOString().split("T")[0],
    typhoidExpiryDate: computeTyphoidExpiry(new Date().toISOString().split("T")[0]),
    typhoidClinicName: "Klinik Mediviron Pavilion",
    typhoidBatchNumber: "TYPH-MY-2024-V01",
    foodHandlerCertNumber: "",
    trainingProvider: "Pusat Latihan Pengendali Makanan Hikmah",
    trainingDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Booster Date Form State
  const [boosterDate, setBoosterDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [boosterClinic, setBoosterClinic] = React.useState("Klinik Mediviron Pavilion");
  const [boosterBatch, setBoosterBatch] = React.useState("TYPH-MY-2024-B99");

  // Load sample records on mount
  React.useEffect(() => {
    setRecords(getSampleStaffHealthRecords());
  }, []);

  const summary = React.useMemo(() => calculateCouncilInspectionSummary(records), [records]);

  const filteredRecords = React.useMemo(() => {
    return filterStaffHealthRecords(records, {
      searchQuery,
      typhoidStatus: typhoidFilter,
      trainingStatus: trainingFilter,
      role: roleFilter,
    });
  }, [records, searchQuery, typhoidFilter, trainingFilter, roleFilter]);

  const availableRoles = React.useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => set.add(r.role));
    return Array.from(set);
  }, [records]);

  // Handle Injection Date change to auto-calculate 3-year expiry
  const handleInjectionDateChange = (dateStr: string) => {
    const computedExpiry = computeTyphoidExpiry(dateStr);
    setNewStaff((prev) => ({
      ...prev,
      typhoidInjectionDate: dateStr,
      typhoidExpiryDate: computedExpiry,
    }));
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.fullName || !newStaff.employeeCode || !newStaff.icNumber) {
      alert("Please enter Full Name, Employee Code, and Malaysian IC / NRIC Number.");
      return;
    }

    const injectionDate = newStaff.typhoidInjectionDate || new Date().toISOString().split("T")[0];
    const expiryDate = newStaff.typhoidExpiryDate || computeTyphoidExpiry(injectionDate);

    const created: StaffHealthRecord = {
      id: `stf-${Date.now()}`,
      employeeCode: newStaff.employeeCode.trim().toUpperCase(),
      fullName: newStaff.fullName.trim(),
      icNumber: newStaff.icNumber.trim(),
      role: newStaff.role || "Line Cook",
      outletId: newStaff.outletId || "out-01",
      outletName: newStaff.outletName || "Nexus Signature Pavilion (KL)",
      isFoodHandler: newStaff.isFoodHandler ?? true,
      typhoidInjectionDate: injectionDate,
      typhoidExpiryDate: expiryDate,
      typhoidClinicName: newStaff.typhoidClinicName || "",
      typhoidBatchNumber: newStaff.typhoidBatchNumber || "",
      foodHandlerCertNumber: newStaff.foodHandlerCertNumber?.trim() || "",
      trainingProvider: newStaff.trainingProvider || "",
      trainingDate: newStaff.trainingDate || "",
      notes: newStaff.notes || "",
    };

    setRecords((prev) => [created, ...prev]);
    setIsAddModalOpen(false);
    setNotificationMessage(`Successfully registered ${created.fullName} in Staff Health Registry.`);
    setTimeout(() => setNotificationMessage(null), 4000);
  };

  const handleApplyBoosterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boosterTargetStaff) return;

    const newExpiry = computeTyphoidExpiry(boosterDate);

    setRecords((prev) =>
      prev.map((r) =>
        r.id === boosterTargetStaff.id
          ? {
              ...r,
              typhoidInjectionDate: boosterDate,
              typhoidExpiryDate: newExpiry,
              typhoidClinicName: boosterClinic,
              typhoidBatchNumber: boosterBatch,
              notes: `${r.notes || ""}\nBooster renewed on ${boosterDate} at ${boosterClinic}.`.trim(),
            }
          : r
      )
    );

    setNotificationMessage(
      `Updated 3-year Typhoid booster for ${boosterTargetStaff.fullName}. New expiry: ${newExpiry}`
    );
    setTimeout(() => setNotificationMessage(null), 4000);
    setBoosterTargetStaff(null);
  };

  const handleExportCsv = () => {
    const headers = [
      "Employee Code",
      "Full Name",
      "NRIC / Passport",
      "Role",
      "Food Handler",
      "Typhoid Injection Date",
      "Typhoid Expiry Date (3yr)",
      "Typhoid Status",
      "Days Remaining",
      "SLPM Cert Number",
      "Training Date",
      "PBT Audit Ready",
    ];

    const rows = filteredRecords.map((r) => {
      const evalResult = evaluateStaffHealthStatus(r);
      return [
        `"${r.employeeCode}"`,
        `"${r.fullName}"`,
        `"${r.icNumber}"`,
        `"${r.role}"`,
        r.isFoodHandler ? "YES" : "NO",
        `"${r.typhoidInjectionDate}"`,
        `"${r.typhoidExpiryDate}"`,
        `"${evalResult.typhoidStatus}"`,
        evalResult.daysUntilTyphoidExpiry,
        `"${r.foodHandlerCertNumber}"`,
        `"${r.trainingDate}"`,
        evalResult.isAuditReady ? "COMPLIANT" : "NON_COMPLIANT",
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `PBT_DBKL_MBPJ_Staff_Health_Dossier_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <Header />

      <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Link href="/" className="hover:text-emerald-400 transition-colors">
              FOH POS
            </Link>
            <span>/</span>
            <span className="text-white font-medium">Compliance & Operations</span>
            <span>/</span>
            <span className="text-blue-400 font-semibold">Staff Health Registry</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/halal"
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              JAKIM Halal Registry
              <ArrowRight className="w-3 h-3 text-slate-500" />
            </Link>
          </div>
        </div>

        {/* Hero Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              TSK-HAL-02 KKM &amp; PBT Statutory Health Compliance
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Staff Health &amp; Municipal Council (PBT) Inspection Registry
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Enforces Ministry of Health (KKM) Food Hygiene Regulations 2009. Tracks compulsory
              3-year Typhoid Injections (*Suntikan Tifoid*) with &lt;90-day expiry alerts and KKM-accredited
              SLPM food handler training.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-9 px-4 shadow-lg shadow-blue-900/30 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Register Staff
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCsv}
              className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs h-9 px-4 flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-blue-400" />
              Export PBT Dossier
            </Button>
          </div>
        </div>

        {/* Notification Toast */}
        {notificationMessage && (
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
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

        {/* PBT Readiness & Compliance Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Main Council Audit Score Gauge */}
          <Card
            className={`sm:col-span-2 border ${
              summary.readinessScore >= 95
                ? "border-emerald-800/60 bg-emerald-950/20"
                : summary.readinessScore >= 80
                ? "border-amber-800/60 bg-amber-950/20"
                : "border-rose-800/60 bg-rose-950/30"
            }`}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-400" />
                  PBT Council Readiness Score (DBKL / MBPJ)
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span
                    className={`text-3xl font-black ${
                      summary.readinessScore >= 95
                        ? "text-emerald-300"
                        : summary.readinessScore >= 80
                        ? "text-amber-300"
                        : "text-rose-400"
                    }`}
                  >
                    {summary.readinessScore}%
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                    Grade {summary.grade}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {summary.fullyCompliantCount} of {summary.totalFoodHandlers} food handlers 100%
                  audit-compliant.
                </div>
              </div>

              {summary.estimatedFineRiskMYR > 0 && (
                <div className="text-right">
                  <span className="text-[10px] text-rose-400 font-medium block">
                    Compound Fine Risk
                  </span>
                  <span className="text-sm font-mono font-bold text-rose-400">
                    RM {summary.estimatedFineRiskMYR.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    Food Act 1983 liability
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Valid Typhoid */}
          <Card className="border-emerald-900/40 bg-emerald-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-emerald-400">Typhoid Valid</span>
                <Syringe className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-300 mt-1">
                {summary.typhoidValidCount}
              </div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5">&gt; 90 Days Left (3-yr)</div>
            </CardContent>
          </Card>

          {/* Expiring Soon Typhoid */}
          <Card className="border-amber-900/40 bg-amber-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-amber-400">Typhoid Warning</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-300 mt-1">
                {summary.typhoidExpiringSoonCount}
              </div>
              <div className="text-[10px] text-amber-400/80 mt-0.5">&le; 90 Days Expiry Alert</div>
            </CardContent>
          </Card>

          {/* Non-Compliant (Expired or Missing Training) */}
          <Card className="border-rose-900/60 bg-rose-950/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-rose-400">Non-Compliant</span>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-black text-rose-400 mt-1">
                {summary.typhoidExpiredCount + summary.trainingMissingCount}
              </div>
              <div className="text-[10px] text-rose-400/80 mt-0.5">Expired / Missing SLPM</div>
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
                  placeholder="Search staff name, employee code, NRIC, role, or SLPM cert..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Roles</option>
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                {/* Training Filter */}
                <select
                  value={trainingFilter}
                  onChange={(e) =>
                    setTrainingFilter(e.target.value as "ALL" | TrainingComplianceStatus)
                  }
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Training Status</option>
                  <option value="CERTIFIED">SLPM Certified</option>
                  <option value="MISSING">Missing Training</option>
                </select>
              </div>
            </div>

            {/* Typhoid Status Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400 mr-2">Typhoid Validity:</span>
              <button
                onClick={() => setTyphoidFilter("ALL")}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  typhoidFilter === "ALL"
                    ? "bg-slate-700 text-white font-semibold"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                All Staff ({records.length})
              </button>
              <button
                onClick={() => setTyphoidFilter("VALID")}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  typhoidFilter === "VALID"
                    ? "bg-emerald-600 text-white font-semibold"
                    : "bg-slate-900 text-emerald-400 hover:bg-slate-800 border border-emerald-900/40"
                }`}
              >
                Valid ({summary.typhoidValidCount})
              </button>
              <button
                onClick={() => setTyphoidFilter("EXPIRING_WARNING")}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  typhoidFilter === "EXPIRING_WARNING"
                    ? "bg-amber-600 text-white font-semibold"
                    : "bg-slate-900 text-amber-400 hover:bg-slate-800 border border-amber-900/40"
                }`}
              >
                Expiring &lt;90d ({summary.typhoidExpiringSoonCount})
              </button>
              <button
                onClick={() => setTyphoidFilter("EXPIRED")}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  typhoidFilter === "EXPIRED"
                    ? "bg-rose-800 text-white font-semibold"
                    : "bg-slate-900 text-rose-500 hover:bg-slate-800 border border-rose-900/60"
                }`}
              >
                Expired ({summary.typhoidExpiredCount})
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
                  <th className="py-3 px-4">Audit Status</th>
                  <th className="py-3 px-4">Staff Member &amp; Code</th>
                  <th className="py-3 px-4">Malaysian NRIC</th>
                  <th className="py-3 px-4">Typhoid Injection (3-Yr)</th>
                  <th className="py-3 px-4">Food Handler Training (SLPM)</th>
                  <th className="py-3 px-4">Role &amp; Outlet</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No staff health records matching the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => {
                    const evalResult = evaluateStaffHealthStatus(record);
                    const isExpanded = expandedRowId === record.id;

                    return (
                      <React.Fragment key={record.id}>
                        <tr
                          className={`hover:bg-slate-800/40 transition-colors ${
                            !evalResult.isAuditReady
                              ? evalResult.typhoidStatus === "EXPIRED"
                                ? "bg-rose-950/15"
                                : "bg-amber-950/10"
                              : ""
                          }`}
                        >
                          {/* Audit Status */}
                          <td className="py-3 px-4">
                            {evalResult.isAuditReady ? (
                              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Compliant</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                <span>Audit Breach</span>
                              </div>
                            )}
                            <span className="block text-[10px] text-slate-400 mt-0.5 font-mono">
                              Risk: {evalResult.compoundRisk}
                            </span>
                          </td>

                          {/* Staff Name & Code */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{record.fullName}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-blue-400 bg-blue-950/40 px-1.5 py-0.2 rounded border border-blue-800/30">
                                {record.employeeCode}
                              </span>
                              {record.isFoodHandler && (
                                <span className="text-[10px] text-emerald-400 font-medium">
                                  Food Handler
                                </span>
                              )}
                            </div>
                          </td>

                          {/* NRIC */}
                          <td className="py-3 px-4 font-mono text-slate-300 text-[11px]">
                            {record.icNumber}
                          </td>

                          {/* Typhoid Injection Status & Expiry */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              <Badge variant={evalResult.typhoidBadgeVariant}>
                                {evalResult.typhoidLabel}
                              </Badge>
                              <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-300">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>Exp: {record.typhoidExpiryDate}</span>
                              </div>
                            </div>
                          </td>

                          {/* Food Handler Training (SLPM) */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              <Badge variant={evalResult.trainingBadgeVariant}>
                                {evalResult.trainingLabel}
                              </Badge>
                              {record.foodHandlerCertNumber ? (
                                <span className="font-mono text-[10px] text-slate-400">
                                  {record.foodHandlerCertNumber}
                                </span>
                              ) : (
                                <span className="text-[10px] text-rose-400 italic">
                                  Registration required
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Role & Outlet */}
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-200">{record.role}</div>
                            <div className="text-[10px] text-slate-400">{record.outletName}</div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {evalResult.typhoidStatus !== "VALID" && (
                                <button
                                  onClick={() => setBoosterTargetStaff(record)}
                                  className="text-[10px] font-semibold px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                                  title="Record 3-year Typhoid Injection Booster"
                                >
                                  <Syringe className="w-3 h-3" />
                                  Booster
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

                        {/* Expanded Detail Row */}
                        {isExpanded && (
                          <tr className="bg-slate-950/60 border-b border-slate-800">
                            <td colSpan={7} className="p-4">
                              <div className="bg-slate-900/90 rounded-lg p-4 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                <div>
                                  <span className="text-slate-400 font-medium block">
                                    Typhoid Administration Details:
                                  </span>
                                  <p className="text-slate-200 mt-1">
                                    Clinic: {record.typhoidClinicName || "Not recorded"}
                                  </p>
                                  <p className="text-slate-300 font-mono mt-0.5">
                                    Batch #: {record.typhoidBatchNumber || "N/A"}
                                  </p>
                                  <p className="text-slate-400 text-[11px] mt-1">
                                    Injection Date: {record.typhoidInjectionDate} (Strictly 36-month
                                    validity)
                                  </p>
                                </div>

                                <div>
                                  <span className="text-slate-400 font-medium block">
                                    SLPM Training Accreditation:
                                  </span>
                                  <p className="text-slate-200 mt-1">
                                    Provider: {record.trainingProvider || "Pending assignment"}
                                  </p>
                                  <p className="text-slate-300 font-mono mt-0.5">
                                    Certificate: {record.foodHandlerCertNumber || "Pending"}
                                  </p>
                                  <p className="text-slate-400 text-[11px] mt-1">
                                    Training Completed: {record.trainingDate || "Not recorded"}
                                  </p>
                                </div>

                                <div>
                                  <span className="text-slate-400 font-medium block">
                                    Statutory Audit Assessment:
                                  </span>
                                  <p className="text-slate-300 mt-1 italic">
                                    {record.notes || "No operational health notes logged."}
                                  </p>
                                  <div className="mt-3 flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setBoosterTargetStaff(record)}
                                      className="text-xs h-7 border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5"
                                    >
                                      <Syringe className="w-3.5 h-3.5 text-blue-400" />
                                      Record New Booster
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

        {/* Modal: Register New Staff */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">Register Staff Health Record</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddStaffSubmit} className="space-y-4 pt-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ahmad bin Mansor"
                      value={newStaff.fullName || ""}
                      onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Employee Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. NX-KTH-09"
                      value={newStaff.employeeCode || ""}
                      onChange={(e) => setNewStaff({ ...newStaff, employeeCode: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Malaysian NRIC / Passport *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 960514-10-5231"
                      value={newStaff.icNumber || ""}
                      onChange={(e) => setNewStaff({ ...newStaff, icNumber: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Role</label>
                    <select
                      value={newStaff.role || "Line Cook"}
                      onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="Head Chef">Head Chef</option>
                      <option value="Sous Chef">Sous Chef</option>
                      <option value="Line Cook">Line Cook</option>
                      <option value="Head Barista">Head Barista</option>
                      <option value="Barista">Barista</option>
                      <option value="Pastry Chef">Pastry Chef</option>
                      <option value="Kitchen Helper">Kitchen Helper</option>
                      <option value="Senior Service Crew">Senior Service Crew</option>
                      <option value="Junior Service Crew">Junior Service Crew</option>
                      <option value="Outlet Manager">Outlet Manager</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-400 flex items-center gap-1.5">
                      <Syringe className="w-3.5 h-3.5" />
                      Typhoid Vaccination (Suntikan Tifoid)
                    </span>
                    <span className="text-[10px] text-slate-400">Strictly 3-Year Validity</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Injection Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={newStaff.typhoidInjectionDate || ""}
                        onChange={(e) => handleInjectionDateChange(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Auto-Computed Expiry Date (3 Yrs)
                      </label>
                      <input
                        type="date"
                        disabled
                        value={newStaff.typhoidExpiryDate || ""}
                        className="w-full bg-slate-950/70 border border-slate-800/80 rounded-lg px-3 py-2 text-emerald-400 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Administering Clinic
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Klinik Mediviron"
                        value={newStaff.typhoidClinicName || ""}
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, typhoidClinicName: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Vaccine Batch Serial
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. TYPH-2024-V01"
                        value={newStaff.typhoidBatchNumber || ""}
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, typhoidBatchNumber: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-3">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                    KKM Food Handler Training (SLPM)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        SLPM Certificate Serial No.
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SLPM-KKM-2024-9912"
                        value={newStaff.foodHandlerCertNumber || ""}
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, foodHandlerCertNumber: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Training Date
                      </label>
                      <input
                        type="date"
                        value={newStaff.trainingDate || ""}
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, trainingDate: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Accredited Training Provider (SLPM)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pusat Latihan Pengendali Makanan Hikmah"
                      value={newStaff.trainingProvider || ""}
                      onChange={(e) =>
                        setNewStaff({ ...newStaff, trainingProvider: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Health Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Allergies, medical exemptions, or upcoming booster schedule..."
                    value={newStaff.notes || ""}
                    onChange={(e) => setNewStaff({ ...newStaff, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
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
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">
                    Save Staff Record
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Record Typhoid Booster */}
        {boosterTargetStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Syringe className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-white">Record Typhoid Booster</h3>
                </div>
                <button
                  onClick={() => setBoosterTargetStaff(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleApplyBoosterSubmit} className="space-y-4 pt-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Staff Member:</span>
                  <span className="font-semibold text-white text-sm">
                    {boosterTargetStaff.fullName} ({boosterTargetStaff.employeeCode})
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    New Injection Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={boosterDate}
                    onChange={(e) => setBoosterDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-emerald-400 mt-1 block">
                    Calculated new 3-year expiry: {computeTyphoidExpiry(boosterDate)}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Clinic Name</label>
                  <input
                    type="text"
                    value={boosterClinic}
                    onChange={(e) => setBoosterClinic(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Vaccine Batch No.</label>
                  <input
                    type="text"
                    value={boosterBatch}
                    onChange={(e) => setBoosterBatch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBoosterTargetStaff(null)}
                    className="border-slate-800 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">
                    Confirm Renewal
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
