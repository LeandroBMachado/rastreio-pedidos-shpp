exports.handler = async function (event) {
  try {
    const codigo = event.queryStringParameters?.codigo;

    if (!codigo) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          sucesso: false,
          mensagem: "Informe o código de rastreio."
        })
      };
    }

    const codigoLimpo = codigo
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

    const url =
      `https://spx.com.br/shipment/order/open/order/get_order_info` +
      `?spx_tn=${encodeURIComponent(codigoLimpo)}` +
      `&language_code=pt`;

    const resposta = await fetch(url);

    if (!resposta.ok) {
      throw new Error(`SPX retornou HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();

    if (dados.retcode !== 0 || !dados.data?.sls_tracking_info) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          sucesso: false,
          mensagem: "Rastreamento não encontrado."
        })
      };
    }

    const rastreio = dados.data.sls_tracking_info;

    const registros = rastreio.records || [];

    const ultimo = registros[0] || {};

    return {
      statusCode: 200,

      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store"
      },

      body: JSON.stringify({
        sucesso: true,

        codigo: rastreio.sls_tn,

        pedido: rastreio.client_order_id || "",

        transportadora: "SPX Express",

        status: ultimo.milestone_name || "",

        mensagem:
          ultimo.buyer_description ||
          ultimo.description ||
          "Pedido em processamento.",

        codigoEvento: ultimo.tracking_code || "",

        historico: registros.map(item => ({
          codigo: item.tracking_code || "",
          status: item.tracking_name || "",
          descricao:
            item.buyer_description ||
            item.description ||
            "",
          data: item.actual_time
            ? new Date(item.actual_time * 1000).toISOString()
            : null
        }))
      })
    };

  } catch (erro) {

    return {
      statusCode: 500,

      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },

      body: JSON.stringify({
        sucesso: false,
        mensagem: "Erro ao consultar o rastreamento.",
        erro: erro.message
      })
    };
  }
};
