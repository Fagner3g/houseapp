interface SendWhatsRequest {
  name: string
  phone: string
}

export async function SendWhats({ _n }: SendWhatsRequest) {
  await fetch('https://api.whatsapp.com/send?phone=55+5511999999999')
}
