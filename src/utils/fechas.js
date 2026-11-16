export function fechaMexico() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function fechaUtc(valor) {
  return new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(valor) ? valor : `${valor}Z`)
}

export function fechaHoraLocal(valor) {
  const fecha = fechaUtc(valor)
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
