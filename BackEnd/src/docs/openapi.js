module.exports = function buildOpenApiSpec(req) {
  const protocol = req?.headers?.["x-forwarded-proto"] || req?.protocol || "http";
  const host = req?.headers?.host || `localhost:${process.env.PORT || 3000}`;
  const serverUrl = `${protocol}://${host}/api/v1`;

  return {
    openapi: "3.0.3",
    info: {
      title: "Delivery API",
      version: "1.0.0",
      description: "Documentacao da API do sistema Delivery.",
    },
    servers: [{ url: serverUrl }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    paths: {
      "/users/login": {
        post: {
          summary: "Login",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", format: "email" },
                    senha: { type: "string" },
                  },
                  required: ["email", "senha"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Login realizado" },
          },
        },
      },
      "/users/refresh": {
        post: {
          summary: "Renova access token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    refreshToken: { type: "string" },
                  },
                  required: ["refreshToken"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Token renovado" },
            "401": { description: "Refresh token invalido" },
          },
        },
      },
      "/users/logout": {
        post: {
          summary: "Logout e revogacao de refresh token",
          security: [{ bearerAuth: [] }],
          responses: {
            "204": { description: "Logout concluido" },
          },
        },
      },
      "/cards": {
        get: {
          summary: "Lista cards",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Lista de cards" } },
        },
        post: {
          summary: "Cria card",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Card criado" } },
        },
      },
      "/cards/{id}": {
        put: {
          summary: "Atualiza card",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Card atualizado" } },
        },
        delete: {
          summary: "Remove card",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Card removido" } },
        },
      },
      "/schedules": {
        get: {
          summary: "Lista agendamentos",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Lista de agendamentos" } },
        },
        post: {
          summary: "Cria agendamento",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Agendamento criado" } },
        },
      },
      "/notifications": {
        get: {
          summary: "Lista notificacoes",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Lista de notificacoes" } },
        },
      },
      "/notifications/sync": {
        post: {
          summary: "Sincroniza notificacoes do usuario",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Notificacoes sincronizadas" } },
        },
      },
      "/agenda-eventos": {
        get: {
          summary: "Lista eventos da Agenda de Delivery",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "escopo",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["individual", "geral"] },
            },
            {
              name: "inicio",
              in: "query",
              required: false,
              schema: { type: "string", format: "date-time" },
            },
            {
              name: "fim",
              in: "query",
              required: false,
              schema: { type: "string", format: "date-time" },
            },
            {
              name: "usuario_id",
              in: "query",
              required: false,
              description:
                "Apenas admin: lista eventos individuais de outro usuário.",
              schema: { type: "integer" },
            },
          ],
          responses: { "200": { description: "Lista de eventos" } },
        },
        post: {
          summary: "Cria evento na Agenda de Delivery",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["titulo", "inicio", "escopo"],
                  properties: {
                    titulo: { type: "string" },
                    descricao_html: { type: "string" },
                    inicio: { type: "string", format: "date-time" },
                    fim: { type: "string", format: "date-time", nullable: true },
                    all_day: { type: "boolean" },
                    escopo: { type: "string", enum: ["individual", "geral"] },
                    tipo: {
                      type: "string",
                      enum: ["tarefa", "aviso", "programacao"],
                    },
                    cor: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Evento criado" },
            "400": { description: "Payload inválido" },
            "403": { description: "Sem permissão" },
          },
        },
      },
      "/agenda-eventos/{id}": {
        put: {
          summary: "Atualiza evento da Agenda de Delivery",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "integer" } },
          ],
          responses: {
            "200": { description: "Evento atualizado" },
            "403": { description: "Sem permissão" },
            "404": { description: "Evento não encontrado" },
          },
        },
        delete: {
          summary: "Remove evento da Agenda de Delivery",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "integer" } },
          ],
          responses: {
            "200": { description: "Evento removido" },
            "403": { description: "Sem permissão" },
            "404": { description: "Evento não encontrado" },
          },
        },
      },
    },
  };
};
