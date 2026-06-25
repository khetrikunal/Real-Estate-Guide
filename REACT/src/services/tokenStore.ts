let memoryToken = '';

export const tokenStore = {
  get() {
    return memoryToken;
  },
  set(token: string) {
    memoryToken = token;
  },
  clear() {
    memoryToken = '';
  },
};
