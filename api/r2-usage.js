const { requireUser } = require('./_auth');
const { buildS3Client, getBucketUsageBytes, STORAGE_LIMIT_BYTES } = require('./_r2-client');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const auth = await requireUser(req);
    if (auth.error) {
      res.status(auth.status).json({ error: auth.error });
      return;
    }

    const missingEnv = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME']
      .filter(name => !process.env[name]);
    if (missingEnv.length) {
      res.status(500).json({ error: `Variáveis de ambiente ausentes: ${missingEnv.join(', ')}` });
      return;
    }

    const s3 = buildS3Client();
    const usedBytes = await getBucketUsageBytes(s3);
    res.status(200).json({ usedBytes, limitBytes: STORAGE_LIMIT_BYTES });
  } catch (err) {
    console.error('Erro ao calcular uso de armazenamento do R2:', err);
    res.status(500).json({ error: err?.message || 'Falha ao calcular uso de armazenamento' });
  }
};
