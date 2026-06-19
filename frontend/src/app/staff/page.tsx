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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
            <p className="text-sm text-slate-600">
              Add or remove salesman and technician accounts. Login is by mobile number; passwords can be the same.
              Technicians added here also appear on the Technicians page for job assignment.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Add Staff"}
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardContent className="grid gap-4 p-4 md:grid-cols-2">
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
              <Button className="md:col-span-2" onClick={create}>
                Save Staff Member
              </Button>
            </CardContent>
          </Card>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Mobile</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Role</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffMembers.map((member) => (
                <tr key={member.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{member.fullName}</td>
                  <td className="px-4 py-3 text-slate-900">{member.mobile}</td>
                  <td className="px-4 py-3 text-slate-900">{formatRole(member.role)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={member.active ? "success" : "destructive"}>
                      {member.active ? "Active" : "Removed"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {member.active && (
                        <Button size="sm" variant="outline" onClick={() => remove(member)}>
                          Remove
                        </Button>
                      )}
                      {!member.active && (
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => permanentDelete(member)}>
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
            <p className="py-8 text-center text-slate-500">No staff members yet</p>
          )}
        </div>
      </div>
    </StaffLayout>
  );
}
