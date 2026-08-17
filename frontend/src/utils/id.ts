/** Mock veriler ve optimistic update'ler için basit benzersiz id üretici */
export const createId = (prefix = 'id'): string => {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
};

export const shortId = () => Math.random().toString(36).slice(2, 8);
