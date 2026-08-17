// Emite uma URL PUT pre-assinada para o bucket R2. So responde se o pedido
// trouxer um access token valido de uma sessao Supabase autenticada — sem
// isso, qualquer visitante do site conseguiria subir arquivos no bucket.
//
// Os imports pesados (aws-sdk, supabase-js) sao carregados dinamicamente
// DENTRO do try/catch de proposito: se alguma dependencia falhar ao
// carregar no runtime do Vercel, isso vira um JSON de erro legivel em vez
// de um crash opaco (FUNCTION_INVOCATION_FAILED) sem nenhuma pista.
export default async function handler(req, res) {
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

    step = 'import node:crypto';
    const { randomUUID } = await import('node:crypto');

    step = 'import @supabase/supabase-js';
    const { createClient } = await import('@supabase/supabase-js');

    step = 'supabase auth.getUser';
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      res.status(401).json({ error: 'Sessão inválida' });
      return;
    }

    if (req.query && req.query.probe === 'auth') {
      res.status(200).json({ ok: true, probe: 'auth-only', userId: user.id });
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

    step = 'import @aws-sdk/client-s3';
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

    step = 'import @aws-sdk/s3-request-presigner';
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    if (req.query && req.query.probe === 'aws-import') {
      res.status(200).json({ ok: true, probe: 'aws-import-only' });
      return;
    }

    step = 'build S3 client';
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

    step = 'sign url';
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    const publicUrl = `${process.env.R2_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
    res.status(200).json({ uploadUrl, publicUrl });
  } catch (err) {
    console.error(`Erro ao gerar URL do R2 (etapa: ${step}):`, err);
    res.status(500).json({ error: `[${step}] ${err && err.message ? err.message : String(err)}` });
  }
}
