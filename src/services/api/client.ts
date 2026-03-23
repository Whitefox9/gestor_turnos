export const apiClient = {
  async simulate<T>(data: T, delay = 180): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, delay));
    return structuredClone(data);
  },
};
