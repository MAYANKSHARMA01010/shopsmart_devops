import apiClient from "../../../lib/apiClient";
import type { User, LoginFormValues, RegisterFormValues, UpdateProfileFormValues } from "../types/authSchema";

interface AuthResponse {
  status: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

interface RefreshResponse {
  status: string;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

interface UserResponse {
  status: string;
  data: {
    user: User;
  };
}

export const authService = {
  register: (data: RegisterFormValues): Promise<AuthResponse> =>
    apiClient.post("/auth/register", data),

  login: (data: LoginFormValues): Promise<AuthResponse> =>
    apiClient.post("/auth/login", data),

  logout: (refreshToken: string): Promise<{ status: string; message: string }> =>
    apiClient.post("/auth/logout", { refreshToken }),

  refresh: (refreshToken: string): Promise<RefreshResponse> =>
    apiClient.post("/auth/refresh", { refreshToken }),

  getMe: (): Promise<UserResponse> =>
    apiClient.get("/auth/me"),

  updateProfile: (data: UpdateProfileFormValues): Promise<UserResponse> =>
    apiClient.put("/auth/profile", data),
};
