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
git clone https://github.com/seu-usuario/houseapp.git

# Acesse a pasta
cd houseapp

# Instale as dependências
pnpm install

# Rode o projeto (dev)
pnpm dev
```

---

## 🛠️ Contribuindo
Contribuições são bem-vindas!  
Abra uma **issue** ou envie um **pull request** com melhorias ou correções.