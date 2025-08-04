import nodemailer from 'nodemailer'

interface SendInviteMailRequest {
  email: string
  url: string
}

export async function sendInviteMail({ email, url }: SendInviteMailRequest) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'lauren31@ethereal.email',
      pass: 'xSgzGT7je24WXpj4a1',
    },
  })

  await transporter.sendMail({
    from: '"House App" <houseapp@gmail.com>',
    to: email,
    subject: 'Convite para o House App',
    html: `Clique <a href="${url}">aqui</a> para aceitar o convite`,
  })
}
