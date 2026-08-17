# Setup — Painel de Projetos (Supabase + Cloudflare R2 + Vercel)

Passo a passo para colocar o painel `admin.html` no ar. Tudo usando os planos gratuitos.

## 1. Supabase (banco de dados + login do admin)

1. Crie uma conta em https://supabase.com e um novo projeto (guarde a senha do banco).
2. No painel do projeto, vá em **SQL Editor** → **New query**, cole todo o conteúdo do arquivo `supabase/schema.sql` deste repositório e rode (`Run`). Isso cria a tabela `projects`, as regras de segurança (RLS) e os 14 projetos que já existem no site hoje.
3. Vá em **Authentication → Users → Add user** e crie seu usuário admin (e-mail + senha). É esse login que você vai usar em `admin.html`. Não é preciso criar mais nenhum usuário — só você mesmo acessa o painel.
4. Vá em **Project Settings → API** e copie:
   - `Project URL`
   - `anon public` key
5. Abra `js/supabase-client.js` neste projeto e cole os dois valores em `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

## 2. Cloudflare R2 (armazenamento de imagens, plano gratuito)

1. Crie uma conta em https://dash.cloudflare.com e ative o **R2** (não pede cartão no plano gratuito: 10 GB de armazenamento).
2. Crie um bucket, por exemplo `kleber-projetos`.
3. Ative o acesso público de leitura do bucket: no bucket, vá em **Settings → Public Access** e habilite o domínio `r2.dev` (ou conecte um domínio próprio, se preferir). Copie a URL pública gerada (algo como `https://pub-xxxxxxxx.r2.dev`).
4. Configure CORS do bucket (**Settings → CORS Policy**) para permitir upload vindo do seu domínio Vercel, por exemplo:
   ```json
   [
     {
       "AllowedOrigins": ["https://SEU-SITE.vercel.app", "http://localhost:3000"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["*"]
     }
   ]
   ```
5. Vá em **R2 → Manage API tokens → Create API token**, com permissão de **Object Read & Write** só nesse bucket. Anote:
   - `Access Key ID`
   - `Secret Access Key`
   - o **Account ID** (aparece no canto direito do dashboard do Cloudflare)

## 3. Vercel (hospedagem + a function que assina os uploads)

1. Suba este projeto para um repositório no GitHub (posso preparar o `git init`/primeiro commit — só falta você criar o repositório remoto e eu conectar).
2. Em https://vercel.com, **Add New → Project**, importe o repositório. Framework preset: **Other** (site estático + pasta `/api`).
3. Em **Project Settings → Environment Variables**, adicione (valores coletados nos passos 1 e 2):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `R2_PUBLIC_BASE_URL` (a URL pública do passo 2.3, sem barra no final)
4. Deploy. O site abre normalmente em `/principal.html`, e o painel em `/admin.html`.

## 4. Testando

1. Acesse `/admin.html`, entre com o e-mail/senha criados no passo 1.3.
2. Clique em **+ Novo projeto**, preencha e suba uma imagem principal — ela deve aparecer com preview assim que o upload terminar.
3. Marque **Publicado** e **Destaque na home**, salve.
4. Abra `/principal.html` e `/projetos.html` — o novo projeto deve aparecer.

Se o upload de imagem falhar com erro 401, confira se `SUPABASE_URL`/`SUPABASE_ANON_KEY` batem entre `js/supabase-client.js` e as env vars da Vercel (a function `api/r2-upload-url.js` usa essas mesmas variáveis para validar seu login).
