const pool = require('../db');

// Determina si un negocio está abierto en un momento dado (por defecto, ahora)
// Devuelve: { tieneHorarioEstructurado, abierto, horaCierre, mensaje }
// Revisa si una hora cae dentro de un turno (apertura → cierre), contemplando cruce de medianoche
const dentroDeTurno = (apertura, cierre, minutosConsulta) => {
  if (!apertura || !cierre) return { dentro: false, horaCierre: null };

  const [hA, mA] = apertura.split(':').map(Number);
  const [hC, mC] = cierre.split(':').map(Number);

  const minApertura = hA * 60 + mA;
  let minCierre = hC * 60 + mC;

  const cruzaMedianoche = minCierre <= minApertura;
  if (cruzaMedianoche) minCierre += 24 * 60;

  let consultaAjustada = minutosConsulta;
  if (cruzaMedianoche && minutosConsulta < minApertura) {
    consultaAjustada += 24 * 60;
  }

  const dentro = consultaAjustada >= minApertura && consultaAjustada < minCierre;
  const horaCierre = `${String(hC).padStart(2, '0')}:${String(mC).padStart(2, '0')}`;

  return { dentro, horaCierre };
};

const calcularEstadoNegocio = (horarioDia, horaConsulta) => {
  if (!horarioDia || horarioDia.cerrado) {
    return { tieneHorarioEstructurado: !!horarioDia, abierto: false, horaCierre: null };
  }

  const minutosConsulta = horaConsulta.getHours() * 60 + horaConsulta.getMinutes();

  // Turno 1
  const turno1 = dentroDeTurno(horarioDia.hora_apertura, horarioDia.hora_cierre, minutosConsulta);
  if (turno1.dentro) {
    return { tieneHorarioEstructurado: true, abierto: true, horaCierre: turno1.horaCierre };
  }

  // Turno 2 (si existe)
  const turno2 = dentroDeTurno(horarioDia.hora_apertura_2, horarioDia.hora_cierre_2, minutosConsulta);
  if (turno2.dentro) {
    return { tieneHorarioEstructurado: true, abierto: true, horaCierre: turno2.horaCierre };
  }

  // Cerrado ahora: devolvemos la próxima hora de cierre relevante para referencia
  const horaCierreRef = turno1.horaCierre || turno2.horaCierre || null;
  return { tieneHorarioEstructurado: true, abierto: false, horaCierre: horaCierreRef };
};

// Trae el estado de "abierto/cerrado ahora" para una lista de negocios
// Trae el estado de "abierto/cerrado ahora" para una lista de negocios
const obtenerEstadosNegocios = async (businessIds, momento = new Date()) => {
  if (!businessIds || businessIds.length === 0) return {};

  // Convertir a hora de Costa Rica (UTC-6) antes de calcular día y hora.
  // El servidor corre en UTC, así que sin esto el día y la hora salen corridos 6 horas.
  const momentoCR = new Date(
    momento.toLocaleString('en-US', { timeZone: 'America/Costa_Rica' })
  );

  const diaSemana = momentoCR.getDay();

  const { rows } = await pool.query(
    `SELECT business_id, dia_semana, hora_apertura, hora_cierre,
            hora_apertura_2, hora_cierre_2, cerrado
     FROM horarios_negocio
     WHERE business_id = ANY($1) AND dia_semana = $2`,
    [businessIds, diaSemana]
  );

  const porNegocio = {};
  rows.forEach(r => { porNegocio[r.business_id] = r; });

  const resultado = {};
  businessIds.forEach(id => {
    resultado[id] = calcularEstadoNegocio(porNegocio[id], momentoCR);
  });

  return resultado;
};

const obtenerHorariosNegocio = async (businessId) => {
  const { rows } = await pool.query(
    `SELECT dia_semana, hora_apertura, hora_cierre,
            hora_apertura_2, hora_cierre_2, cerrado
     FROM horarios_negocio
     WHERE business_id = $1
     ORDER BY dia_semana`,
    [businessId]
  );

  // Devolvemos siempre los 7 días, aunque no estén cargados
  const porDia = {};
  rows.forEach(r => { porDia[r.dia_semana] = r; });

  const resultado = [];
  for (let dia = 0; dia <= 6; dia++) {
    const h = porDia[dia];
    resultado.push({
      dia_semana: dia,
      hora_apertura: h?.hora_apertura || '',
      hora_cierre: h?.hora_cierre || '',
      hora_apertura_2: h?.hora_apertura_2 || '',
      hora_cierre_2: h?.hora_cierre_2 || '',
      cerrado: h?.cerrado || false
    });
  }
  return resultado;
};

const guardarHorariosNegocio = async (businessId, horarios) => {
  // Reemplazamos todos los horarios del negocio de una vez
  await pool.query('DELETE FROM horarios_negocio WHERE business_id = $1', [businessId]);

  for (const h of horarios) {
    await pool.query(
      `INSERT INTO horarios_negocio
         (business_id, dia_semana, hora_apertura, hora_cierre, hora_apertura_2, hora_cierre_2, cerrado)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        businessId,
        h.dia_semana,
        h.cerrado ? null : (h.hora_apertura || null),
        h.cerrado ? null : (h.hora_cierre || null),
        h.cerrado ? null : (h.hora_apertura_2 || null),
        h.cerrado ? null : (h.hora_cierre_2 || null),
        h.cerrado || false
      ]
    );
  }
};

module.exports = { obtenerEstadosNegocios, calcularEstadoNegocio, obtenerHorariosNegocio, guardarHorariosNegocio };