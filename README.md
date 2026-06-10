# Gestao de Horas

Aplicacao Next.js para gestao de horas por projeto, demais atividades mensais, registro diario de ponto e MMP.

## Rodar localmente

Configure o Supabase antes de iniciar a aplicacao.

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Acesse `http://localhost:3000`.

## O que esta implementado

- Login basico por perfil.
- Dashboard administrativo com filtros, cards, graficos simples e matriz mensal.
- Cadastro e edicao de projetos.
- Cadastro de tipo de projeto pelo modal dentro do formulario de projeto.
- Cadastro e edicao de colaboradores.
- Lancamento mensal de horas por projeto e demais atividades.
- Envio, aprovacao e reabertura de lancamentos.
- Registro diario de ponto com projeto do dia, entrada, intervalo e saida.
- Relatorios administrativos por mes, colaborador, projeto e tipo.
- Modulo administrativo de MMP com previa no padrao MAT-002, geracao de PDF e guarda do PDF assinado.

## Persistencia

O projeto usa Supabase Postgres com Prisma. Nao ha fallback local nem seed automatico.

1. Crie um projeto no Supabase.
2. Copie `.env.example` para `.env.local`.
3. Em Project Settings > Database, copie as URLs do Postgres:
   - `DATABASE_URL`: transaction pooler, porta `6543`, com `?pgbouncer=true`.
   - `DIRECT_URL`: session pooler, porta `5432`, usada nas migrations.
4. Preencha:

```env
SUPABASE_STATE_ID=gestao-horas
APP_LOGIN_PASSWORD="<defina-uma-senha-forte>"
ROOT_USER_EMAIL="admin@sistema.local"
ROOT_USER_PASSWORD="<senha-inicial-do-root>"
DATABASE_URL="postgresql://postgres.<project-ref>:<database-password>@<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<project-ref>:<database-password>@<region>.pooler.supabase.com:5432/postgres"
```

5. Gere o client e aplique a migration:

```bash
npm run prisma:generate
npm run prisma:migrate
```

6. Crie ou atualize o usuario root:

```bash
npm run seed:root
```

Por padrao, o seed cria `admin@sistema.local` com perfil `ADMIN`. A senha inicial usa `ROOT_USER_PASSWORD`; se ela nao existir, usa `APP_LOGIN_PASSWORD`.

O frontend continua falando apenas com a API do Next.js. O Prisma fica somente no backend.

## Scripts

```bash
npm run lint
npm run build
npm run dev
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm run seed:root
```
