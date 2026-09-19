# Serena — ativação da nuvem

O código já escolhe automaticamente a Cloudflare Workers AI para o protótipo gratuito e mantém a OpenAI como opção futura. Nenhuma credencial deve ser enviada por mensagem ou incluída no GitHub.

## O que o proprietário precisa autorizar

1. Criar um projeto gratuito no Supabase.
2. No SQL Editor do Supabase, executar `supabase/schema.sql`.
3. Copiar a URL, a chave publicável e a chave secreta do projeto para as variáveis da hospedagem.
4. Criar uma conta Cloudflare, abrir Workers AI e gerar um token com permissões Workers AI Read/Edit.
5. Adicionar o Account ID e o token somente nas variáveis secretas da hospedagem.
6. Conectar o repositório GitHub à hospedagem escolhida e publicar.

## Variáveis necessárias

Use `.env.example` como lista. As chaves secretas nunca podem começar com `NEXT_PUBLIC_` nem ser colocadas no navegador.

## Comportamento antes da ativação

Sem as credenciais, o site continua abrindo localmente, mas não inventa respostas automáticas. A conversa informa que a inteligência ainda precisa ser conectada.

## Comportamento depois da ativação

- Supabase autentica usuários e salva avaliação, sessão e histórico.
- O servidor recupera apenas o histórico pertencente ao usuário autenticado.
- Workers AI recebe o contexto recente e produz uma resposta nova.
- Mensagem e resposta são salvas na sessão correta.
- O protocolo de crise permanece separado do modelo.
- Se `OPENAI_API_KEY` for adicionada futuramente, a rota já tem suporte à OpenAI como alternativa.

## Antes de pacientes reais

O plano gratuito é apenas para validação. É necessário revisar LGPD, termos e consentimento, retenção e exclusão de dados, backups, controle administrativo, testes de segurança e validação por profissional habilitado.
