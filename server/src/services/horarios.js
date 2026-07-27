const pool = require('../db');

// Determina si un negocio está abierto en un momento dado (por defecto, ahora)
// Devuelve: { tieneHorarioEstructurado, abierto, horaCierre, mensaje }
const calcularEstadoNegocio = (horarioDia, horaConsulta) => {
  if (!horarioDia || horarioDia.cerrado) {
    return { tieneHorarioEstructurado: !!horarioDia, abierto: false, horaCierre: null };
  }

  const [hApertura, mApertura] = horarioDia.hora_apertura.split(':').map(Number);
  const [hCierre, mCierre] = horarioDia.hora_cierre.split(':').map(Number);

  const minutosApertura = hApertura * 60 + mApertura;
  let minutosCierre = hCierre * 60 + mCierre;
  const minutosConsulta = horaConsulta.getHours() * 60 + horaConsulta.getMinutes();

  // Si cierra "antes" de abrir en minutos, es que cruza la medianoche (ej: abre 12pm, cierra 1:30am)
  const cruzaMedianoche = minutosCierre <= minutosApertura;
  if (cruzaMedianoche) minutosCierre += 24 * 60;

  let minutosConsultaAjustado = minutosConsulta;
  // Si estamos en la madrugada (ej: 00:30) y el horario cruza medianoche, sumamos 24h para comparar
  if (cruzaMedianoche && minutosConsulta < minutosApertura) {
    minutosConsultaAjustado += 24 * 60;
  }

  const abierto = minutosConsultaAjustado >= minutosApertura && minutosConsultaAjustado < minutosCierre;

  const horaCierreTexto = `${String(hCierre).padStart(2, '0')}:${String(mCierre).padStart(2, '0')}`;

  return { tieneHorarioEstructurado: true, abierto, horaCierre: horaCierreTexto };
};

// Trae el estado de "abierto/cerrado ahora" para una lista de negocios
const obtenerEstadosNegocios = async (businessIds, momento = new Date()) => {
  if (!businessIds || businessIds.length === 0) return {};

  const diaSemana = momento.getDay(); // 0-6, mismo criterio que guardamos

  const { rows } = await pool.query(
    `SELECT business_id, dia_semana, hora_apertura, hora_cierre, cerrado
     FROM horarios_negocio
     WHERE business_id = ANY($1) AND dia_semana = $2`,
    [businessIds, diaSemana]
  );

  const porNegocio = {};
  rows.forEach(r => { porNegocio[r.business_id] = r; });

  const resultado = {};
  businessIds.forEach(id => {
    resultado[id] = calcularEstadoNegocio(porNegocio[id], momento);
  });

  return resultado;
};

module.exports = { obtenerEstadosNegocios, calcularEstadoNegocio };