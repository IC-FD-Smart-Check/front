import api from './api';
import { SubscriptionResponse, UserResponse } from '@/types';

export const subscriptionService = {
  listBySubEvent: async (subEventId: string): Promise<SubscriptionResponse[]> => {
    const response = await api.get<SubscriptionResponse[]>(`/subscriptions/subevent/${subEventId}`);
    return response.data;
  },

  subscribe: async (subEventId: string, userId: string): Promise<SubscriptionResponse> => {
    const response = await api.post<SubscriptionResponse>('/subscriptions', { subEventId, userId });
    return response.data;
  },

  unsubscribe: async (subEventId: string, userId: string): Promise<void> => {
    await api.delete(`/subscriptions/subevent/${subEventId}/user/${userId}`);
  },

  searchUsers: async (query: string): Promise<UserResponse[]> => {
    const response = await api.get<UserResponse[]>('/users/search', { params: { query } });
    return response.data;
  },
};
