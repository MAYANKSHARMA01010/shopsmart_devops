import apiClient from "../../../lib/apiClient";
import type { User } from "../../auth/types/authSchema";

export const userService = {
  getAllUsers: (): Promise<{ status: string; data: { users: User[] } }> =>
    apiClient.get("/users"),

  updateUserRole: (id: string, role: string): Promise<{ status: string; data: { user: User } }> =>
    apiClient.patch(`/users/${id}/role`, { role }),
};
