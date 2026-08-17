const { randomUUID } = require('node:crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createClient } = require('@supabase/supabase-js');

// Emite uma URL PUT pre-assinada para o bucket R2. So responde se o pedido
// trouxer um access token valido de uma sessao Supabase autenticada — sem
// isso, qualquer visitante do site conseguiria subir arquivos no bucket.
module.exports = async function handler(req, res) {
  let step = 'start';
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      res.status(401).json({ error: 'Token de autenticação ausente' });
      return;
    }

    const missingEnv = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_BASE_URL']
      .filter(name => !process.env[name]);
    if (missingEnv.length) {
      res.status(500).json({ error: `Variáveis de ambiente ausentes: ${missingEnv.join(', ')}` });
      return;
    }

    step = 'supabase auth.getUser';
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      res.status(401).json({ error: 'Sessão inválida' });
      return;
    }

    const { fileName, contentType } = req.body || {};
    if (!fileName || !contentType) {
      res.status(400).json({ error: 'fileName e contentType são obrigatórios' });
      return;
    }
    if (!contentType.startsWith('image/')) {
      res.status(400).json({ error: 'Apenas imagens são permitidas' });
      return;
    }

    const safeExt = (fileName.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const key = `projects/${randomUUID()}.${safeExt}`;

    step = 'build S3 client';
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

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
    res.status(500).json({ error: `[${step}] ${err && err.message ? err.message : String(err)}` });
  }
};
