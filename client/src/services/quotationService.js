import api from './api';

export const getQuotations = async () => {
  const response = await api.get('/quotations');
  return response.data;
};

export const getQuotation = async (id) => {
  const response = await api.get(`/quotations/${id}`);
  return response.data;
};

export const createQuotation = async (quotationData) => {
  const response = await api.post('/quotations', quotationData);
  return response.data;
};

export const updateQuotation = async (id, quotationData) => {
  const response = await api.put(`/quotations/${id}`, quotationData);
  return response.data;
};

export const deleteQuotation = async (id) => {
  const response = await api.delete(`/quotations/${id}`);
  return response.data;
};

export const convertQuotationToOrder = async (id) => {
  const response = await api.post(`/quotations/${id}/convert`);
  return response.data;
};
