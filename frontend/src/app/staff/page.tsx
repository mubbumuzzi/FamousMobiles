"use client";

import { useEffect, useState } from "react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Label, selectClassName } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { StaffUser, UserRole } from "@/lib/types";
import { formatRole } from "@/lib/utils";

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
  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    password: "",
    role: "SALESMAN" as UserRole,
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
      setForm({ fullName: "", mobile: "", password: "", role: "SALESMAN" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add staff");
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
              Add or remove salesman and technician accounts. Technicians added here also appear on the Technicians page for job assignment.
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
              <Button variant="primary" className="md:col-span-2 h-10 text-xs font-semibold" onClick={create}>
                Save Staff Member
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-[#C5221F]">{error}</p>}

        <div className="overflow-x-auto rounded-[12px] border border-[#EBEBEB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-[#EBEBEB] bg-[#F7F7F8] text-left">
                <th className="px-4 py-2.5 font-semibold text-[#767676] text-xs">Name</th>
                <th className="px-4 py-2.5 font-semibold text-[#767676] text-xs">Mobile</th>
                <th className="px-4 py-2.5 font-semibold text-[#767676] text-xs">Role</th>
                <th className="px-4 py-2.5 font-semibold text-[#767676] text-xs">Status</th>
                <th className="px-4 py-2.5 font-semibold text-[#767676] text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffMembers.map((member) => (
                <tr key={member.id} className="border-b border-[#EBEBEB] last:border-0 hover:bg-[#F7F7F8] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#121212]">{member.fullName}</td>
                  <td className="px-4 py-3 text-[#767676] font-mono text-xs">{member.mobile}</td>
                  <td className="px-4 py-3 text-[#121212]">{formatRole(member.role)}</td>
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
              ))}
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
