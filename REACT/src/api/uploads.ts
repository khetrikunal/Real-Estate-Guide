import { upload } from './client';
import { estateApi } from './estateApi';

export type MultipartValue = Blob | File | string | number | boolean | null | undefined;
export type MultipartRecord = Record<string, MultipartValue | MultipartValue[]>;

export interface FileUploadInput {
  file: Blob | File;
  fieldName?: string;
  fileName?: string;
  metadata?: MultipartRecord;
}

export function appendFormValue(formData: FormData, key: string, value: MultipartValue) {
  if (value === undefined || value === null) return;
  if (value instanceof Blob) {
    formData.append(key, value);
    return;
  }
  formData.append(key, String(value));
}

export function formDataFromRecord(record: MultipartRecord = {}) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) {
      value.forEach((item) => appendFormValue(formData, key, item));
    } else {
      appendFormValue(formData, key, value);
    }
  }
  return formData;
}

export function fileFormData({ file, fieldName = 'file', fileName, metadata }: FileUploadInput) {
  const formData = formDataFromRecord(metadata);
  if (fileName) {
    formData.append(fieldName, file, fileName);
  } else {
    formData.append(fieldName, file);
  }
  return formData;
}

export function uploadProjectDocument(projectId: string | number, input: FileUploadInput | FormData) {
  const formData = input instanceof FormData ? input : fileFormData(input);
  return estateApi.projects.uploadDocument(projectId, formData);
}

export function uploadProjectCover(projectId: string | number, input: FileUploadInput | FormData) {
  const formData = input instanceof FormData ? input : fileFormData(input);
  return estateApi.projects.uploadCover(projectId, formData);
}

export function uploadDocumentCover(projectId: string | number, input: FileUploadInput | FormData) {
  const formData = input instanceof FormData ? input : fileFormData(input);
  return estateApi.documents.uploadCover(projectId, formData);
}

export function uploadChatFile(input: FileUploadInput | FormData) {
  const formData = input instanceof FormData ? input : fileFormData(input);
  return estateApi.chat.upload(formData);
}

export function uploadKycTemp(token: string, input: FileUploadInput | FormData) {
  const formData = input instanceof FormData ? input : fileFormData(input);
  return upload(`/kyc/uploads/temp/${token}`, formData);
}

export function uploadKycUserDocument(userId: string | number, input: FileUploadInput | FormData) {
  const formData = input instanceof FormData ? input : fileFormData(input);
  return upload(`/kyc/uploads/users/${userId}`, formData);
}

export const multipartApi = {
  projectDocument: uploadProjectDocument,
  projectCover: uploadProjectCover,
  documentCover: uploadDocumentCover,
  chatFile: uploadChatFile,
  kycTemp: uploadKycTemp,
  kycUserDocument: uploadKycUserDocument,
};
