import { supabase } from './supabase';

export interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

export const uploadFile = async (file: File, bucket: string = 'chat-media'): Promise<UploadResult> => {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log('📤 Uploading file to Supabase Storage:', {
      fileName,
      fileSize: file.size,
      fileType: file.type,
      bucket
    });

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Upload error:', error);
      return { url: '', path: '', error: error.message };
    }

    console.log('✅ File uploaded successfully:', data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    console.log('🔗 Public URL generated:', urlData.publicUrl);

    return {
      url: urlData.publicUrl,
      path: filePath,
      file: file
    };
  } catch (err) {
    console.error('❌ Upload exception:', err);
    return { 
      url: '', 
      path: '', 
      file: file,
      error: err instanceof Error ? err.message : 'Unknown upload error' 
    };
  }
};

export const deleteFile = async (path: string, bucket: string = 'chat-media'): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('❌ Delete error:', error);
      return false;
    }

    console.log('🗑️ File deleted successfully:', path);
    return true;
  } catch (err) {
    console.error('❌ Delete exception:', err);
    return false;
  }
};