import { BadRequestError } from '@/http/utils/error'

export function toCentsStrict(input: string): bigint {
  const s = input.trim()
  // contrato estrito: ponto como separador decimal, até 2 casas
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) {
    throw new BadRequestError(
      'amount inválido: envie como string decimal com ponto (ex.: "1234.56") e no máximo 2 casas'
    )
  }
  const [i, f = ''] = s.split('.')
  const f2 = (f + '00').slice(0, 2)
  return BigInt(i) * 100n + BigInt(f2)
}

export const centsToDecimalString = (cents: bigint) => {
  const sign = cents < 0n ? '-' : ''
  const abs = cents < 0n ? -cents : cents
  const int = abs / 100n
  const frac = (abs % 100n).toString().padStart(2, '0')
  return `${sign}${int.toString()}.${frac}`
}
