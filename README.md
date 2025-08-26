# HouseApp – Gerenciamento de Metas e Transações

## 📋 Visão Geral
O **HouseApp** é uma aplicação web para gestão pessoal e organizacional que permite:
- Registro e acompanhamento de **metas**.
- Registro e controle de **transações financeiras**.
- **Cadastro de usuário** com autenticação via **Magic Link**.

---

## 🚀 Tecnologias
- **Vite.js** + **React**
- **Fastify** (API)
- **PostgreSQL** + **Drizzle ORM**
- **TypeScript**
- **Magic Link Authentication**
- **Shadcn/UI**
- **Biome** (formatação e linting)
- **Docker** (desenvolvimento e produção)

---

## 🗺️ Roadmap

### **Fase 1 – Fundamentos**
- [x] Configuração inicial do projeto (frontend com Vite e backend com Fastify)
- [x] Setup do banco de dados com Drizzle ORM
- [x] Integração com Docker para desenvolvimento local
- [x] Configuração de autenticação via Magic Link

### **Fase 2 – Funcionalidades Principais**
- [x] **Registro de Metas**
  - Criar, listar, editar e excluir metas
  - Status de conclusão
  - Datas de início e término
- [x] **Registro de Transações**
  - Criar, listar, editar e excluir transações
  - Tipos: receita/despesa
  - Filtros por período, status e categoria
- [x] **Cadastro de Usuário**
  - Registro via Magic Link
  - Perfil do usuário

### **Fase 3 – Melhorias e Integrações**
- [ ] Dashboard com indicadores de metas e transações
- [ ] Notificações por e-mail
- [ ] Exportação de dados (CSV/Excel)
- [ ] Multi-usuário / Multi-organização

---

## 📦 Instalação e Uso

```bash
# Clone o repositório
git clone https://github.com/Fagner3g/houseapp.git

# Acesse a pasta
cd houseapp

# Configure as variáveis de ambiente
./scripts/setup-env.sh

# Instale as dependências
cd api && yarn install
cd ../web && npm install

# Rode o projeto (dev)
# Terminal 1 - API
cd api && yarn dev

# Terminal 2 - Web
cd web && npm run dev
```

## 🔧 Configuração de Ambiente

### Desenvolvimento Local
Execute o script de configuração:
```bash
./scripts/setup-env.sh
```

Edite os arquivos `.env` nas pastas `api/` e `web/` com seus valores reais.

### Produção
Os arquivos de ambiente devem estar em `/opt/env/houseapp/` na VPS:
- `api.env` - Variáveis da API
- `web.env` - Variáveis do Web

Veja `deploy/env/README.md` para mais detalhes.

---

## 🛠️ Contribuindo
Contribuições são bem-vindas!  
Abra uma **issue** ou envie um **pull request** com melhorias ou correções.