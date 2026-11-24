# Fox Barber: agenda com acesso da equipe

O site usa GitHub Pages para os arquivos públicos e Supabase para consultar os horários bloqueados e proteger as alterações. A chave `publishable`/`anon` do Supabase pode ficar no site; as políticas RLS do banco controlam quem pode alterar os bloqueios. **Nunca coloque a chave `service_role` ou uma chave secreta em `config.js`.**

## Configurar o Supabase

1. Crie um projeto no painel do Supabase.
2. Abra **SQL Editor**, cole todo o conteúdo de `supabase-setup.sql` e execute.
3. Em **Authentication → Users**, crie uma conta para cada pessoa que poderá gerenciar a agenda. Não compartilhe a senha da equipe.
4. No SQL Editor, autorize cada conta executando este comando, substituindo o e-mail:

   ```sql
   insert into public.site_admins (user_id)
   select id from auth.users where email = 'EMAIL_DA_EQUIPE';
   ```

5. Desative o cadastro público de contas em **Authentication → Settings**, para que apenas a equipe receba usuários. Mesmo sem isso, as políticas do banco não permitem que outras contas alterem os bloqueios.
6. Em **Project Settings → API**, copie o **Project URL** e a chave **Publishable** (ou a antiga chave **anon/public**). Insira esses dois valores em `config.js` nos campos `supabaseUrl` e `supabaseAnonKey`.

## Publicar no GitHub Pages

O repositório precisa conter `index.html`, `styles.css`, `script.js`, `config.js`, a pasta `assets/` e o workflow `.github/workflows/pages.yml`. Depois de enviar os arquivos para a branch `main`, abra **Settings → Pages** e escolha **GitHub Actions** como fonte. O workflow publica o site após cada atualização da branch `main`.

O site é público. O painel de equipe exige e-mail e senha; o banco confere a autorização em cada gravação e remoção. Visitantes podem apenas consultar quais horários estão bloqueados.
