export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const apiKey = process.env.GALIO_API_KEY;
  const clientId = process.env.GALIO_CLIENT_ID;

  if (!apiKey || !clientId) {
    throw createError({
      statusCode: 500,
      statusMessage: "Faltan GALIO_API_KEY o GALIO_CLIENT_ID en .env",
    });
  }

  const res = await $fetch("https://pay.galio.app/api/payment-links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "x-client-id": clientId,
    },
    body,
  });

  return res;
});
