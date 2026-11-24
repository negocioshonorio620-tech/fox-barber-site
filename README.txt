FOX BARBER — SITE COM AGENDA COMPARTILHADA

O QUE MUDOU
- A equipe entra com e-mail e senha para acessar o painel da agenda.
- Pessoas autorizadas podem bloquear um horário de meia em meia hora ou o dia inteiro.
- Os horários bloqueados aparecem para todos os visitantes.
- O banco confere as permissões; a senha não fica no código do site.
- O pedido de horário continua sendo confirmado pelo WhatsApp.

CONFIGURAÇÃO NECESSÁRIA
1. Crie um projeto no Supabase.
2. No SQL Editor, execute o arquivo supabase-setup.sql.
3. Crie a conta da equipe em Authentication > Users e inclua o ID dela na tabela site_admins. O passo a passo está em SETUP.md.
4. Preencha config.js com o Project URL e a chave Publishable/anon. Nunca use a service_role ou uma chave secreta no site.
5. Publique os arquivos deste diretório no GitHub Pages usando o workflow em .github/workflows/pages.yml.

SEM A CONFIGURAÇÃO DO SUPABASE
O site mostra que a agenda está em configuração e não permite enviar pedidos com horários que não foram consultados no banco. Assim evita apresentar como disponível um horário cuja agenda compartilhada ainda não foi conectada.

ARQUIVOS
- index.html: conteúdo e estrutura do site.
- styles.css: aparência e responsividade.
- script.js: agendamento, login da equipe e bloqueios compartilhados.
- config.js: URL e chave pública do Supabase.
- supabase-setup.sql: tabelas e regras de segurança.
- SETUP.md: instruções de configuração e publicação.
- assets/: vídeo, fotos e logo da Fox Barber.
