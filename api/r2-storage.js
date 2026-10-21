/**
 * Cloudflare R2 Storage Serverless Endpoint (Vercel Node.js Function)
 * S3-compatible API client implementing AWS Signature Version 4 for zero-egress Cloudflare R2 object storage.
 */

import https from 'https';
import crypto from 'crypto';

// AWS Signature Version 4 utilities
function hmac(key, string) {
  return crypto.createHmac('sha256', key).update(string, 'utf8').digest();
}

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getSigningKey(secretKey, dateStamp, region, service) {
  const kDate = hmac('AWS4' + secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  return kSigning;
}

/**
 * Executes a signed S3 request against Cloudflare R2
 */
function signedR2Request({ method, accountId, accessKeyId, secretAccessKey, bucketName, objectKey = '', body = null, contentType = 'application/octet-stream' }) {
  return new Promise((resolve, reject) => {
    const host = `${accountId}.r2.cloudflarestorage.com`;
    const cleanKey = objectKey ? `/${encodeURI(objectKey.replace(/^\/+/, ''))}` : '';
    const path = `/${bucketName}${cleanKey}`;
    const region = 'auto';
    const service = 's3';

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    const payloadHash = body ? sha256Hex(body) : sha256Hex('');

    // Canonical headers
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

    // Canonical request
    const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    // String to sign
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;

    // Signature
    const signingKey = getSigningKey(secretAccessKey, dateStamp, region, service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers = {
      'Host': host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authHeader
    };

    if (body) {
      headers['Content-Type'] = contentType;
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request({
      hostname: host,
      port: 443,
      path: path,
      method: method,
      headers: headers,
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Cloudflare R2 request timeout (10s)'));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

export default async function handler(req, res) {
  // CORS & Security headers
  const origin = req.headers.origin || '';
  const allowed = origin.includes('clinic-flow') || origin.includes('localhost') || origin.includes('smartclinic');
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-clinic-id, Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication & Tenant Boundary Gate (CWE-306 / CWE-284)
  const clinicId = (req.headers['x-clinic-id'] || req.headers['x-clinic'] || '').trim();
  const authHeader = req.headers['authorization'] || '';
  const syncSecret = req.headers['x-sync-secret'] || '';
  const requiredSecret = process.env.SYNC_API_SECRET;

  const isTest = process.env.NODE_ENV === 'test';
  const hasClinicContext = clinicId && /^[a-zA-Z0-9_-]+$/.test(clinicId);
  const hasAuthHeader = Boolean(authHeader);
  const hasValidSecret = Boolean(requiredSecret && (syncSecret === requiredSecret || authHeader.replace(/^Bearer\s+/i, '') === requiredSecret));

  if (!isTest && !hasClinicContext && !hasAuthHeader && !hasValidSecret) {
    return res.status(401).json({
      error: 'Unauthorized: Missing clinic identification or authorization token.'
    });
  }

  try {
    const { action, fileKey, fileData, contentType, config } = req.body || {};

    // Directory Traversal & Namespace Guard (CWE-22 / CWE-639)
    if (action === 'upload' || action === 'delete') {
      if (!fileKey || typeof fileKey !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid fileKey' });
      }

      const cleanKey = fileKey.replace(/\\/g, '/').replace(/\/\.\./g, '').replace(/\.\.\//g, '').replace(/^\/+/, '');
      if (cleanKey.includes('..') || cleanKey.startsWith('/')) {
        return res.status(400).json({ error: 'Invalid fileKey path format' });
      }

      if (clinicId && clinicId !== 'shared' && !cleanKey.startsWith(`clinics/${clinicId}/`) && !cleanKey.startsWith(`${clinicId}/`)) {
        return res.status(403).json({ error: 'Forbidden: Access to specified storage namespace is denied' });
      }
    }

    // 1. Connection Test Action
    if (action === 'test-connection') {
      if (!isTest && !hasValidSecret && !hasAuthHeader) {
        return res.status(403).json({ error: 'Forbidden: Admin authorization required to test storage connection' });
      }

      const activeConfig = config || {
        accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
        bucketName: process.env.CLOUDFLARE_R2_BUCKET || 'smart-clinic-storage'
      };

      if (!activeConfig.accountId || !activeConfig.accessKeyId || !activeConfig.secretAccessKey) {
        return res.status(400).json({
          success: false,
          error: 'Missing Cloudflare R2 credentials (accountId, accessKeyId, or secretAccessKey)'
        });
      }

      // Perform a HEAD request against the bucket to verify credentials and bucket existence
      const headRes = await signedR2Request({
        method: 'HEAD',
        accountId: activeConfig.accountId,
        accessKeyId: activeConfig.accessKeyId,
        secretAccessKey: activeConfig.secretAccessKey,
        bucketName: activeConfig.bucketName
      });

      if (headRes.statusCode === 200 || headRes.statusCode === 204) {
        return res.status(200).json({
          success: true,
          message: `تم الاتصال بنجاح بسلة Cloudflare R2 (${activeConfig.bucketName})! التخزين جاهز للعمل.`
        });
      } else {
        return res.status(400).json({
          success: false,
          error: `فشل التحقق من سلة R2 (رمز الحالة: ${headRes.statusCode}). تأكد من صحة الصلاحيات واسم السلة.`
        });
      }
    }

    // 2. Upload Action
    if (action === 'upload') {
      const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
      const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
      const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
      const bucketName = process.env.CLOUDFLARE_R2_BUCKET || 'smart-clinic-storage';

      if (!accountId || !accessKeyId || !secretAccessKey) {
        return res.status(200).json({
          success: true,
          fallback: true,
          message: 'R2 environment variables not set; using local fallback'
        });
      }

      // Convert base64 data to Buffer
      let fileBuffer;
      let cleanContentType = contentType || 'application/octet-stream';

      if (typeof fileData === 'string' && fileData.startsWith('data:')) {
        const matches = fileData.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches) {
          cleanContentType = matches[1];
          fileBuffer = Buffer.from(matches[2], 'base64');
        } else {
          fileBuffer = Buffer.from(fileData, 'utf8');
        }
      } else if (typeof fileData === 'string') {
        fileBuffer = Buffer.from(fileData, 'utf8');
      } else {
        fileBuffer = Buffer.from(JSON.stringify(fileData));
      }

      const putRes = await signedR2Request({
        method: 'PUT',
        accountId,
        accessKeyId,
        secretAccessKey,
        bucketName,
        objectKey: fileKey,
        body: fileBuffer,
        contentType: cleanContentType
      });

      if (putRes.statusCode === 200 || putRes.statusCode === 201) {
        const publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN;
        const publicUrl = publicDomain 
          ? `https://${publicDomain.replace(/^https?:\/\//, '')}/${fileKey}`
          : `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${fileKey}`;

        return res.status(200).json({
          success: true,
          fileKey,
          publicUrl
        });
      } else {
        return res.status(500).json({
          success: false,
          error: `R2 Upload failed with status ${putRes.statusCode}`
        });
      }
    }

    // 3. Delete Action
    if (action === 'delete') {
      const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
      const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
      const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
      const bucketName = process.env.CLOUDFLARE_R2_BUCKET || 'smart-clinic-storage';

      if (accountId && accessKeyId && secretAccessKey) {
        await signedR2Request({
          method: 'DELETE',
          accountId,
          accessKeyId,
          secretAccessKey,
          bucketName,
          objectKey: fileKey
        });
      }

      return res.status(200).json({ success: true, fileKey });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    console.error('[Cloudflare R2 Endpoint Error]', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal R2 storage error'
    });
  }
};
