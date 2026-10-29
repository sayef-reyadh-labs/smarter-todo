// Form validation rules for the login, signup and profile forms (they match the backend limits).
export const emailRules = [
  { required: true, message: "Email is required" },
  { type: "email" as const, message: "Enter a valid email" },
  { max: 254, message: "Email must be at most 254 characters" },
]

export const nameRules = [
  { required: true, whitespace: true, message: "Name is required" },
  { max: 100, message: "Name must be at most 100 characters" },
]

export const newPasswordRules = [
  { required: true, message: "Password is required" },
  { min: 8, message: "Password must be at least 8 characters" },
  { max: 128, message: "Password must be at most 128 characters" },
]
