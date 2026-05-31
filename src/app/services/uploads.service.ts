import { API_BASE_URL } from '../config/api';

export const uploadsService = {
  uploadReceipt: async (file: File): Promise<{ url: string }> => {
    const token = localStorage.getItem('agro-token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/uploads/receipt`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al subir el archivo');
    }

    return response.json();
  },
};
