export function waitingHtml({ displayName, refreshSeconds = 3 }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="${refreshSeconds}" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Homolog — iniciando</title>
  <style>
    body { font-family: system-ui, sans-serif; display: grid; place-items: center;
      min-height: 100vh; margin: 0; background: #0f1419; color: #e7ecf1; }
    main { text-align: center; max-width: 28rem; padding: 1.5rem; }
    h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem; }
    p { margin: 0; opacity: 0.8; line-height: 1.5; }
    .spin { width: 2rem; height: 2rem; margin: 0 auto 1.25rem; border: 3px solid #334;
      border-top-color: #6af; border-radius: 50%; animation: s 0.8s linear infinite; }
    @keyframes s { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <main>
    <div class="spin" aria-hidden="true"></div>
    <h1>Iniciando ${displayName}</h1>
    <p>O ambiente de homologação estava ocioso e está subindo agora.
      Isso costuma levar menos de um minuto — a página atualiza sozinha.</p>
  </main>
</body>
</html>`
}
