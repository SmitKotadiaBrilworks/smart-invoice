import { toast } from "react-toastify";

// Toast utility that matches Ant Design message API
export const message = {
  success: (content: string, duration?: number) => {
    toast.success(content, {
      position: "bottom-right",
      autoClose: duration ? duration * 1000 : 3000,
    });
  },
  error: (content: string, duration?: number) => {
    toast.error(content, {
      position: "bottom-right",
      autoClose: duration ? duration * 1000 : 3000,
    });
  },
  warning: (content: string, duration?: number) => {
    toast.warning(content, {
      position: "bottom-right",
      autoClose: duration ? duration * 1000 : 3000,
    });
  },
  info: (content: string, duration?: number) => {
    toast.info(content, {
      position: "bottom-right",
      autoClose: duration ? duration * 1000 : 3000,
    });
  },
};
