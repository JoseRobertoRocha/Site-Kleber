import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';

// Emite uma URL PUT pre-assinada para o bucket R2. So responde se o pedido
// trouxer um access token valido de uma sessao Supabase autenticada — sem
// isso, qualquer visitante do site conseguiria subir arquivos no bucket.
export default async function handler(req, res) {
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
  if (!/^image\//.test(contentType)) {
    res.status(400).json({ error: 'Apenas imagens são permitidas' });
    return;
  }

  const safeExt = (fileName.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const key = `projects/${crypto.randomUUID()}.${safeExt}`;

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
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

  try {
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    const publicUrl = `${process.env.R2_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
    res.status(200).json({ uploadUrl, publicUrl });
  } catch (err) {
    console.error('Erro ao gerar URL do R2:', err);
    res.status(500).json({ error: 'Falha ao gerar URL de upload' });
  }
}
