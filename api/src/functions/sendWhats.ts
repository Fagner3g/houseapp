interface SendWhatsRequest {
  name: string
  ddd: string
  phone: string
}

export async function SendWhats({ ddd, phone }: SendWhatsRequest) {
  await fetch('https://api.whatsapp.com/send?phone=55+5511999999999')
}
