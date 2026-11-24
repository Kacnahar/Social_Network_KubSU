import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState, type ReactNode } from 'react';
import { ApiError, uploadMedia } from '../../lib/api';
import { checkPhoto, readPhoto } from '../../lib/photo';
import { useSession, useSignedIn } from '../../lib/session';
import { AvatarCropper } from './AvatarCropper';

// Общий код выбора фото профиля: выбор (галерея или камера) → наш экран обрезки → загрузка.
// Им пользуются и «Профиль» (там результат сохраняется сразу), и «Редактировать профиль», и первое заполнение профиля.
// mediaId: undefined — фото не трогали; null — убрать; строка — загруженное фото

type Options = {
  // Вызывается после загрузки нового фото (mediaId) или после «Удалить фото» (null)
  onChanged?: (mediaId: string | null) => void | Promise<void>;
};

export type AvatarPhoto = {
  mediaId: string | null | undefined;
  localUri: string | null;
  uploading: boolean;
  error: string | null;
  setError: (message: string | null) => void;
  pick: (source?: 'library' | 'camera') => Promise<void>;
  remove: () => void;
  // Экран обрезки: вставьте в разметку экрана
  cropper: ReactNode;
};

export function useAvatarPhoto({ onChanged }: Options = {}): AvatarPhoto {
  const { token } = useSignedIn();
  const { forgetSession } = useSession();
  const [mediaId, setMediaId] = useState<string | null | undefined>(undefined);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [cropUri, setCropUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Системную обрезку выключаем (allowsEditing: false): вместо неё открывается наш экран
  const pick = useCallback(async (source: 'library' | 'camera' = 'library') => {
    setError(null);
    try {
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 1 };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      const uri = result.canceled ? undefined : result.assets[0]?.uri;
      if (uri) setCropUri(uri);
    } catch {
      setError(source === 'camera' ? 'Не получилось открыть камеру' : 'Не получилось открыть галерею');
    }
  }, []);

  const uploadCropped = async (uri: string) => {
    setCropUri(null);
    setError(null);
    setUploading(true);
    try {
      const blob = await readPhoto(uri);
      const problem = checkPhoto(blob);
      if (problem) return setError(problem);
      const uploaded = await uploadMedia(token, 'avatar', blob);
      setMediaId(uploaded.mediaId);
      setLocalUri(uri);
      await onChanged?.(uploaded.mediaId);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'unauthorized') return void (await forgetSession());
      setError(caught instanceof ApiError ? caught.message : 'Не получилось загрузить фото. Попробуйте ещё раз');
    } finally {
      setUploading(false);
    }
  };

  const remove = () => {
    setMediaId(null);
    setLocalUri(null);
    setError(null);
    Promise.resolve(onChanged?.(null)).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Не получилось убрать фото'));
  };

  const cropper = cropUri ? <AvatarCropper uri={cropUri} onCancel={() => setCropUri(null)} onDone={(uri) => void uploadCropped(uri)} /> : null;
  return { mediaId, localUri, uploading, error, setError, pick, remove, cropper };
}
