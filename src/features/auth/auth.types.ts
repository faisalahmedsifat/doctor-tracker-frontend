export type Admin = {
  id: string;
  email: string;
  role: "admin";
};

export type AuthResponse = {
  success: true;
  data: { admin: Admin };
};

export type LoginInput = {
  email: string;
  password: string;
};
