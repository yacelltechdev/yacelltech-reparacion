export const formatMoney = (amount) => {
  return Number(amount).toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

export const getTotalCosto = (r) => {
  let total = Number(r.costo) || 0;
  if (r.cargosAdicionales && Array.isArray(r.cargosAdicionales)) {
    r.cargosAdicionales.forEach(c => total += (Number(c.monto) || 0));
  }
  return total;
};

export const formatDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true
  });
};

export const getSelectStyle = (status, canEdit = true) => {
  let base = { 
    padding: '0.35rem 0.6rem', 
    fontSize: '0.85rem', 
    borderRadius: '6px', 
    cursor: canEdit ? 'pointer' : 'not-allowed', 
    opacity: canEdit ? 1 : 0.8, 
    fontWeight: 'bold',
    outline: 'none',
    transition: 'all 0.2s ease',
    width: 'auto'
  };
  
  if (status === 'En reparación') {
    base.background = '#FEF9C3'; 
    base.color = '#A16207'; 
    base.border = '1px solid #FDE047';
  } else if (status === 'Listo para entregar') {
    base.background = '#DCFCE7'; 
    base.color = '#15803D'; 
    base.border = '1px solid #86EFAC';
  } else if (status === 'No se pudo reparar') {
    base.background = '#FFEDD5'; 
    base.color = '#C2410C'; 
    base.border = '1px solid #FED7AA';
  } else if (status === 'Entregado bueno') {
    base.background = '#DBEAFE'; 
    base.color = '#1E40AF'; 
    base.border = '1px solid #BFDBFE';
  } else if (status === 'Entregado malo') {
    base.background = '#FEE2E2'; 
    base.color = '#B91C1C'; 
    base.border = '1px solid #FCA5A5';
  } else {
    base.background = '#F1F5F9';
    base.border = '1px solid #CBD5E1';
    base.color = '#334155';
  }
  return base;
};
