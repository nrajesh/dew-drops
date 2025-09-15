import { toast } from "sonner";

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showError = (message: string) => {
  toast.error(message);
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const updateToastLoading = (toastId: string | number, message: string) => {
  toast.loading(message, { id: toastId });
};

export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

export const updateToastSuccess = (toastId: string | number, message: string) => {
  toast.success(message, { id: toastId });
};

export const updateToastError = (toastId: string | number, message: string) => {
  toast.error(message, { id: toastId });
};