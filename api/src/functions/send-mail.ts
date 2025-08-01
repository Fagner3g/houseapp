import nodemailer from 'nodemailer'

interface SendMailRequest {
  name: string
  email: string
  ddd: string
  phone: string
  url: string
}

export async function SendMail({ email, name, ddd, phone, url }: SendMailRequest) {
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
    subject: 'Seu link de acesso',
    html: `
          <body style="margin:0;background-color:#f4f4f7;font-family:Arial,sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:20px;">
                  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
                    <tr>
                      <td style="padding:32px;text-align:center;color:#333333;">
                        <h1 style="margin:0 0 16px;font-size:24px;font-weight:normal;">
                          Olá ${name.split(' ')[0]},
                        </h1>
                        <p style="margin:0 0 24px;font-size:16px;color:#555555;line-height:1.5;">
                          Para entrar no seu painel de controle, clique no botão abaixo.  
                        </p>
                        <p style="margin:0 0 24px;font-size:16px;color:#555555;line-height:1.5;">
                          Telefone: ${ddd} ${phone}
                        </p>
                        <a
                          href="${url}"
                          style="
                            display:inline-block;
                            padding:14px 28px;
                            background:#4F46E5;
                            color:#ffffff;
                            text-decoration:none;
                            border-radius:4px;
                            font-size:16px;
                          "
                        >
                          Acessar minha conta
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#f4f4f7;padding:16px;text-align:center;color:#888888;font-size:12px;">
                        Se você não solicitou este e-mail, pode ignorar esta mensagem.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
    `,
  })
}
