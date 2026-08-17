const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const STORAGE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB — plano gratuito do R2

function buildS3Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

// Soma real dos objetos no bucket (nao e uma estimativa/contador que pode
// desalinhar — reflete exatamente o que o R2 tem armazenado agora).
async function getBucketUsageBytes(s3) {
  let totalBytes = 0;
  let continuationToken;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      ContinuationToken: continuationToken,
    }));
    for (const obj of res.Contents || []) totalBytes += obj.Size || 0;
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return totalBytes;
}

module.exports = { buildS3Client, getBucketUsageBytes, STORAGE_LIMIT_BYTES };
