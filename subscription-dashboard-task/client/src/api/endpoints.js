import { api } from './client';

const unwrap = (res) => res.data;

export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then(unwrap),
  login: (payload) => api.post('/auth/login', payload).then(unwrap),
  me: () => api.get('/auth/me').then(unwrap),
};

export const userApi = {
  updateProfile: (payload) => api.patch('/users/me', payload).then(unwrap),
  changePassword: (payload) => api.patch('/users/me/password', payload).then(unwrap),
};

export const planApi = {
  list: () => api.get('/plans').then(unwrap),
};

export const subscriptionApi = {
  subscribe: (planId) => api.post(`/subscribe/${planId}`).then(unwrap),
  mine: () => api.get('/my-subscription').then(unwrap),
  history: () => api.get('/my-subscription/history').then(unwrap),
  changePlan: (planId) => api.patch('/my-subscription', { planId }).then(unwrap),
  cancel: () => api.delete('/my-subscription').then(unwrap),
};

export const adminApi = {
  subscriptions: (params) => api.get('/admin/subscriptions', { params }).then(unwrap),
  stats: () => api.get('/admin/stats').then(unwrap),
};
