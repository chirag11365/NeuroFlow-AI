import { create } from 'zustand';

const savedUser = localStorage.getItem('neuroflow-user');
export const useAuth = create((set) => ({
  token: localStorage.getItem('neuroflow-token'), user: savedUser ? JSON.parse(savedUser) : null,
  setSession: ({ token, user }) => { localStorage.setItem('neuroflow-token', token); localStorage.setItem('neuroflow-user', JSON.stringify(user)); set({ token, user }); },
  setUser: (user) => { localStorage.setItem('neuroflow-user', JSON.stringify(user)); set({ user }); },
  logout: () => { localStorage.removeItem('neuroflow-token'); localStorage.removeItem('neuroflow-user'); set({ token: null, user: null }); }
}));
