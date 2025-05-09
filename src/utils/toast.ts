import { toast, ToastPosition } from 'react-toastify';

type MessageType = 'success' | 'error' | 'info' | 'warning';

export const showMessage = (type: MessageType, message: string) => {
  const options = {
    position: 'top-center' as ToastPosition,
    className: 'bg-background-card text-white',
    progressClassName: 'bg-primary-500',
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  };

  switch (type) {
    case 'success':
      toast.success(message, options);
      break;
    case 'error':
      toast.error(message, options);
      break;
    case 'info':
      toast.info(message, options);
      break;
    case 'warning':
      toast.warning(message, options);
      break;
    default:
      toast(message, options);
  }
};