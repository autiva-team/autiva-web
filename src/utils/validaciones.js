/**
 * Valida el formato básico de un correo electrónico (usuario@dominio.ext).
 *
 * La expresión evita el backtracking excesivo (riesgo de ReDoS que marcó
 * SonarQube): las partes del dominio no pueden contener puntos y cada
 * extensión empieza con un punto literal, así que nunca hay dos formas
 * de dividir el mismo texto y la evaluación es lineal.
 *
 * La validación definitiva del correo la hace siempre la API.
 */
const REGEX_CORREO = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/

export function validarEmail(correo) {
  return REGEX_CORREO.test(correo)
}
