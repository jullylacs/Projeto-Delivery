# 🔒 Guia de Segurança - Projeto Delivery

### 1. **Hash de Senhas com bcryptjs**
- Senhas hasheadas com 12 rounds
- Comparação segura durante login com `bcrypt.compare()`
- Senhas NUNCA armazenadas em texto plano

### 2. **JWT Seguro**
- ✅ Removido fallback inseguro (`"segredo"`)
- ✅ `JWT_SECRET` obrigatório em variáveis de ambiente
- ✅ Tokens com expiração de **24 horas**
- ✅ Validação de Bearer Token (Authorization header)

### 2.1 **Importante: JWT_SECRET não é token de acesso**
- `JWT_SECRET` é a chave usada para **assinar e validar** JWTs.
- Para consumir a API, use um token gerado no endpoint de login (`/users/login`) no header `Authorization: Bearer <token>`.

### 2.2 **Token fixo opcional de sistema**
- Para integrações internas (machine-to-machine), é possível definir `SYSTEM_API_TOKEN` no `.env`.
- Quando enviado em `Authorization: Bearer <SYSTEM_API_TOKEN>`, o backend aceita autenticação de sistema.
- Recomendação: use apenas em ambientes controlados e com rotação periódica do valor.

### 2.3 **Refresh Token (implementado)**
- Login retorna `token` (access token) + `refreshToken`.
- Endpoint de renovação: `POST /api/v1/users/refresh`.
- Endpoint de logout/revogação: `POST /api/v1/users/logout`.
- Access token continua no header `Authorization: Bearer <token>`.

### 2.4 **Prefixo de API versionada**
- Prefixo principal: `/api/v1`.
- Exemplo: `/api/v1/cards`, `/api/v1/users/login`, `/api/v1/notifications`.
- Rotas legadas sem prefixo podem ser desligadas com `ENABLE_LEGACY_ROUTES=false`.

### 3. **Rate Limiting**
- **Login**: Máximo 5 tentativas em 15 minutos
- **Global**: 100 requisições por IP em 15 minutos
- **Payload**: Limite de 10KB (proteção contra DoS)

### 4. **Helmet para Headers de Segurança**
- Content Security Policy
- Protection contra Clickjacking (X-Frame-Options)
- MIME Sniffing Prevention
- Strict-Transport-Security (HTTPS)
- Remoção de X-Powered-By

### 5. **CORS Configurado**
- Apenas **frontend autorizado** pode acessar
- Credenciais permitidas apenas com origem confiável
- Socket.IO também protegido com validação de origem

### 6. **Validação de Entrada**
- Email validado com regex
- Senhas com mínimo 8 caracteres
- Sanitização XSS com biblioteca `xss`

### 7. **Socket.IO Seguro**
- Apenas frontend autorizado pode conectar
- Middleware de autenticação obrigatório
- Token JWT requerido no handshake

---

## 🔑 Configuração Obrigatória

### 1. Gerar JWT_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Adicionar ao `.env`
```
JWT_SECRET=<chave-gerada-acima>
FRONTEND_URL=http://localhost:5173
```

### 3. Em Produção
```
NODE_ENV=production
JWT_SECRET=<chave-muito-forte>
FRONTEND_URL=https://seu-dominio.com
```

---

## 📋 Checklist de Segurança em Produção

- [ ] **JWT_SECRET** definido com chave forte (64+ caracteres)
- [ ] **NODE_ENV=production** em variáveis de ambiente
- [ ] **FRONTEND_URL** apontando para seu domínio HTTPS
- [ ] **HTTPS/TLS** habilitado no servidor
- [ ] **Banco de dados** com senha forte
- [ ] **Senhas** hasheadas (bcryptjs ✅)
- [ ] **Rate limiting** ativo (✅)
- [ ] **CORS** restritivo (✅)
- [ ] **Helmet** ativo (✅)
- [ ] Monitoramento de erros
- [ ] Logs centralizados
- [ ] Backup automático do banco

---

## 🛡️ Próximos Passos Recomendados

### 1. **HTTPS/TLS em Produção**
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('caminho/key.pem'),
  cert: fs.readFileSync('caminho/cert.pem')
};

https.createServer(options, app).listen(443);
```

### 2. **CSRF Token (formulários)**
```bash
npm install csurf
```

### 3. **2FA (Autenticação em Duas Etapas)**
```bash
npm install speakeasy qrcode
```

### 4. **Monitoramento**
- Implementar logs centralizados
- Alertas para atividades suspeitas
- Sentry, DataDog ou similar

---

## ⚠️ Erros Comuns a Evitar

❌ **NÃO fazer:**
```javascript
// Armazenar senhas em texto plano
const user = { email, senha };

// JWT sem expiração
jwt.sign({ id }, secret);

// CORS aberto
cors({ origin: "*" });

// JWT_SECRET em código
const secret = "minha-chave";
```

✅ **FAZER:**
```javascript
// Hash de senha
const hash = await bcrypt.hash(senha, 12);

// JWT com expiração
jwt.sign({ id }, secret, { expiresIn: "24h" });

// CORS restritivo
cors({ origin: process.env.FRONTEND_URL });

// JWT_SECRET de variáveis
const secret = process.env.JWT_SECRET;
```

---

## 🔧 Testes de Segurança

```bash
# Verificar vulnerabilidades
npm audit

# Instalar ferramentas de scan
npm install -D snyk
snyk test
```

---

## 📚 Referências

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Status:** ✅ Implementado  
**Versão:** 1.0  
**Data:** Abril 2026
