require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID;
const PAYOS_API_KEY = process.env.PAYOS_API_KEY;
const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY;

const BASE_URL =
  process.env.PAYOS_ENV === 'production'
    ? 'https://api.payos.vn'
    : 'https://api-sandbox.payos.vn';

exports.createPaymentLink = async (order) => {
  try {
    console.log('📦 [PayOS] Nhận yêu cầu tạo link thanh toán:', order);

    const body = {
      orderCode: Number(order.orderCode),
      amount: order.amount,
      description: order.description,
      returnUrl: order.returnUrl,
      cancelUrl: order.cancelUrl,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      items: order.items,
    };

    const signaturePayload = `${body.orderCode}|${body.amount}|${body.description}|${body.returnUrl}|${body.cancelUrl}`;
    const signature = crypto
      .createHmac('sha256', PAYOS_CHECKSUM_KEY)
      .update(signaturePayload)
      .digest('hex');

    body.signature = signature;

    console.log('🧾 [PayOS] Payload gửi lên:', JSON.stringify(body, null, 2));

    const response = await axios.post(`${BASE_URL}/v2/payment-requests`, body, {
      headers: {
        'x-client-id': PAYOS_CLIENT_ID,
        'x-api-key': PAYOS_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log('✅ [PayOS] Link thanh toán tạo thành công:', response.data);

    return response.data.data;
  } catch (error) {
    console.error('❌ [PayOS] Lỗi khi tạo link thanh toán:', {
      message: error.message,
      data: error.response?.data,
      status: error.response?.status,
    });

    throw new Error(
      error.response?.data?.description || 'Lỗi khi tạo link thanh toán PayOS'
    );
  }
};

exports.verifyWebhookSignature = (req) => {
  try {
    const webhookSignature = req.headers['x-payos-signature'];
    const data = req.body?.data;

    if (!data) {
      console.warn('⚠️ [Webhook] Không có data trong body');
      return null;
    }

    const sortedData = Object.keys(data)
      .sort()
      .reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {});

    const queryStr = Object.keys(sortedData)
      .map((key) => `${key}=${sortedData[key] ?? ''}`)
      .join('&');

    const generatedSignature = crypto
      .createHmac('sha256', PAYOS_CHECKSUM_KEY)
      .update(queryStr)
      .digest('hex');

    if (generatedSignature !== webhookSignature) {
      console.warn('⚠️ [Webhook] Chữ ký không khớp!');
      console.log('🧾 [Webhook] Signature nhận:', webhookSignature);
      console.log('🧾 [Webhook] Signature tạo:', generatedSignature);
      console.log('🧾 [Webhook] Dữ liệu:', sortedData);
      return null;
    }

    console.log('✅ [Webhook] Xác minh chữ ký thành công');
    return data;
  } catch (error) {
    console.error('❌ [Webhook] Lỗi xác thực chữ ký:', error);
    return null;
  }
};
