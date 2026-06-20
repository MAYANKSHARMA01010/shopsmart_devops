"use client";

import { useEffect, useState } from "react";
import { userService } from "../../../features/users/services/userService";
import type { User } from "../../../features/auth/types/authSchema";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await userService.getAllUsers();
      setUsers(res.data.users || []);
    } catch (error) {
      console.error("Failed to load users", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await userService.updateUserRole(userId, newRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      alert("User role updated successfully!");
    } catch (error: any) {
      console.error("Failed to update user role", error);
      alert(error?.response?.data?.message || "Failed to update user role. Ensure you are a SUPER_ADMIN.");
    }
  };

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ margin: 0 }}>User Management</h1>
      </div>

      <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", overflow: "hidden", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: "var(--color-background)" }}>
            <tr>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>ID</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>Name</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>Email</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td style={{ padding: "1rem", color: "var(--color-text-muted)" }}>{user.id.slice(0, 8)}...</td>
                <td style={{ padding: "1rem", fontWeight: 500 }}>{user.name}</td>
                <td style={{ padding: "1rem" }}>{user.email}</td>
                <td style={{ padding: "1rem" }}>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    style={{ padding: "0.25rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", background: "var(--color-background)", color: "var(--color-text)" }}
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
