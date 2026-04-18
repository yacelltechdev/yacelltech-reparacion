const SERVER_IP = window.location.hostname;
const API_URL = `http://${SERVER_IP}:3001/api`;

export const api = {
  async getRepairs() {
    const res = await fetch(`${API_URL}/repairs`);
    return await res.json();
  },
  async addRepair(repair) {
    const res = await fetch(`${API_URL}/repairs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(repair)
    });
    return await res.json();
  },
  async updateRepair(id, updates) {
    const res = await fetch(`${API_URL}/repairs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return await res.json();
  },
  async getCatalog(table) {
    const res = await fetch(`${API_URL}/${table}`);
    return await res.json();
  },
  async addToCatalog(table, nombre) {
    const res = await fetch(`${API_URL}/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre })
    });
    return await res.json();
  }
};
