const { randomUUID } = require('node:crypto');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { requireUser } = require('./_auth');
const { buildS3Client, getBucketUsageBytes, STORAGE_LIMIT_BYTES } = require('./_r2-client');

// Emite uma URL PUT pre-assinada para o bucket R2. So responde se o pedido
// trouxer um access token valido de uma sessao Supabase autenticada, e so
// se o upload nao estourar o limite de armazenamento — as duas checagens
// sao feitas aqui (servidor), nunca so no front.
module.exports = async function handler(req, res) {
  let step = 'start';
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    step = 'auth';
    const auth = await requireUser(req);
    if (auth.error) {
      res.status(auth.status).json({ error: auth.error });
      return;
    }

    const missingEnv = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_BASE_URL']
      .filter(name => !process.env[name]);
    if (missingEnv.length) {
      res.status(500).json({ error: `Variáveis de ambiente ausentes: ${missingEnv.join(', ')}` });
      return;
    }

    const { fileName, contentType, fileSize } = req.body || {};
    if (!fileName || !contentType) {
      res.status(400).json({ error: 'fileName e contentType são obrigatórios' });
      return;
    }
    if (!contentType.startsWith('image/')) {
      res.status(400).json({ error: 'Apenas imagens são permitidas' });
      return;
    }

    const size = Number(fileSize) || 0;

    step = 'check storage limit';
    const s3 = buildS3Client();
    const usedBytes = await getBucketUsageBytes(s3);
    if (usedBytes + size > STORAGE_LIMIT_BYTES) {
      const usedGb = (usedBytes / (1024 ** 3)).toFixed(2);
      res.status(413).json({ error: `Limite de armazenamento de 10 GB atingido (${usedGb} GB em uso). Apague imagens antigas para liberar espaço.` });
      return;
    }

    const safeExt = (fileName.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const key = `projects/${randomUUID()}.${safeExt}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    step = 'sign url';
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    const publicUrl = `${process.env.R2_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
    res.status(200).json({ uploadUrl, publicUrl });
  } catch (err) {
    console.error(`Erro ao gerar URL do R2 (etapa: ${step}):`, err);
    res.status(500).json({ error: `[${step}] ${err?.message || String(err)}` });
  }
};
