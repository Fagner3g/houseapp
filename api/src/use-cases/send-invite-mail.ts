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
      user: 'peggie82@ethereal.email',
      pass: 'Y1CREBUcRPZwBw46fr',
    },
  })

  await transporter.sendMail({
    from: '"House App" <houseapp@gmail.com>',
    to: email,
    subject: 'Convite para o House App',
    html: `Clique <a href="${url}">aqui</a> para aceitar o convite`,
  })
}
