export function normalizePhone(input) {
  if (!input) return null;

  // 1) Eliminar todo lo que NO sea número
  let phone = input.replace(/\D/g, "");

  // 2) Si empieza con 0 → removerlo
  if (phone.startsWith("0")) {
    phone = phone.slice(1);
  }

  // 3) Si empieza con +56 o 56
  if (phone.startsWith("56")) {
    phone = phone.slice(2);
  }

  // 4) Ahora asegurar que empiece con 9 (móviles en Chile)
  if (!phone.startsWith("9")) {
    // Número inválido
    return null;
  }

  // 5) Debe tener 9 dígitos después del 9
  if (phone.length !== 9) {
    return null;
  }

  // 6) Formato final
  return "56" + phone;
}
