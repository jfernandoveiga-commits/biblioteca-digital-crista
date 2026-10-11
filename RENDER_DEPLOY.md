# Guia de Publicação, Configuração do PIN e Área Administrativa no Render

Este documento explica como configurar e gerenciar o controle de acesso por PIN e a nova **Área Administrativa Segura (`/admin`)** da sua aplicação **Biblioteca Digital** hospedada no Render.

---

## 1. Como Funciona a Área Administrativa (`/admin`)

- **Acesso Independente e Restrito:** O administrador possui login próprio com Usuário e Senha, completamente independente do PIN dos leitores. Não há cadastro público.
- **Painel de Gestão Completo:**
  - **Alteração do PIN dos Leitores:** Permite definir um novo PIN compartilhado a qualquer momento, com confirmação obrigatória e sem jamais exibir o PIN em texto aberto.
  - **Bloqueio Temporário:** Permite pausar todos os novos acessos à biblioteca em caso de manutenção ou atualização de capítulos, e liberar quando desejar.
  - **Revogação Geral de Sessões:** Desconecta todos os leitores ativos imediatamente, exigindo que digitem o PIN novamente para continuar.
  - **Métricas Anônimas:** Exibe o número de sessões ativas no momento e as datas das últimas alterações.
- **Validação 100% no Servidor:** Todas as rotas administrativas (`/api/admin/*`) validam autorização no servidor com tokens criptográficos e cookies `HttpOnly`, `SameSite` e `Secure`.
- **Proteção Rígida contra Força Bruta:** Máximo de 5 tentativas de login por IP com bloqueio de 5 minutos.
- **Persistência Segura em Disco:** As alterações de PIN e estado de bloqueio são salvas de forma atômica no arquivo `data/security-config.json` no servidor.

---

## 2. Como Configurar as Credenciais Administrativas no Render

1. Acesse o seu painel no [Render Dashboard](https://dashboard.render.com/).
2. Abra o serviço Web da **Biblioteca Digital**.
3. No menu lateral esquerdo, selecione **Environment**.
4. Clique em **Add Environment Variable** e adicione:
   - **Key:** `ADMIN_USERNAME`
     - **Value:** Nome do administrador (ex: `admin` ou seu nome)
   - **Key:** `ADMIN_PASSWORD`
     - **Value:** Uma senha forte e exclusiva (ex: `Senha_Forte!Bib2025`)
   - **Key:** `ACCESS_PIN`
     - **Value:** O PIN inicial compartilhado para os leitores (ex: `1234` ou o PIN que preferir)
   - **Key:** `SESSION_SECRET`
     - **Value:** Uma chave aleatória longa para assinatura das sessões
5. Clique em **Save Changes**. O Render reiniciará a aplicação com as variáveis seguras ativas.

> **Valores Padrão para Desenvolvimento:** Caso as variáveis não sejam informadas, o sistema adota `admin` / `admin2025` para a administração e `1234` para o PIN de leitor, permitindo testes locais imediatos.

---

## 3. Persistência de Dados no Render (Disks Opcionais)

Por padrão, a aplicação grava as alterações de PIN e estado no diretório `./data/security-config.json`.

Caso deseje garantir persistência absoluta entre deploys e reinicializações completas de contêiner no plano pago do Render com **Persistent Disk**:
1. No painel do seu Web Service no Render, clique em **Disks**.
2. Clique em **Add Disk**:
   - **Name:** `biblioteca-data`
   - **Mount Path:** `/var/data`
   - **Size:** 1 GB
3. No menu **Environment**, adicione:
   - **Key:** `DATA_DIR`
   - **Value:** `/var/data`
4. Clique em **Save Changes**. A aplicação automaticamente gravará as configurações no disco permanente montado.

---

## 4. Como Acessar a Área Administrativa

Você pode acessar a área administrativa de duas formas:
1. **URL Direta:** Navegue até `https://seu-app.onrender.com/admin` (ou `http://localhost:3000/admin` localmente).
2. **Pela Interface:** Na tela inicial de PIN ou na modal da Biblioteca, clique no botão discreto **"Área Administrativa"** / **"Admin"**.

---

## 5. Configuração do Serviço Web no Render

- **Runtime:** `Node`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start` (executa `node server.ts`)
- **Port:** O Render injeta automaticamente a variável `PORT`, detectada pelo servidor.
