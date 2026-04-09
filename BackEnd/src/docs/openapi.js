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
    },
  };
};
