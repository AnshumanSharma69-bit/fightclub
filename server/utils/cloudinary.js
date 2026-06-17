const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload a base64 image to Cloudinary
// Returns the secure URL of the uploaded image
async function uploadFightProof(base64Image, challengeId) {
  const result = await cloudinary.uploader.upload(base64Image, {
    folder:         'fightclub/proofs',
    public_id:      `proof_${challengeId}_${Date.now()}`,
    resource_type:  'image',
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' }, // cap size
      { quality: 'auto:good' },                      // compress smartly
    ],
  });
  return result.secure_url;
}

module.exports = { uploadFightProof };
