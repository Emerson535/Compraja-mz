# CompraJá MZ — implantação

## Requisitos
- Node.js 18+
- PostgreSQL 14+
- Um servidor/cloud com domínio (ex.: VPS, Render, Railway, Fly.io ou similar).

## Local
1. Crie uma base PostgreSQL chamada `compraja`.
2. Execute `schema.sql`.
3. Copie `.env.example` para `.env` e preencha `DATABASE_URL` e `JWT_SECRET`.
4. Execute `npm install`.
5. Execute `npm start`.
6. Abra `http://localhost:3000`.

## Produção
- Configure as variáveis de ambiente no servidor.
- Use HTTPS.
- Não publique o `.env`.
- Configure backup do PostgreSQL.
- Para produção, substitua o armazenamento local de uploads por armazenamento de objetos/CDN.
- Configure um domínio e DNS.

## O que esta versão já possui
- Cadastro e login
- Sessões com JWT
- Anúncios persistentes no PostgreSQL
- Upload de imagem
- Pesquisa e categorias
- Favoritos
- Mensagens na API
- Moderação de anúncios por administrador
- Estrutura preparada para painel administrativo

## Pagamentos
O pagamento ainda não é executado automaticamente. A integração deve ser adicionada com um provedor de pagamentos escolhido para Moçambique, incluindo as respetivas credenciais e regras de segurança.


## Publicação recomendada
Uma opção simples para a primeira versão é usar Render para o Web Service e PostgreSQL. O Render suporta aplicações Express/Node.js e fornece uma URL pública `onrender.com`; também permite domínio personalizado. A versão gratuita é adequada para teste, mas possui limitações e o Postgres gratuito expira após 30 dias, portanto não deve ser usado como armazenamento definitivo de um marketplace. 

### Passos
1. Crie um repositório privado no GitHub e envie todos os ficheiros deste projeto.
2. No Render, crie um PostgreSQL.
3. Copie a connection string do PostgreSQL.
4. No Render, crie um Web Service ligado ao repositório.
5. Build Command: `npm install`.
6. Start Command: `npm start`.
7. Adicione `DATABASE_URL` e `JWT_SECRET` nas Environment Variables.
8. Depois de a aplicação iniciar, execute o conteúdo de `schema.sql` na base PostgreSQL.
9. Abra a URL pública fornecida pelo Render.
10. Depois, ligue um domínio próprio.

### Atenção às imagens
A versão atual grava uploads em `public/uploads`. Em serviços com filesystem efémero, esses ficheiros podem desaparecer em novos deploys/restarts. Para uma versão pública definitiva, troque o upload por armazenamento de objetos (por exemplo, um serviço de storage) antes de começar a receber muitos anúncios.
