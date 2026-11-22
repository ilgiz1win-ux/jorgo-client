import { router, useLocalSearchParams } from 'expo-router';
import { LoginForm } from '../../components/account/LoginForm';

export default function Login() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  return (
    <LoginForm
      onDone={() => {
        // Мурунку баракка (мисалы толтурулган заказга) кайтабыз — маалымат жоголбойт
        if (router.canGoBack()) router.back();
        else if (next && next.startsWith('/')) router.replace(next as never);
        else router.replace('/rent');
      }}
    />
  );
}
