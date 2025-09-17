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
      user: 'myrl.parker62@ethereal.email',
      pass: 'N1fWmhRSm18X3TXmUs',
    },
  })

  await transporter.sendMail({
    from: '"House App" <houseapp@gmail.com>',
    to: email,
    subject: 'Convite para o House App',
    html: `Clique <a href="${url}">aqui</a> para aceitar o convite`,
  })
}
