const { CreateBucketCommand } = require('@aws-sdk/client-s3');
const AppError = require('../../utils/AppError');
const { r2Client } = require('../../config/r2Client');

class CloudflareR2Dao {
  async createBucket(bucketName) {
    if (!bucketName) {
      throw new AppError('Bucket name is required', 400, 'MISSING_BUCKET_NAME');
    }

    try {
      const command = new CreateBucketCommand({
        Bucket: bucketName
      });

      return await r2Client.send(command);
    } catch (error) {
      throw new AppError(
        error.message || 'Failed to create Cloudflare R2 bucket',
        500,
        'R2_BUCKET_CREATE_FAILED'
      );
    }
  }
}

module.exports = new CloudflareR2Dao();