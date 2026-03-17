import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { ReviewResponse } from '@/data/mockData';

export const useContracts = () => {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const { data } = await apiClient.get('/history');
      return data;
    },
  });
};

export const useContractDetail = (id: string) => {
  return useQuery({
    queryKey: ['contracts', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/contracts/${id}`);
      return data as ReviewResponse;
    },
    enabled: !!id,
  });
};

export const useUploadContract = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post('/contracts/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
};
