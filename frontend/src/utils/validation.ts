const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isValidEmail = (value: string) => EMAIL_REGEX.test(value.trim());

export const validateEmail = (value: string): string | null => {
  if (!value.trim()) return 'E-posta gerekli';
  if (!isValidEmail(value)) return 'Geçerli bir e-posta gir';
  return null;
};

export const validatePassword = (value: string): string | null => {
  if (!value) return 'Şifre gerekli';
  if (value.length < 6) return 'Şifre en az 6 karakter olmalı';
  return null;
};

export const validateFullName = (value: string): string | null => {
  if (!value.trim()) return 'Ad soyad gerekli';
  if (value.trim().length < 2) return 'Geçerli bir ad gir';
  return null;
};

export const isFormValid = (errors: Record<string, string | null>) =>
  Object.values(errors).every((error) => !error);
