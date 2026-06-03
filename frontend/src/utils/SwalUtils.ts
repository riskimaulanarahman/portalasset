import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export const showSuccess = (title: string, text?: string) => {
  return MySwal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonColor: '#0d9488', // teal-600
  });
};

export const showError = (title: string, text?: string) => {
  return MySwal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonColor: '#0d9488',
  });
};

export const showConfirm = (title: string, text?: string, confirmButtonText = 'Yes, delete it!') => {
  return MySwal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#0d9488',
    cancelButtonColor: '#6b7280',
    confirmButtonText,
  });
};

export default MySwal;
