export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  picture: string | null;
  googleId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  accessToken: string;
  refreshToken: string;
}
