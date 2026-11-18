import { router, useLocalSearchParams } from 'expo-router';
import { LoginForm } from '../../components/account/LoginForm';

export default function Login() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  return (
    <LoginForm
      onDone={() => {
        if (next && next.startsWith('/')) router.replace(next as never);
        else if (router.canGoBack()) router.back();
        else router.replace('/rent');
      }}
    />
  );
}
