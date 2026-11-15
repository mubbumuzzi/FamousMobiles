"use client";

import { useEffect, useState } from "react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, selectClassName } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { StaffUser, UserRole } from "@/lib/types";
import { cn, formatRole } from "@/lib/utils";
import { Bike, Check, X } from "lucide-react";

const STAFF_ROLES: UserRole[] = ["SALESMAN", "TECHNICIAN"];

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  SALESMAN: "Salesman",
  TECHNICIAN: "Technician",
};

export default function StaffPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    password: "",
    role: "SALESMAN" as UserRole,
    doorstepEnabled: false,
  });

  const load = () => api<StaffUser[]>("/users").then(setStaff).catch(console.error);

  useEffect(() => {
    if (user?.role === "ADMIN") load();
  }, [user?.role]);

  const create = async () => {
    setError("");
    try {
      await api("/users", { method: "POST", body: JSON.stringify(form) });
      setShowForm(false);
      setForm({ fullName: "", mobile: "", password: "", role: "SALESMAN", doorstepEnabled: false });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add staff");
    }
  };

  const toggleDoorstep = async (member: StaffUser) => {
    if (member.role === "ADMIN" || member.mobile === "6302255467") return;
    const targetState = !member.doorstepEnabled;
    setTogglingId(member.id);
    setError("");

    // Optimistic UI update
    setStaff((prev) =>
      prev.map((s) => (s.id === member.id ? { ...s, doorstepEnabled: targetState } : s))
    );

    try {
      const updated = await api<StaffUser>(`/users/${member.id}/doorstep?enabled=${targetState}`, {
        method: "PATCH",
      });
      setStaff((prev) => prev.map((s) => (s.id === member.id ? updated : s)));
    } catch (err) {
      // Revert optimistic update on failure
      setStaff((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, doorstepEnabled: !targetState } : s))
      );
      setError(err instanceof Error ? err.message : "Failed to update doorstep permission");
    } finally {
      setTogglingId(null);
    }
  };

  const remove = async (member: StaffUser) => {
    if (!confirm(`Remove ${member.fullName}? They will no longer be able to log in.`)) return;
    setError("");
    try {
      await api(`/users/${member.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove staff");
    }
  };

  const permanentDelete = async (member: StaffUser) => {
    if (!confirm(`Permanently delete ${member.fullName}? This cannot be undone.`)) return;
    setError("");
    try {
      await api(`/users/${member.id}?permanent=true`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to permanently delete staff");
    }
  };

  if (authLoading) return null;
  if (user?.role !== "ADMIN") {
    return (
      <StaffLayout userName={user?.fullName} role={user?.role}>
        <p className="text-slate-600">Only admins can manage staff.</p>
      </StaffLayout>
    );
  }

  const staffMembers = staff.filter((s) => s.role !== "ADMIN");

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-5 animate-fade-in text-[#121212]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[20px] leading-[24px] font-bold text-[#121212] tracking-tight">Staff</h1>
            <p className="text-[12px] leading-[16px] text-[#767676] mt-0.5 max-w-xl">
              Add or remove salesman and technician accounts. Manage access to shop operations and doorstep repairs.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)} className="h-9 px-3 text-xs font-semibold">
            {showForm ? "Cancel" : "Add Staff"}
          </Button>
        </div>

        {showForm && (
          <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field>
                <Label>Full Name</Label>
                <Input
                  placeholder="Staff member name"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </Field>
              <Field>
                <Label>Mobile Number</Label>
                <Input
                  placeholder="10-digit mobile"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                />
              </Field>
              <Field>
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Login password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </Field>
              <Field>
                <Label>Role</Label>
                <select
                  className={selectClassName}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                >
                  {STAFF_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Doorstep Permission Checkbox */}
              <div className="md:col-span-2 pt-1 border-t border-[#F0F0F2]">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-[#121212] select-none">
                  <input
                    type="checkbox"
                    checked={form.doorstepEnabled}
                    onChange={(e) => setForm({ ...form, doorstepEnabled: e.target.checked })}
                    className="h-4 w-4 rounded border-[#D1D5DB] text-black focus:ring-black cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <Bike className="h-4 w-4 text-[#121212]" />
                    <span>Enable Doorstep Repairs Access</span>
                  </div>
                </label>
                <p className="text-[11px] text-[#767676] mt-0.5 ml-6.5">
                  Allows this staff member to view, accept, and service online doorstep repair bookings.
                </p>
              </div>

              <Button variant="primary" className="md:col-span-2 h-10 text-xs font-semibold" onClick={create}>
                Save Staff Member
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-[#C5221F]">{error}</p>}

        <div className="overflow-x-auto rounded-[12px] border border-[#EBEBEB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="border-b border-[#EBEBEB] bg-[#F7F7F8] text-left">
                <th className="px-4 py-2.5 font-semibold text-[#767676] text-xs">Name</th>
                <th className="px-4 py-2.5 font-semibold text-[#767676] text-xs">Mobile</th>
                <th className="px-4 py-2.5 font-semibold text-[#767676] text-xs">Role</th>
                <th className="px-4 py-2.5 font-semibold text-[#767676] text-xs">Doorstep Access</th>
                <th className="px-4 py-2.5 font-semibold text-[#767676] text-xs">Status</th>
                <th className="px-4 py-2.5 font-semibold text-[#767676] text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffMembers.map((member) => {
                const isAdminAccount = member.role === "ADMIN" || member.mobile === "6302255467";
                const isEnabled = isAdminAccount || member.doorstepEnabled;

                return (
                  <tr key={member.id} className="border-b border-[#EBEBEB] last:border-0 hover:bg-[#F7F7F8] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#121212]">{member.fullName}</td>
                    <td className="px-4 py-3 text-[#767676] font-mono text-xs">{member.mobile}</td>
                    <td className="px-4 py-3 text-[#121212]">{formatRole(member.role)}</td>
                    <td className="px-4 py-3">
                      {isAdminAccount ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="h-3 w-3" />
                          Always Active (Admin)
                        </span>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            disabled={togglingId === member.id || !member.active}
                            onClick={() => toggleDoorstep(member)}
                            className={cn(
                              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#121212] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
                              isEnabled ? "bg-emerald-600" : "bg-[#D1D5DB]"
                            )}
                            title={isEnabled ? "Click to disable Doorstep access" : "Click to enable Doorstep access"}
                            aria-label={`Toggle doorstep access for ${member.fullName}`}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                isEnabled ? "translate-x-5" : "translate-x-0"
                              )}
                            />
                          </button>
                          <span className={cn(
                            "text-xs font-medium",
                            isEnabled ? "text-emerald-700" : "text-[#767676]"
                          )}>
                            {isEnabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={member.active ? "success" : "destructive"}>
                        {member.active ? "Active" : "Removed"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {member.active && (
                          <Button size="sm" variant="secondary" className="h-8 text-xs border border-[#EBEBEB]" onClick={() => remove(member)}>
                            Remove
                          </Button>
                        )}
                        {!member.active && (
                          <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => permanentDelete(member)}>
                            Permanent Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {staffMembers.length === 0 && (
            <p className="py-8 text-center text-xs text-[#767676]">No staff members yet</p>
          )}
        </div>
      </div>
    </StaffLayout>
  );
}
