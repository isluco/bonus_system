const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadImage = async (base64Image, folder = 'bonus-system') => {
  try {
    const uploadOptions = {
      resource_type: 'auto'
    };

    // Si hay un upload preset configurado (para unsigned uploads), usarlo
    if (process.env.CLOUDINARY_UPLOAD_PRESET) {
      uploadOptions.upload_preset = process.env.CLOUDINARY_UPLOAD_PRESET;
      // NO incluir folder cuando usamos unsigned preset
      // El folder se configura en el preset de Cloudinary
    } else {
      // Solo usar folder si NO estamos usando preset unsigned
      uploadOptions.folder = folder;
    }

    const result = await cloudinary.uploader.upload(base64Image, uploadOptions);
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Error uploading image: ' + error.message);
  }
};

const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting image:', error);
  }
};

module.exports = { uploadImage, deleteImage };
