import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface ShareGeneratedImageOptions {
  dataUrl: string;
  fileName: string;
  title: string;
  text: string;
  dialogTitle?: string;
}

function downloadImage(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

export async function shareGeneratedImage({
  dataUrl,
  fileName,
  title,
  text,
  dialogTitle = 'Compartir imagen',
}: ShareGeneratedImageOptions): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const saved = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true,
    });

    await Share.share({
      title,
      text,
      url: saved.uri,
      dialogTitle,
    });
    return;
  }

  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], fileName, { type: 'image/png' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return;
    } catch (shareErr: any) {
      if (shareErr.name !== 'AbortError') {
        throw shareErr;
      }
      downloadImage(dataUrl, fileName);
      return;
    }
  }

  downloadImage(dataUrl, fileName);
}
